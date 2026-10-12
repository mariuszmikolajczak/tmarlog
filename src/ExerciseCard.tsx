import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { EffortType, Exercise, SetGroup, formatGroup, newSetGroup } from './model';
import { C } from './theme';

type Props = {
  exercise: Exercise;
  previous?: Exercise;
  onChange: (e: Exercise) => void;
  onDelete: () => void;
};

export function ExerciseCard({ exercise: ex, previous, onChange, onDelete }: Props) {
  const set = (patch: Partial<Exercise>) => onChange({ ...ex, ...patch });

  const updateDrop = (i: number, g: SetGroup) =>
    set({ drops: ex.drops.map((d, j) => (j === i ? g : d)) });

  const addDrop = () => {
    // Pre-fill a new drop with the previous block's sets/reps (weight left empty).
    const base = ex.drops[ex.drops.length - 1] ?? ex.main;
    set({ drops: [...ex.drops, newSetGroup({ sets: base.sets, reps: base.reps })] });
  };

  return (
    <View style={s.card}>
      <View style={s.headerRow}>
        <TextInput
          value={ex.name}
          onChangeText={(name) => set({ name })}
          placeholder="Nazwa ćwiczenia, np. Bench press"
          placeholderTextColor={C.faint}
          style={s.name}
        />
        <EffortToggle value={ex.effortType} onChange={(effortType) => set({ effortType })} />
        <Pressable onPress={onDelete} hitSlop={8} accessibilityLabel="Usuń ćwiczenie">
          <Text style={s.remove}>✕</Text>
        </Pressable>
      </View>

      <GroupRow
        label="Seria główna"
        color={C.accent}
        group={ex.main}
        effortType={ex.effortType}
        previous={previous ? formatGroup(previous.main, previous.effortType) : undefined}
        onChange={(main) => set({ main })}
      />

      {ex.drops.map((d, i) => (
        <GroupRow
          key={d.id}
          label={`Drop ${i + 1}`}
          color={C.drop}
          group={d}
          effortType={ex.effortType}
          previous={
            previous?.drops[i] ? formatGroup(previous.drops[i], previous.effortType) : undefined
          }
          onChange={(g) => updateDrop(i, g)}
          onRemove={() => set({ drops: ex.drops.filter((_, j) => j !== i) })}
        />
      ))}

      <Pressable onPress={addDrop} style={s.addDrop}>
        <Text style={s.addDropText}>+ seria dropowa</Text>
      </Pressable>
    </View>
  );
}

function EffortToggle({ value, onChange }: { value: EffortType; onChange: (v: EffortType) => void }) {
  return (
    <View style={s.toggle}>
      {(['RPE', 'RIR'] as const).map((t) => (
        <Pressable
          key={t}
          onPress={() => onChange(t)}
          style={[s.toggleItem, value === t && s.toggleItemOn]}
        >
          <Text style={[s.toggleText, value === t && s.toggleTextOn]}>{t}</Text>
        </Pressable>
      ))}
    </View>
  );
}

type RowProps = {
  label: string;
  color: string;
  group: SetGroup;
  effortType: EffortType;
  previous?: string;
  onChange: (g: SetGroup) => void;
  onRemove?: () => void;
};

function GroupRow({ label, color, group, effortType, previous, onChange, onRemove }: RowProps) {
  const field = (key: keyof Omit<SetGroup, 'id'>, caption: string, decimal = false) => (
    <View style={s.field}>
      <Text style={s.caption}>{caption}</Text>
      <TextInput
        value={group[key]}
        onChangeText={(v) => onChange({ ...group, [key]: v.replace(',', '.') })}
        keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
        inputMode={decimal ? 'decimal' : 'numeric'}
        selectTextOnFocus
        placeholder="–"
        placeholderTextColor={C.faint}
        style={s.input}
      />
    </View>
  );

  return (
    <View style={[s.group, { borderLeftColor: color }]}>
      <View style={s.groupHeader}>
        <Text style={[s.groupLabel, { color }]}>{label}</Text>
        {previous ? <Text style={s.prev}>poprz.: {previous}</Text> : <View style={{ flex: 1 }} />}
        {onRemove && (
          <Pressable onPress={onRemove} hitSlop={8} accessibilityLabel="Usuń drop">
            <Text style={s.removeSmall}>✕</Text>
          </Pressable>
        )}
      </View>
      <View style={s.fields}>
        {field('weight', 'kg', true)}
        {field('sets', 'serie')}
        {field('reps', 'powt.')}
        {field('effort', effortType, true)}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: C.card,
    borderColor: C.cardBorder,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: {
    flex: 1,
    minWidth: 0,
    color: C.text,
    fontSize: 18,
    fontWeight: '700',
    paddingVertical: 4,
    outlineStyle: 'none' as any,
  },
  remove: { color: C.muted, fontSize: 16, paddingHorizontal: 4 },
  removeSmall: { color: C.faint, fontSize: 13, paddingLeft: 8 },
  toggle: { flexDirection: 'row', backgroundColor: C.input, borderRadius: 8, padding: 2 },
  toggleItem: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  toggleItemOn: { backgroundColor: C.cardBorder },
  toggleText: { color: C.faint, fontSize: 12, fontWeight: '700' },
  toggleTextOn: { color: C.text },
  group: { borderLeftWidth: 3, paddingLeft: 10, gap: 6 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  groupLabel: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 },
  prev: { flex: 1, color: C.muted, fontSize: 12, textAlign: 'right' },
  fields: { flexDirection: 'row', gap: 8 },
  field: { flex: 1, gap: 3 },
  caption: { color: C.faint, fontSize: 11, fontWeight: '600' },
  input: {
    backgroundColor: C.input,
    borderColor: C.inputBorder,
    borderWidth: 1,
    borderRadius: 8,
    color: C.text,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 10,
    minWidth: 0,
    fontVariant: ['tabular-nums'],
  },
  addDrop: { alignSelf: 'flex-start', paddingVertical: 4 },
  addDropText: { color: C.drop, fontSize: 14, fontWeight: '600' },
});
