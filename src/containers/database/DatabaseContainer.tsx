import { ChangeEvent, FC, useCallback, useContext } from "react";
import { SessionContext } from "../../providers/SessionProvider";

const DatabaseContainer: FC = () => {
  const { databases, database, setDatabase } = useContext(SessionContext);
  return (
    <div className={"block"}>
      <div className={"title has-text-primary-10-invert"}>Database</div>
      <div>
        <select
          value={database}
          onChange={useCallback(
            (e: ChangeEvent<HTMLSelectElement>) => {
              setDatabase(e.currentTarget.value);
            },
            [setDatabase],
          )}
        >
          {databases.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default DatabaseContainer;
