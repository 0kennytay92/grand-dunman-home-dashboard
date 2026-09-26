import { useEffect, useId, type FormEvent, type ReactNode } from 'react';
import { Trash2, X } from 'lucide-react';

/** A pop-up form: a centred dialog on computers, a bottom sheet on phones. */
export function EditorModal({
  title,
  onClose,
  onSave,
  onDelete,
  deleteLabel = 'Delete',
  children,
}: {
  title: string;
  onClose: () => void;
  onSave: () => void;
  onDelete?: () => void;
  deleteLabel?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSave();
  };

  return (
    <div className="modal-layer">
      <div className="modal-backdrop" onClick={onClose} />
      <form className="modal" role="dialog" aria-modal="true" aria-label={title} onSubmit={submit} noValidate>
        <header className="modal-head">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </header>
        <div className="modal-body">{children}</div>
        <footer className="modal-foot">
          {onDelete && (
            <button type="button" className="btn btn-danger" onClick={onDelete}>
              <Trash2 size={16} /> {deleteLabel}
            </button>
          )}
          <span className="grow" />
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary">Save</button>
        </footer>
      </form>
    </div>
  );
}

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: (id: string) => ReactNode }) {
  const id = useId();
  return (
    <div className={`field ${error ? 'field-error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {children(id)}
      {error ? <p className="field-msg">{error}</p> : hint && <p className="field-hint">{hint}</p>}
    </div>
  );
}

export function FieldRow({ children }: { children: ReactNode }) {
  return <div className="field-row">{children}</div>;
}

export function TextInput({ label, value, onChange, error, hint, placeholder, autoFocus }: {
  label: string; value: string; onChange: (v: string) => void; error?: string; hint?: string; placeholder?: string; autoFocus?: boolean;
}) {
  return (
    <Field label={label} error={error} hint={hint}>
      {(id) => <input id={id} className="input" value={value} placeholder={placeholder} autoFocus={autoFocus} onChange={(e) => onChange(e.target.value)} />}
    </Field>
  );
}

export function TextArea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <Field label={label}>
      {(id) => <textarea id={id} className="input" rows={3} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />}
    </Field>
  );
}

/** Numbers are kept as text while typing, so the box can be empty. */
export function NumberInput({ label, value, onChange, error, hint, suffix, step = 'any' }: {
  label: string; value: string; onChange: (v: string) => void; error?: string; hint?: string; suffix?: string; step?: string;
}) {
  return (
    <Field label={label} error={error} hint={hint}>
      {(id) => (
        <div className="input-wrap">
          <input id={id} className="input" type="number" inputMode="decimal" min={0} step={step} value={value} onChange={(e) => onChange(e.target.value)} />
          {suffix && <span className="input-suffix">{suffix}</span>}
        </div>
      )}
    </Field>
  );
}

export function DateInput({ label, value, onChange, error }: { label: string; value: string; onChange: (v: string) => void; error?: string }) {
  return (
    <Field label={label} error={error}>
      {(id) => <input id={id} className="input" type="date" value={value} onChange={(e) => onChange(e.target.value)} />}
    </Field>
  );
}

export function SelectInput({ label, value, onChange, options, error }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; error?: string;
}) {
  return (
    <Field label={label} error={error}>
      {(id) => (
        <select id={id} className="input select" value={value} onChange={(e) => onChange(e.target.value)}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      )}
    </Field>
  );
}

/** "12.5" → 12.5, "" → undefined, rubbish → NaN */
export function toNumber(v: string) {
  if (v.trim() === '') return undefined;
  return Number(v);
}

export const numText = (n?: number) => (n === undefined ? '' : String(n));

export function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className="btn btn-primary btn-add" onClick={onClick}>
      <span aria-hidden>+</span> {label}
    </button>
  );
}
