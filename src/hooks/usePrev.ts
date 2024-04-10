import { useEffect, useState } from "react";

const usePrev = function <T>(inputValue: T) {
  const [value, setValue] = useState(inputValue);
  useEffect(() => {
    setValue(inputValue);
  }, [inputValue]);
  return value;
};

export default usePrev;
