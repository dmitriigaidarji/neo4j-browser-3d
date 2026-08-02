import { useCallback, useContext, type ChangeEvent } from "react";
import { SessionContext } from "../../providers/SessionProvider";
import PanelSection from "../../components/PanelSection";

export default function DatabaseContainer() {
  const { databases, database, setDatabase } = useContext(SessionContext);

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => setDatabase(event.target.value),
    [setDatabase],
  );

  return (
    <PanelSection title="Database" icon="database">
      <div className="select is-fullwidth is-small">
        <select value={database} onChange={handleChange} aria-label="Database">
          {databases.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>
    </PanelSection>
  );
}
