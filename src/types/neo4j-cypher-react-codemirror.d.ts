/**
 * `@neo4j-cypher/react-codemirror` ships type declarations but does not expose
 * them through its package.json "exports" map, so they are invisible under
 * `moduleResolution: bundler`. Re-point the module at the shipped declaration
 * file rather than falling back to `any`.
 */
declare module "@neo4j-cypher/react-codemirror" {
  export * from "@neo4j-cypher/react-codemirror/src/react-codemirror.d.ts";
}

declare module "@neo4j-cypher/codemirror/css/cypher-codemirror.css";
