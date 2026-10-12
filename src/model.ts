export type EffortType = 'RPE' | 'RIR';

/** One block of identical sets: e.g. 3 x 8 @ 100 kg, RPE 8. Values kept as strings (raw input). */
export type SetGroup = {
  id: string;
  weight: string;
  sets: string;
  reps: string;
  effort: string;
};

export type Exercise = {
  id: string;
  name: string;
  effortType: EffortType;
  main: SetGroup;
  drops: SetGroup[];
};

/** Day index: 0 = Monday ... 6 = Sunday */
export type Week = { days: Record<number, Exercise[]> };

/** Weeks keyed by the Monday date, 'YYYY-MM-DD' (local time). */
export type Db = { version: 1; weeks: Record<string, Week> };

export const emptyDb = (): Db => ({ version: 1, weeks: {} });

export const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36);

export const newSetGroup = (from?: Partial<SetGroup>): SetGroup => ({
  weight: '',
  sets: '',
  reps: '',
  effort: '',
  ...from,
  id: uid(),
});

export const newExercise = (): Exercise => ({
  id: uid(),
  name: '',
  effortType: 'RPE',
  main: newSetGroup(),
  drops: [],
});

/** Deep copy with fresh ids — used when copying a day/week forward. */
export const cloneExercise = (e: Exercise): Exercise => ({
  ...e,
  id: uid(),
  main: newSetGroup(e.main),
  drops: e.drops.map((d) => newSetGroup(d)),
});

export const dayExercises = (db: Db, weekKey: string, day: number): Exercise[] =>
  db.weeks[weekKey]?.days[day] ?? [];

export const weekHasData = (db: Db, weekKey: string) =>
  Object.values(db.weeks[weekKey]?.days ?? {}).some((list) => list.length > 0);

/** Most recent week before `weekKey` that contains any exercises. */
export const previousWeekWithData = (db: Db, weekKey: string): string | undefined =>
  Object.keys(db.weeks)
    .filter((k) => k < weekKey && weekHasData(db, k))
    .sort()
    .pop();

const norm = (s: string) => s.trim().toLowerCase();

/**
 * Find the same exercise in an earlier week (for the "last time" hint).
 * Prefers the same weekday, falls back to any day of that week.
 */
export const findPrevious = (
  db: Db,
  weekKey: string,
  day: number,
  name: string,
): Exercise | undefined => {
  if (!norm(name)) return undefined;
  const prevKey = previousWeekWithData(db, weekKey);
  if (!prevKey) return undefined;
  const week = db.weeks[prevKey];
  const same = (week.days[day] ?? []).find((e) => norm(e.name) === norm(name));
  if (same) return same;
  for (const list of Object.values(week.days)) {
    const hit = list.find((e) => norm(e.name) === norm(name));
    if (hit) return hit;
  }
  return undefined;
};

export const formatGroup = (g: SetGroup, effortType: EffortType) => {
  const parts: string[] = [];
  if (g.weight) parts.push(`${g.weight} kg`);
  if (g.sets || g.reps) parts.push(`${g.sets || '?'}×${g.reps || '?'}`);
  if (g.effort) parts.push(`${effortType} ${g.effort}`);
  return parts.join(' · ');
};
