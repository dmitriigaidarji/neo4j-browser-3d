import { FC, useContext } from "react";
import { SessionContext } from "../../providers/SessionProvider";
import "./schemaInfo.scss";
const SchemaInfoContainer: FC = () => {
  const { schema } = useContext(SessionContext);
  return (
    <div className={"schemaInfo block"}>
      <div className={"block"}>
        <div className={"title has-text-primary-10-invert"}>Labels</div>
        <div className={"is-overflow-y-scroll scroll"}>
          {schema.labels?.map((t) => (
            <div className={"tag is-dark"} key={t}>
              {t}
            </div>
          ))}
        </div>
      </div>
      <div className={"block"}>
        <div className={"title has-text-primary-10-invert"}>Relationships</div>
        <div className={"is-overflow-y-scroll scroll"}>
          {schema.relationshipTypes?.map((t) => (
            <div className={"tag is-dark"} key={t}>
              {t}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
export default SchemaInfoContainer;
