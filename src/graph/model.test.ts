import { describe, expect, it } from "vitest";
import { Node, Relationship, int } from "neo4j-driver";
import {
  extractGraph,
  postProcessGraph,
  removeNodeFromGraph,
  removeNodesFromGraph,
  summariseLabels,
  summariseRelationships,
} from "./model";
import { buildLabelColorMap } from "./colors";
import { formatValue } from "./values";
import { resolveCaption } from "./captions";

function node(id: string, labels: string[], properties: object = {}) {
  return new Node(int(Number(id)), labels, properties, id);
}

function rel(id: string, type: string, from: string, to: string, props = {}) {
  return new Relationship(
    int(Number(id)),
    int(Number(from)),
    int(Number(to)),
    type,
    props,
    id,
    from,
    to,
  );
}

describe("extractGraph", () => {
  it("pulls nodes and relationships out of nested result shapes", () => {
    const records = [
      { n: node("1", ["Person"], { name: "Ada" }) },
      { nested: { deep: [node("2", ["Movie"], { title: "Hackers" })] } },
      { r: rel("10", "ACTED_IN", "1", "2") },
    ];

    const graph = extractGraph(records);

    expect(graph.nodes.map((n) => n.elementId).sort()).toEqual(["1", "2"]);
    expect(graph.links).toHaveLength(1);
    expect(graph.links[0].type).toBe("ACTED_IN");
  });

  it("deduplicates entities returned by more than one record", () => {
    const shared = node("1", ["Person"]);
    const graph = extractGraph([{ a: shared }, { b: shared }]);
    expect(graph.nodes).toHaveLength(1);
  });

  it("does not mistake a plain map with a 'type' key for a relationship", () => {
    // The previous detection sniffed for a `type` property, so an ordinary
    // map with that key was silently swallowed as a relationship.
    const graph = extractGraph([
      { row: { type: "not-a-relationship", value: 1 } },
    ]);
    expect(graph.nodes).toHaveLength(0);
    expect(graph.links).toHaveLength(0);
  });

  it("survives a cyclic plain object", () => {
    const cyclic: Record<string, unknown> = { name: "loop" };
    cyclic.self = cyclic;
    expect(() => extractGraph([cyclic])).not.toThrow();
  });
});

describe("postProcessGraph", () => {
  it("cross-links nodes and computes degree", () => {
    const graph = postProcessGraph(
      extractGraph([
        node("1", ["Person"]),
        node("2", ["Movie"]),
        rel("10", "ACTED_IN", "1", "2"),
      ]),
      "degree",
    );

    const [person, movie] = graph.nodes;
    expect(person.degree).toBe(1);
    expect(movie.degree).toBe(1);
    expect(person.neighbors[0]).toBe(movie);
    expect(person.val).toBe(2);
  });

  it("drops relationships whose endpoints are absent", () => {
    const graph = postProcessGraph(
      extractGraph([node("1", ["Person"]), rel("10", "KNOWS", "1", "999")]),
    );
    expect(graph.links).toHaveLength(0);
  });

  it("gives a lone self-loop visible curvature", () => {
    const graph = postProcessGraph(
      extractGraph([node("1", ["Person"]), rel("10", "KNOWS", "1", "1")]),
    );
    expect(graph.links[0].curvature).toBeGreaterThan(0);
  });

  it("bends parallel relationships apart", () => {
    const graph = postProcessGraph(
      extractGraph([
        node("1", ["A"]),
        node("2", ["B"]),
        rel("10", "R", "1", "2"),
        rel("11", "R", "1", "2"),
      ]),
    );
    expect(graph.links.every((link) => link.curvature > 0)).toBe(true);
    expect(graph.links[0].rotation).not.toBe(graph.links[1].rotation);
  });

  it("preserves node object identity so layout positions survive", () => {
    const first = postProcessGraph(extractGraph([node("1", ["Person"])]));
    first.nodes[0].x = 42;
    const second = postProcessGraph(first, "uniform");
    expect(second.nodes[0].x).toBe(42);
  });
});

describe("removeNodeFromGraph", () => {
  it("removes the node and its relationships", () => {
    const graph = postProcessGraph(
      extractGraph([
        node("1", ["A"]),
        node("2", ["B"]),
        rel("10", "R", "1", "2"),
      ]),
    );
    const pruned = removeNodeFromGraph(graph, "1", "uniform");
    expect(pruned.nodes.map((n) => n.elementId)).toEqual(["2"]);
    expect(pruned.links).toHaveLength(0);
  });
});

describe("removeNodesFromGraph", () => {
  it("removes every listed node along with their relationships", () => {
    const graph = postProcessGraph(
      extractGraph([
        node("1", ["A"]),
        node("2", ["B"]),
        node("3", ["B"]),
        rel("10", "R", "1", "2"),
        rel("11", "R", "1", "3"),
        rel("12", "R", "2", "3"),
      ]),
    );
    const pruned = removeNodesFromGraph(graph, ["2", "3"], "uniform");
    expect(pruned.nodes.map((n) => n.elementId)).toEqual(["1"]);
    expect(pruned.links).toHaveLength(0);
  });

  it("returns the graph unchanged for an empty list", () => {
    const graph = postProcessGraph(
      extractGraph([node("1", ["A"]), node("2", ["B"])]),
    );
    const pruned = removeNodesFromGraph(graph, [], "uniform");
    expect(pruned.nodes.map((n) => n.elementId)).toEqual(["1", "2"]);
  });
});

describe("buildLabelColorMap", () => {
  it("is deterministic across calls", () => {
    const a = buildLabelColorMap(["Person", "Movie", "Studio"]);
    const b = buildLabelColorMap(["Studio", "Person", "Movie"]);
    expect(a.get("Person")).toBe(b.get("Person"));
    expect(a.get("Movie")).toBe(b.get("Movie"));
  });

  it("never assigns one colour to two labels", () => {
    const labels = ["A", "B", "C", "D", "E", "F"];
    const colors = [...buildLabelColorMap(labels).values()];
    expect(new Set(colors).size).toBe(labels.length);
  });
});

describe("summaries", () => {
  it("counts labels and relationship types", () => {
    const graph = postProcessGraph(
      extractGraph([
        node("1", ["Person"]),
        node("2", ["Person"]),
        node("3", ["Movie"]),
        rel("10", "ACTED_IN", "1", "3"),
      ]),
    );
    expect(summariseLabels(graph).map((l) => [l.key, l.count])).toEqual([
      ["Movie", 1],
      ["Person", 2],
    ]);
    expect(summariseRelationships(graph)).toEqual([
      { type: "ACTED_IN", count: 1 },
    ]);
  });
});

describe("formatValue", () => {
  it("renders null without throwing", () => {
    // A null property used to crash the whole inspector.
    expect(formatValue(null)).toBe("—");
    expect(formatValue(undefined)).toBe("—");
  });

  it("renders neo4j integers and arrays", () => {
    expect(formatValue(int(12345))).toBe("12345");
    expect(formatValue([1, "two", null])).toBe("1, two, —");
  });
});

describe("resolveCaption", () => {
  it("prefers an explicit override", () => {
    expect(
      resolveCaption(
        ["Person"],
        { name: "Ada", code: "X1" },
        { Person: "code" },
      ),
    ).toBe("X1");
  });

  it("falls back to a conventional property", () => {
    expect(resolveCaption(["Thing"], { title: "Hello" })).toBe("Hello");
  });

  it("falls back to the labels when nothing is displayable", () => {
    expect(resolveCaption(["Thing", "Other"], {})).toBe("Thing|Other");
  });
});
