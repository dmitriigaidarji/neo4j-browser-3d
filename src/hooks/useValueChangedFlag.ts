import { useEffect, useState } from "react";
import usePrev from "./usePrev";

const useValueChangedFlag = function <T>(val: T) {
  const [show, setShow] = useState(false);
  const prevVal = usePrev(val);
  useEffect(() => {
    setShow(false);
  }, [val]);
  useEffect(() => {
    if (!show) {
      setShow(true);
    }
  }, [show]);

  return prevVal === val;
};

export default useValueChangedFlag;
