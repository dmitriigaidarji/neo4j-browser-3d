import {
  useCallback,
  useState,
  type PropsWithChildren,
  type ReactNode,
} from "react";

/** Collapsible block used to structure the left-hand panel. */
export default function PanelSection({
  title,
  icon,
  actions,
  defaultOpen = true,
  children,
}: PropsWithChildren<{
  title: string;
  icon: string;
  actions?: ReactNode;
  defaultOpen?: boolean;
}>) {
  const [open, setOpen] = useState(defaultOpen);
  const toggle = useCallback(() => setOpen((value) => !value), []);

  return (
    <section className={`panel-section${open ? " is-open" : ""}`}>
      <div className="panel-section__header">
        <button
          type="button"
          className="panel-section__toggle"
          onClick={toggle}
          aria-expanded={open}
        >
          <i
            className={`fas fa-chevron-${open ? "down" : "right"} panel-section__chevron`}
            aria-hidden="true"
          />
          <i
            className={`fas fa-${icon} panel-section__icon`}
            aria-hidden="true"
          />
          <span>{title}</span>
        </button>
        {actions && <div className="panel-section__actions">{actions}</div>}
      </div>
      {open && <div className="panel-section__body">{children}</div>}
    </section>
  );
}
