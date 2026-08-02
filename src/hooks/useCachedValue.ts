import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

export enum CachedKey {
  showIcons = "showIcons",
  showNodeCaptions = "showNodeCaptions",
  showLinkLabels = "showLinkLabels",
  showParticles = "showParticles",
  bloom = "bloom",
  animate = "animate",
  nodeSizeMode = "nodeSizeMode",
  fetchLinksInBetween = "fetchLinksInBetween",
  dagMode = "dagMode",
  captionDistance = "captionDistance",
  captionOverrides = "captionOverrides",
  theme = "theme",
  leftPanelOpen = "leftPanelOpen",
  connection = "connection",
  history = "history",
}

const PREFIX = "n4j3d:";

function storageKey(key: CachedKey): string {
  return PREFIX + key;
}

function read<T>(key: CachedKey, fallback: T): T {
  try {
    const raw = localStorage.getItem(storageKey(key));
    if (raw === null) {
      return fallback;
    }
    const parsed = JSON.parse(raw) as T;
    // A stored `null` should not defeat the default.
    return parsed === null || parsed === undefined ? fallback : parsed;
  } catch {
    return fallback;
  }
}

export function writeCachedValue<T>(key: CachedKey, value: T) {
  try {
    localStorage.setItem(storageKey(key), JSON.stringify(value));
  } catch {
    // Private browsing or a full quota — persistence is best-effort.
  }
}

/** Read a cached value without subscribing to it. */
export function readCachedValue<T>(key: CachedKey, fallback: T): T {
  return read(key, fallback);
}

/**
 * `useState` backed by localStorage.
 *
 * Reads happen once through a lazy initialiser rather than in a `useMemo` that
 * re-ran whenever the default changed identity, and writes are wrapped so a
 * full or blocked storage quota cannot take the app down.
 */
function useCachedValue<T>(
  key: CachedKey,
  defaultValue: T,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => read(key, defaultValue));
  const initial = useRef(true);

  useEffect(() => {
    if (initial.current) {
      initial.current = false;
      return;
    }
    writeCachedValue(key, value);
  }, [key, value]);

  return [value, setValue];
}

/** A `Set<string>` persisted as an array. */
export function useCachedSet(
  key: CachedKey,
  defaultValue: string[] = [],
): [Set<string>, (value: string) => void, () => void] {
  const [items, setItems] = useCachedValue<string[]>(key, defaultValue);

  const toggle = useCallback(
    (value: string) => {
      setItems((current) =>
        current.includes(value)
          ? current.filter((entry) => entry !== value)
          : [...current, value],
      );
    },
    [setItems],
  );

  const clear = useCallback(() => setItems([]), [setItems]);

  return [new Set(items), toggle, clear];
}

export default useCachedValue;
