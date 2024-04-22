import * as React from "react";
import { MouseEventHandler, useCallback, useState } from "react";
import { IRelatedLinkOption } from "./GraphRelatedNodes";
import GraphRelatedLink from "./GraphRelatedLink";
import { INode } from "../graph/helpers";

const GraphRelatedLinksList: React.FC<{
  links: IRelatedLinkOption[];
  item: INode;
}> = ({ links, item }) => {
  const [selected, setSelected] = useState<IRelatedLinkOption | undefined>(
    undefined,
  );

  const handleClick: MouseEventHandler<HTMLButtonElement> = useCallback(
    (event) => {
      const index = event.currentTarget.dataset.index;
      if (index) {
        const parsed = parseInt(index, 10);
        if (!isNaN(parsed)) {
          setSelected(links[parsed]);
        }
      }
    },
    [links],
  );
  return (
    <div className={"GraphRelatedLinksList"}>
      {selected ? (
        <div>
          <div
            className={`tag ${selected.outgoing ? "is-info" : "is-warning"}`}
          >
            {selected.outgoing
              ? `-[${selected.type}]->`
              : `<-[${selected.type}]-`}
            <button
              className="delete is-small is-warning"
              data-index={-1}
              onClick={handleClick}
            />
          </div>
          <GraphRelatedLink link={selected} item={item} />
        </div>
      ) : (
        <ul>
          {links.map(({ type, outgoing }, index) => {
            return (
              <li key={type + outgoing}>
                <button
                  className={`tag is-hoverable ${outgoing ? "is-info" : "is-warning"}`}
                  data-index={index}
                  onClick={handleClick}
                >
                  {outgoing ? `-[${type}]->` : `<-[${type}]-`}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default GraphRelatedLinksList;
