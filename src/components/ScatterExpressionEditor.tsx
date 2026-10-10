// Calculator-style editor for a custom Performance Scatter axis: a free-text
// expression field plus keypads that insert metrics, operators and functions at
// the caret. Parsing/evaluation lives in ../scatterExpression.ts.

import { useRef, type ReactNode } from 'react';
import { Check, AlertCircle, Delete } from 'lucide-react';

type LabelPart = { text: string; sub?: boolean };

interface Props {
  slotLabel: string;                       // "X", "Y", "Size"
  value: string;
  label: string;
  onChange: (expr: string) => void;
  onLabelChange: (label: string) => void;
  metrics: { varName: string; parts: LabelPart[]; description: string }[];
  presets: { name: string; expr: string }[];
  /** Parse status; `pos` is the character offset of the error when not ok. */
  status: { ok: boolean; message: string; pos?: number };
  renderLabel: (parts: LabelPart[]) => ReactNode;
}

const OPERATORS: { show: string; insert: string; title: string }[] = [
  { show: '+', insert: ' + ', title: 'add' },
  { show: '−', insert: ' - ', title: 'subtract' },
  { show: '×', insert: ' * ', title: 'multiply' },
  { show: '÷', insert: ' / ', title: 'divide' },
  { show: 'xʸ', insert: '^', title: 'power, e.g. B^0.5' },
  { show: '(', insert: '(', title: 'open parenthesis' },
  { show: ')', insert: ')', title: 'close parenthesis' },
  { show: ',', insert: ', ', title: 'argument separator for min/max/pow' },
];

const FUNCS: { show: string; insert: string; title: string }[] = [
  { show: '√', insert: 'sqrt(', title: 'square root' },
  { show: 'log₁₀', insert: 'log10(', title: 'base-10 logarithm' },
  { show: 'ln', insert: 'ln(', title: 'natural logarithm' },
  { show: 'exp', insert: 'exp(', title: 'e to the power' },
  { show: '|x|', insert: 'abs(', title: 'absolute value' },
  { show: 'min', insert: 'min(', title: 'smallest of the arguments' },
  { show: 'max', insert: 'max(', title: 'largest of the arguments' },
];

const key = 'px-2 py-0.5 rounded border border-ink/15 bg-surface-lowest text-ink hover:border-klein hover:text-klein';

export function ScatterExpressionEditor({ slotLabel, value, label, onChange, onLabelChange, metrics, presets, status, renderLabel }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Insert at the caret (replacing any selection), then put the caret after the insert.
  const insert = (text: string) => {
    const el = inputRef.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const next = value.slice(0, start) + text + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      const caret = start + text.length;
      el.setSelectionRange(caret, caret);
    });
  };

  const backspace = () => {
    const el = inputRef.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const from = start === end ? Math.max(0, start - 1) : start;
    onChange(value.slice(0, from) + value.slice(end));
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(from, from); });
  };

  return (
    <div className="px-5 py-3 border-b border-ink/10 text-xs space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-ink/60 w-9">{slotLabel} =</span>
        <input
          ref={inputRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          spellCheck={false}
          placeholder="e.g. dff_AP * sqrt(B)"
          className={`flex-1 min-w-[16rem] font-mono text-sm px-2 py-1 rounded border bg-surface-lowest text-ink focus:outline-none focus:border-klein ${status.ok ? 'border-ink/20' : 'border-red-400'}`}
        />
        <input
          value={label}
          onChange={e => onLabelChange(e.target.value)}
          placeholder="Axis title (optional)"
          className="w-44 px-2 py-1 rounded border border-ink/20 bg-surface-lowest text-ink focus:outline-none focus:border-klein"
        />
      </div>

      <div className={`pl-11 flex items-center gap-1 ${status.ok ? 'text-green-700' : 'text-red-600'}`}>
        {status.ok ? <Check className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
        <span>{status.message}</span>
        {!status.ok && value && status.pos != null && (
          <span className="font-mono text-ink/50 ml-2">
            {value.slice(0, status.pos)}<span className="bg-red-100 text-red-700 px-px">{value.slice(status.pos, status.pos + 1) || ' '}</span>{value.slice(status.pos + 1)}
          </span>
        )}
      </div>

      <div className="pl-11 flex flex-wrap items-center gap-1">
        <span className="text-ink/40 w-16">Metrics</span>
        {metrics.map(m => (
          <button key={m.varName} type="button" onClick={() => insert(m.varName)} title={`${m.description} — inserts “${m.varName}”`} className={key}>
            {renderLabel(m.parts)} <span className="font-mono text-[10px] text-ink/40">{m.varName}</span>
          </button>
        ))}
      </div>

      <div className="pl-11 flex flex-wrap items-center gap-1">
        <span className="text-ink/40 w-16">Operators</span>
        {OPERATORS.map(o => (
          <button key={o.show} type="button" onClick={() => insert(o.insert)} title={o.title} className={`${key} font-mono min-w-[1.75rem]`}>{o.show}</button>
        ))}
        <span className="w-3" />
        {FUNCS.map(f => (
          <button key={f.show} type="button" onClick={() => insert(f.insert)} title={f.title} className={`${key} font-mono`}>{f.show}</button>
        ))}
        <span className="w-3" />
        <button type="button" onClick={backspace} title="Delete one character" className={key}><Delete className="w-3.5 h-3.5" /></button>
        <button type="button" onClick={() => { onChange(''); inputRef.current?.focus(); }} className={key}>Clear</button>
      </div>

      <div className="pl-11 flex flex-wrap items-center gap-1">
        <span className="text-ink/40 w-16">Presets</span>
        {presets.map(p => (
          <button key={p.name} type="button" onClick={() => onChange(p.expr)} title={p.expr} className={key}>
            {p.name} <span className="font-mono text-[10px] text-ink/40">{p.expr}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
