import type { ReactNode } from 'react';
import { Image } from 'lucide-react';
import { useStore } from '../data/store';

export function PageHeader({ eyebrow, title, subtitle, action }: { eyebrow?: string; title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <header className="page-header">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {subtitle && <p className="subtitle">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function Card({ children, className = '', title, action }: { children: ReactNode; className?: string; title?: string; action?: ReactNode }) {
  return (
    <section className={`card ${className}`}>
      {(title || action) && (
        <div className="card-head">
          {title && <h2>{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

type Tone = 'neutral' | 'accent' | 'good' | 'warn' | 'bad' | 'info';

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: Tone }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function ProgressBar({ value, tone = 'accent' }: { value: number; tone?: Tone }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="progress" role="progressbar" aria-valuenow={Math.round(clamped)} aria-valuemin={0} aria-valuemax={100}>
      <div className={`progress-fill progress-${tone}`} style={{ width: `${clamped}%` }} />
    </div>
  );
}

export function Stat({ label, value, hint, icon }: { label: string; value: string; hint?: string; icon: ReactNode }) {
  return (
    <div className="stat">
      <div className="stat-icon">{icon}</div>
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
      {hint && <p className="stat-hint">{hint}</p>}
    </div>
  );
}

export function Chips<T extends string>({ options, value, onChange }: { options: readonly T[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="chips" role="tablist">
      {options.map((opt) => (
        <button key={opt} role="tab" aria-selected={opt === value} className={`chip ${opt === value ? 'chip-active' : ''}`} onClick={() => onChange(opt)}>
          {opt}
        </button>
      ))}
    </div>
  );
}

/** Stand-in artwork until real photos are added. */
export function PhotoPlaceholder({ roomId, label }: { roomId: string; label?: string }) {
  const hue = useStore().data.rooms.find((r) => r.id === roomId)?.hue ?? 35;
  return (
    <div
      className="photo-ph"
      style={{
        background: `linear-gradient(135deg, hsl(${hue} 32% 82%), hsl(${hue + 20} 24% 62%))`,
      }}
    >
      <Image size={26} strokeWidth={1.5} />
      {label && <span>{label}</span>}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>;
}

export const statusTone = {
  'Not started': 'neutral',
  Planning: 'info',
  'In progress': 'warn',
  Completed: 'good',
  Concept: 'neutral',
  Shortlisted: 'info',
  Selected: 'good',
  Rejected: 'bad',
  'Existing Condition': 'neutral',
  Measurement: 'info',
  'Design Reference': 'accent',
  'Renovation Progress': 'warn',
} as const satisfies Record<string, Tone>;
