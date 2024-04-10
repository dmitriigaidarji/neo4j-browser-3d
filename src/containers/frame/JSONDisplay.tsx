import { prettyPrintJson } from "pretty-print-json";
import { useMemo } from "react";

function JSONDisplay({ data }: { data: any }) {
  const html = useMemo(() => {
    return { __html: prettyPrintJson.toHtml(data) };
  }, [data]);

  return (
    <div className={"scroll-500"}>
      <pre dangerouslySetInnerHTML={html}></pre>
    </div>
  );
}

export default JSONDisplay;
