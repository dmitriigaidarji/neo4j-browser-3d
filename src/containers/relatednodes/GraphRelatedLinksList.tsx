import { useState } from "react";
import type { IRelatedLinkOption } from "../../graph/queries";
import type { INode } from "../../graph/types";
import GraphRelatedLink from "./GraphRelatedLink";

function patternText({ type, outgoing }: IRelatedLinkOption): string {
  return outgoing ? `-[${type}]->` : `<-[${type}]-`;
}

export default function GraphRelatedLinksList({
  links,
  item,
}: {
  links: IRelatedLinkOption[];
  item: INode;
}) {
  const [selected, setSelected] = useState<IRelatedLinkOption | null>(null);

  if (selected) {
    return (
      <div className="related__panel">
        <button
          type="button"
          className={`related__pattern is-selected ${selected.outgoing ? "is-out" : "is-in"}`}
          onClick={() => setSelected(null)}
        >
          <span>{patternText(selected)}</span>
          <i className="fas fa-xmark" aria-hidden="true" />
        </button>
        {/* Keyed so picking another pattern refetches from a clean mount. */}
        <GraphRelatedLink
          key={`${selected.type}-${selected.outgoing}`}
          link={selected}
          item={item}
        />
      </div>
    );
  }

  return (
    <div className="related__panel">
      <ul className="related__patterns">
        {links.map((link) => (
          <li key={`${link.type}-${link.outgoing}`}>
            <button
              type="button"
              className={`related__pattern ${link.outgoing ? "is-out" : "is-in"}`}
              onClick={() => setSelected(link)}
            >
              {patternText(link)}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
