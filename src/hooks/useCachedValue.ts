import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";

export enum CachedKey {
  showIcons = "showIcons",
  showNodeTexts = "showNodeTexts",
  showLinkTexts = "showLinkTexts",
  showLinkValues = "showLinkValues",
  doAnimation = "doAnimation",
  fetchLinksInBetween = "fetchLinksInBetween",
  dagMode = "dagMode",
  visibleTextDistance = "visibleTextDistance",
}
export function getCachedKey(key: CachedKey) {
  return "ui-" + key;
}
function useCachedValue<T extends boolean | number | string | undefined>(
  key: CachedKey,
  defaultValue: T,
): [T, Dispatch<SetStateAction<T>>] {
  const parsed = useMemo(() => {
    const cached = localStorage.getItem(getCachedKey(key));
    if (cached) {
      try {
        return JSON.parse(cached) as T;
      } catch (e) {
        console.error(e);
      }
    }
    return defaultValue;
  }, [key, defaultValue]);

  const [value, setValue] = useState(parsed);
  useEffect(() => {
    localStorage.setItem(getCachedKey(key), JSON.stringify(value));
  }, [value, key]);

  return [value, setValue];
}
export default useCachedValue;
