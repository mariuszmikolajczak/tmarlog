const pad = (n: number) => String(n).padStart(2, '0');

export const toKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const fromKey = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/** Monday of the week containing `d`, as a week key. */
export const mondayKey = (d: Date) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (x.getDay() + 6) % 7; // 0 = Monday
  x.setDate(x.getDate() - dow);
  return toKey(x);
};

export const addWeeks = (key: string, n: number) => {
  const d = fromKey(key);
  d.setDate(d.getDate() + n * 7);
  return toKey(d);
};

/** Weekday index of `d`, 0 = Monday. */
export const weekdayIndex = (d: Date) => (d.getDay() + 6) % 7;

/** ISO-8601 week number. */
export const isoWeek = (key: string) => {
  const d = fromKey(key);
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
};

const MONTHS = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];
export const DAYS = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'];

export const weekRangeLabel = (key: string) => {
  const start = fromKey(key);
  const end = fromKey(addWeeks(key, 1));
  end.setDate(end.getDate() - 1);
  const s = `${start.getDate()} ${MONTHS[start.getMonth()]}`;
  const e = `${end.getDate()} ${MONTHS[end.getMonth()]}`;
  return `${s} – ${e}`;
};

export const dayDate = (key: string, day: number) => {
  const d = fromKey(key);
  d.setDate(d.getDate() + day);
  return d.getDate();
};
