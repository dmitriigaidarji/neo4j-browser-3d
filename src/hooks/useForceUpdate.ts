import { useCallback, useState } from "react";

function useForceUpdate() {
  const [, setCount] = useState(1);
  return useCallback(() => {
    setCount((t) => t + 1);
  }, []);
}
export default useForceUpdate;
