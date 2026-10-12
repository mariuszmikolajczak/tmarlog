import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Db, emptyDb } from './model';

const KEY = 'tmarlog/db/v1';
const LEGACY_KEY = 'training-log/db/v1'; // pre-rename key, read once and migrated

/** Loads the whole DB once, keeps it in state, persists every change (debounced). */
export function useDb() {
  const [db, setDb] = useState<Db | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      let raw = await AsyncStorage.getItem(KEY);
      if (!raw) {
        raw = await AsyncStorage.getItem(LEGACY_KEY);
        if (raw) await AsyncStorage.setItem(KEY, raw);
      }
      return raw;
    })()
      .then((raw) => setDb(raw ? (JSON.parse(raw) as Db) : emptyDb()))
      .catch(() => setDb(emptyDb()));
  }, []);

  const update = useCallback((fn: (db: Db) => Db) => {
    setDb((cur) => {
      if (!cur) return cur;
      const next = fn(cur);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
      }, 300);
      return next;
    });
  }, []);

  const replace = useCallback((next: Db) => {
    setDb(next);
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  return { db, update, replace };
}
