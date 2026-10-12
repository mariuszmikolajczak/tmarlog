import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ExerciseCard } from './src/ExerciseCard';
import { DAYS, addWeeks, dayDate, isoWeek, mondayKey, weekRangeLabel, weekdayIndex } from './src/dates';
import {
  Db,
  Exercise,
  cloneExercise,
  dayExercises,
  findPrevious,
  newExercise,
  previousWeekWithData,
  weekHasData,
} from './src/model';
import { useDb } from './src/storage';
import { C } from './src/theme';

/** Cross-platform confirm (Alert.alert buttons don't work on web). */
function confirm(title: string, message: string): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  return new Promise((resolve) =>
    Alert.alert(title, message, [
      { text: 'Anuluj', style: 'cancel', onPress: () => resolve(false) },
      { text: 'OK', onPress: () => resolve(true) },
    ]),
  );
}

export default function App() {
  const { db, update, replace } = useDb();
  const today = new Date();
  const thisWeek = mondayKey(today);
  const [weekKey, setWeekKey] = useState(thisWeek);
  const [day, setDay] = useState(weekdayIndex(today));

  if (!db) {
    return (
      <View style={[s.root, { justifyContent: 'center' }]}>
        <ActivityIndicator color={C.accent} />
      </View>
    );
  }

  const exercises = dayExercises(db, weekKey, day);
  const sourceWeek = previousWeekWithData(db, weekKey);
  const sourceDay = sourceWeek ? dayExercises(db, sourceWeek, day) : [];

  const setDayList = (fn: (list: Exercise[]) => Exercise[]) =>
    update((d) => {
      const week = d.weeks[weekKey] ?? { days: {} };
      return {
        ...d,
        weeks: {
          ...d.weeks,
          [weekKey]: { ...week, days: { ...week.days, [day]: fn(week.days[day] ?? []) } },
        },
      };
    });

  const copyWeek = async () => {
    if (!sourceWeek) return;
    if (weekHasData(db, weekKey)) {
      const ok = await confirm('Nadpisać tydzień?', 'Ten tydzień ma już wpisy. Skopiowanie zastąpi wszystkie dni.');
      if (!ok) return;
    }
    update((d) => {
      const days: Record<number, Exercise[]> = {};
      for (const [k, list] of Object.entries(d.weeks[sourceWeek].days)) {
        days[Number(k)] = list.map(cloneExercise);
      }
      return { ...d, weeks: { ...d.weeks, [weekKey]: { days } } };
    });
  };

  const copyDay = () => setDayList(() => sourceDay.map(cloneExercise));

  const removeExercise = async (ex: Exercise) => {
    if (await confirm('Usunąć ćwiczenie?', ex.name || 'Bez nazwy')) {
      setDayList((list) => list.filter((e) => e.id !== ex.id));
    }
  };

  return (
    <View style={s.root}>
      <StatusBar style="light" />

      <View style={s.top}>
        {/* Week switcher — tap the title to jump back to the current week */}
        <View style={s.weekRow}>
          <Pressable onPress={() => setWeekKey(addWeeks(weekKey, -1))} style={s.arrow} accessibilityLabel="Poprzedni tydzień">
            <Text style={s.arrowText}>‹</Text>
          </Pressable>
          <Pressable onPress={() => setWeekKey(thisWeek)} style={{ alignItems: 'center', flex: 1 }}>
            <Text style={s.weekTitle}>Tydzień {isoWeek(weekKey)}</Text>
            <Text style={s.weekSub}>
              {weekRangeLabel(weekKey)}
              {weekKey === thisWeek ? ' · bieżący' : ''}
            </Text>
          </Pressable>
          <Pressable onPress={() => setWeekKey(addWeeks(weekKey, 1))} style={s.arrow} accessibilityLabel="Następny tydzień">
            <Text style={s.arrowText}>›</Text>
          </Pressable>
        </View>

        <View style={s.days}>
          {DAYS.map((label, i) => {
            const active = i === day;
            const has = dayExercises(db, weekKey, i).length > 0;
            const isToday = weekKey === thisWeek && i === weekdayIndex(today);
            return (
              <Pressable key={label} onPress={() => setDay(i)} style={[s.dayTab, active && s.dayTabOn]}>
                <Text style={[s.dayLabel, active && s.onAccent, isToday && !active && { color: C.accent }]}>{label}</Text>
                <Text style={[s.dayNum, active && s.onAccent]}>{dayDate(weekKey, i)}</Text>
                <View style={[s.dot, has && { backgroundColor: active ? C.accentText : C.accent }]} />
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        {exercises.length === 0 && (
          <View style={s.empty}>
            <Text style={s.emptyTitle}>Brak ćwiczeń w tym dniu</Text>
            {sourceWeek && !weekHasData(db, weekKey) && (
              <Pressable onPress={copyWeek} style={s.primary}>
                <Text style={s.primaryText}>Skopiuj cały tydzień {isoWeek(sourceWeek)}</Text>
              </Pressable>
            )}
            {sourceDay.length > 0 && (
              <Pressable onPress={copyDay} style={s.primaryOutline}>
                <Text style={s.primaryOutlineText}>
                  Tylko {DAYS[day]} z tyg. {isoWeek(sourceWeek!)} ({sourceDay.length} ćw.)
                </Text>
              </Pressable>
            )}
          </View>
        )}

        {exercises.map((ex) => (
          <ExerciseCard
            key={ex.id}
            exercise={ex}
            previous={findPrevious(db, weekKey, day, ex.name)}
            onChange={(next) => setDayList((list) => list.map((e) => (e.id === ex.id ? next : e)))}
            onDelete={() => removeExercise(ex)}
          />
        ))}

        <Pressable onPress={() => setDayList((list) => [...list, newExercise()])} style={s.addEx}>
          <Text style={s.addExText}>+ Dodaj ćwiczenie</Text>
        </Pressable>

        {sourceWeek && weekHasData(db, weekKey) && (
          <Pressable onPress={copyWeek} style={s.secondary}>
            <Text style={s.secondaryText}>
              Skopiuj cały tydzień {isoWeek(sourceWeek)} ({weekRangeLabel(sourceWeek)})
            </Text>
          </Pressable>
        )}

        {Platform.OS === 'web' && <Backup db={db} onImport={replace} />}
      </ScrollView>
    </View>
  );
}

/** Web-only JSON export/import, since data lives in this browser's storage. */
function Backup({ db, onImport }: { db: Db; onImport: (db: Db) => void }) {
  const exportJson = () => {
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `tmarlog-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const importJson = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const parsed = JSON.parse(await file.text()) as Db;
        if (!parsed || typeof parsed.weeks !== 'object') throw new Error('bad file');
        if (await confirm('Zaimportować?', 'Obecne dane zostaną zastąpione.')) onImport(parsed);
      } catch {
        window.alert('Nieprawidłowy plik kopii zapasowej.');
      }
    };
    input.click();
  };
  return (
    <View style={s.backup}>
      <Text style={s.backupText}>Dane są zapisane lokalnie w tej przeglądarce.</Text>
      <View style={{ flexDirection: 'row', gap: 20 }}>
        <Pressable onPress={exportJson}><Text style={s.link}>Eksportuj JSON</Text></Pressable>
        <Pressable onPress={importJson}><Text style={s.link}>Importuj JSON</Text></Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  top: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'web' ? 12 : 52,
    paddingBottom: 8,
    gap: 12,
  },
  weekRow: { flexDirection: 'row', alignItems: 'center' },
  arrow: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  arrowText: { color: C.text, fontSize: 30, lineHeight: 34 },
  weekTitle: { color: C.text, fontSize: 20, fontWeight: '800' },
  weekSub: { color: C.muted, fontSize: 13, marginTop: 2 },
  days: { flexDirection: 'row', gap: 4 },
  dayTab: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10, gap: 2 },
  dayTabOn: { backgroundColor: C.accent },
  dayLabel: { color: C.muted, fontSize: 12, fontWeight: '700' },
  dayNum: { color: C.text, fontSize: 16, fontWeight: '700' },
  onAccent: { color: C.accentText },
  dot: { width: 5, height: 5, borderRadius: 3, marginTop: 2, backgroundColor: 'transparent' },
  content: { width: '100%', maxWidth: 600, alignSelf: 'center', padding: 16, gap: 12, paddingBottom: 48 },
  empty: { alignItems: 'center', paddingVertical: 28, gap: 14 },
  emptyTitle: { color: C.muted, fontSize: 15 },
  primary: { backgroundColor: C.accent, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12 },
  primaryText: { color: C.accentText, fontWeight: '800', fontSize: 15 },
  primaryOutline: { borderColor: C.accent, borderWidth: 1.5, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12 },
  primaryOutlineText: { color: C.accent, fontWeight: '700', fontSize: 14 },
  addEx: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: C.inputBorder,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  addExText: { color: C.text, fontSize: 16, fontWeight: '700' },
  secondary: { alignSelf: 'center', paddingVertical: 8 },
  secondaryText: { color: C.muted, fontSize: 13, textDecorationLine: 'underline' },
  backup: { marginTop: 24, alignItems: 'center', gap: 6 },
  backupText: { color: C.faint, fontSize: 12 },
  link: { color: C.muted, fontSize: 13, textDecorationLine: 'underline' },
});
