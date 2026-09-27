import { useState, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, MessageCircle, Plus, ShieldCheck, Truck, Wrench } from 'lucide-react';
import { useStore } from '../../data/store';
import { conditionTone, deliveryTone, installationTone, issueTone, itemMoney, warrantyEnd } from '../../data/budget';
import type { Inspection, Issue, PurchaseItem, VendorMessage } from '../../data/types';
import { daysUntil, formatDate } from '../../format';
import { InspectionForm, IssueForm, MessageForm, WarrantyForm } from '../../editors/Tracking';
import { DocumentAdder } from '../../editors/DocumentForm';
import { PhotoRow } from '../../components/PhotoPicks';
import { Badge, Card, EmptyState } from '../../components/ui';
import { DocumentRows } from './Documents';
import { vendorHref } from './links';

// ── The item's journey: payment, delivery and installation, each on its own line ──

interface Lane {
  label: string;
  icon: ReactNode;
  steps: string[];
  at: number; // index of the current step (-1 = not started)
  problem?: boolean;
  status: string;
}

export function Journey({ item }: { item: PurchaseItem }) {
  const { data } = useStore();
  const m = itemMoney(item, data.payments);
  const lanes: Lane[] = [];
  lanes.push({
    label: 'Payment', icon: <CheckCircle2 size={15} />, steps: ['Deposit', 'Part paid', 'Fully paid'],
    at: m.state === 'Fully paid' || m.state === 'Overpaid' ? 2 : m.state === 'Partly paid' ? 1 : m.paid > 0 ? 0 : -1,
    problem: m.state === 'Overpaid', status: m.state === 'TBD' ? (m.paid > 0 ? 'Paid something – amount TBD' : 'Amount TBD') : m.state,
  });
  const ds = item.deliveryStatus;
  const dAt = ds === 'Not Ordered' ? -1 : ds === 'Ordered' || ds === 'Awaiting Delivery Date' ? 0 : ds === 'Delivery Scheduled' ? 1 : item.deliveryInspection?.accepted ? 3 : 2;
  lanes.push({ label: 'Delivery', icon: <Truck size={15} />, steps: ['Ordered', 'Scheduled', 'Delivered', 'Checked'], at: dAt, problem: ds === 'Delivery Issue' || ds === 'Returned / Exchanged' || ds === 'Partially Delivered', status: ds });
  const is = item.installationStatus;
  if (is !== 'Not Required') {
    const iAt = is === 'Awaiting Installation' ? 0 : is === 'Installation Scheduled' ? 1 : is === 'Installation In Progress' ? 2 : is === 'Installed' || is === 'Installation Issue' ? 3 : 4;
    lanes.push({ label: 'Installation', icon: <Wrench size={15} />, steps: ['Waiting', 'Scheduled', 'Working', 'Installed', 'Checked'], at: iAt, problem: is === 'Installation Issue', status: is });
  }

  return (
    <div className="journey" aria-label="Item journey">
      {lanes.map((l) => (
        <div key={l.label} className={`lane ${l.problem ? 'has-problem' : ''}`}>
          <div className="lane-head">
            <span className="lane-label">{l.icon} {l.label}</span>
            <span className={`lane-status ${l.problem ? 'bad' : ''}`}>{l.status}</span>
          </div>
          <ol className="steps" style={{ gridTemplateColumns: `repeat(${l.steps.length}, minmax(0, 1fr))` }}>
            {l.steps.map((s, i) => (
              <li key={s} className={`${i <= l.at ? 'done' : ''} ${i === l.at ? 'now' : ''} ${l.problem && i === l.at ? 'problem' : ''}`}>
                <span className="dot" />
                <span className="step-label">{s}</span>
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
}

// ── Delivery & installation tabs ─────────────────────────────

function InspectionSummary({ inspection, onRedo }: { inspection: Inspection; onRedo: () => void }) {
  const { data } = useStore();
  const issue = data.issues.find((x) => x.id === inspection.issueId);
  return (
    <div className="inspection">
      <div className="inspection-head">
        <Badge tone={conditionTone(inspection.condition)}>{inspection.condition}</Badge>
        <span className="row-sub">{inspection.accepted ? 'Accepted' : 'Issue reported'} · {formatDate(inspection.date)}</span>
        <button type="button" className="link" onClick={onRedo}>Edit</button>
      </div>
      {inspection.notes && <p className="notes-text">{inspection.notes}</p>}
      <PhotoRow ids={inspection.photoIds} caption="Inspection photo" />
      {issue && <p className="row-sub">Issue: <strong>{issue.title}</strong> – <Badge tone={issueTone(issue.status)}>{issue.status}</Badge></p>}
    </div>
  );
}

export function StageTab({ item, stage }: { item: PurchaseItem; stage: 'delivery' | 'installation' }) {
  const { data, upsert, notify } = useStore();
  const [inspecting, setInspecting] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [openIssue, setOpenIssue] = useState<Issue | null>(null);
  const isDelivery = stage === 'delivery';
  const inspection = isDelivery ? item.deliveryInspection : item.installationInspection;
  const kind = isDelivery ? 'Delivery' : 'Installation';
  const issues = data.issues.filter((x) => x.itemId === item.id && x.kind === kind);
  const docs = data.documents.filter((d) => d.itemIds.includes(item.id) && d.relatesTo === kind);
  const status = isDelivery ? item.deliveryStatus : item.installationStatus;
  const notRequired = !isDelivery && status === 'Not Required';
  const done = isDelivery ? status === 'Delivered' || status === 'Partially Delivered' || status === 'Delivery Issue' : status === 'Installed' || status === 'Completed' || status === 'Installation Issue';
  const expected = isDelivery ? item.expectedDelivery : item.expectedInstallation;
  const actual = isDelivery ? item.actualDelivery : item.actualInstallation;

  const setDate = (value: string) => {
    const patch = isDelivery
      ? { expectedDelivery: value || undefined, deliveryStatus: value && (status === 'Ordered' || status === 'Awaiting Delivery Date' || status === 'Not Ordered') ? ('Delivery Scheduled' as const) : item.deliveryStatus }
      : { expectedInstallation: value || undefined, installationStatus: value && status === 'Awaiting Installation' ? ('Installation Scheduled' as const) : item.installationStatus };
    upsert('purchases', { ...item, ...patch });
    notify(value ? `${kind} date set` : `${kind} date cleared`);
  };

  if (notRequired) {
    return (
      <Card title="Installation">
        <EmptyState>This item doesn't need installing.</EmptyState>
        <div className="center">
          <button className="btn btn-ghost" onClick={() => { upsert('purchases', { ...item, installationStatus: 'Awaiting Installation' }); notify('Installation needed'); }}>
            <Wrench size={16} /> It needs installing
          </button>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid-2">
      <div className="stack">
        <Card title={kind}>
          <div className="stage-status">
            <Badge tone={isDelivery ? deliveryTone(item.deliveryStatus) : installationTone(item.installationStatus)}>{status}</Badge>
            {actual ? <span className="row-sub">{isDelivery ? 'Delivered' : 'Installed'} {formatDate(actual)}</span> : expected ? <span className="row-sub">Expected {formatDate(expected)}{daysUntil(expected) >= 0 ? ` (in ${daysUntil(expected)} day${daysUntil(expected) === 1 ? '' : 's'})` : ' – overdue'}</span> : null}
          </div>
          {!done && (
            <label className="field inline-date">
              <span>{isDelivery ? 'Delivery date' : 'Installation date'}</span>
              <input className="input" type="date" value={expected ?? ''} onChange={(e) => setDate(e.target.value)} aria-label={isDelivery ? 'Expected delivery date' : 'Expected installation date'} />
            </label>
          )}
          {inspection ? (
            <InspectionSummary inspection={inspection} onRedo={() => setInspecting(true)} />
          ) : (
            <button className="btn btn-primary big-action" onClick={() => setInspecting(true)}>
              {isDelivery ? <Truck size={18} /> : <Wrench size={18} />} {done ? `Check the ${stage}` : isDelivery ? 'Mark delivered' : 'Mark installed'}
            </button>
          )}
          <button className="btn btn-ghost big-action" onClick={() => setReporting(true)}><AlertTriangle size={17} /> Report issue</button>
        </Card>
        <Card title={`${kind} documents`} action={<DocumentAdder defaults={{ itemIds: [item.id], vendorId: item.vendorId, type: 'Other', relatesTo: kind }}>{(open) => <button className="link" onClick={open}><Plus size={15} /> Upload</button>}</DocumentAdder>}>
          <DocumentRows docs={docs} empty={isDelivery ? 'e.g. delivery order or signed delivery note.' : 'e.g. installation report or guide.'} />
        </Card>
      </div>
      <Card title={`${kind} issues`}>
        <IssueList issues={issues} onOpen={setOpenIssue} empty={`No ${stage} issues.`} />
      </Card>
      {inspecting && <InspectionForm item={item} stage={stage} onClose={() => setInspecting(false)} />}
      {reporting && <IssueForm itemId={item.id} defaultKind={kind} onClose={() => setReporting(false)} />}
      {openIssue && <IssueForm issue={openIssue} onClose={() => setOpenIssue(null)} />}
    </div>
  );
}


// ── Issues ───────────────────────────────────────────────────

export function IssueList({ issues, onOpen, empty = 'No issues.', showItem }: { issues: Issue[]; onOpen: (i: Issue) => void; empty?: string; showItem?: boolean }) {
  const { data } = useStore();
  if (!issues.length) return <EmptyState>{empty}</EmptyState>;
  const sorted = [...issues].sort((a, b) => Number(a.status === 'Resolved') - Number(b.status === 'Resolved') || b.reportedDate.localeCompare(a.reportedDate));
  return (
    <ul className="list">
      {sorted.map((x) => {
        const item = data.purchases.find((i) => i.id === x.itemId);
        const days = x.status !== 'Resolved' ? -daysUntil(x.reportedDate) : undefined;
        return (
          <li key={x.id}>
            <button className="list-row row-button" onClick={() => onOpen(x)}>
              <span className={`up-icon tone-${x.status === 'Resolved' ? 'info' : 'bad'}`}><AlertTriangle size={16} /></span>
              <div className="grow">
                <p className="row-title">{x.title}</p>
                <p className="row-sub">
                  {[showItem && item?.name, x.kind === 'Other' ? 'Found later' : `On ${x.kind.toLowerCase()}`, `reported ${formatDate(x.reportedDate)}`, x.fixDate && x.status !== 'Resolved' && `fix ${formatDate(x.fixDate)}`, days !== undefined && days > 0 && `open ${days} day${days === 1 ? '' : 's'}`].filter(Boolean).join(' · ')}
                </p>
              </div>
              <Badge tone={issueTone(x.status)}>{x.status}</Badge>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function IssuesTab({ item }: { item: PurchaseItem }) {
  const { data } = useStore();
  const [editing, setEditing] = useState<{ issue?: Issue } | null>(null);
  const issues = data.issues.filter((x) => x.itemId === item.id);
  return (
    <Card title="Issues" action={<button className="link" onClick={() => setEditing({})}><Plus size={15} /> Report issue</button>}>
      <IssueList issues={issues} onOpen={(issue) => setEditing({ issue })} empty="No issues – nothing to fix." />
      {issues.some((x) => x.photoIds.length) && <p className="card-text muted">Tap an issue to see its photos or update it.</p>}
      {editing && <IssueForm issue={editing.issue} itemId={item.id} onClose={() => setEditing(null)} />}
    </Card>
  );
}

// ── Messages ─────────────────────────────────────────────────

export function MessageTimeline({ messages, onOpen, empty = 'No messages yet.', showVendor }: { messages: VendorMessage[]; onOpen: (m: VendorMessage) => void; empty?: string; showVendor?: boolean }) {
  const { data } = useStore();
  if (!messages.length) return <EmptyState>{empty}</EmptyState>;
  const sorted = [...messages].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <ol className="timeline">
      {sorted.map((m) => {
        const vendor = data.vendors.find((v) => v.id === m.vendorId);
        const items = data.purchases.filter((i) => m.itemIds.includes(i.id));
        return (
          <li key={m.id} className={`msg dir-${m.direction === 'From Vendor' ? 'in' : m.direction === 'To Vendor' ? 'out' : 'note'}`}>
            <span className="msg-dot"><MessageCircle size={14} /></span>
            <div className="msg-body">
              <button type="button" className="msg-open" onClick={() => onOpen(m)}>
                <span className="row-sub">
                  {formatDate(m.date)} · {m.channel} · {m.direction === 'From Vendor' ? 'from vendor' : m.direction === 'To Vendor' ? 'to vendor' : 'note'}
                  {showVendor && vendor && <> · {vendor.name}</>}
                </span>
                {m.text && <span className="msg-text">{m.text}</span>}
                {items.length > 0 && <span className="row-sub">About: {items.map((i) => i.name).join(', ')}</span>}
              </button>
              <PhotoRow ids={m.photoIds} caption="Screenshot" />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function MessagesTab({ item }: { item: PurchaseItem }) {
  const { data } = useStore();
  const [editing, setEditing] = useState<{ message?: VendorMessage } | null>(null);
  const messages = data.messages.filter((m) => m.itemIds.includes(item.id));
  const vendor = data.vendors.find((v) => v.id === item.vendorId);
  return (
    <Card title="Messages" action={<button className="link" onClick={() => setEditing({})}><Plus size={15} /> Add message</button>}>
      <MessageTimeline messages={messages} onOpen={(message) => setEditing({ message })} empty="Keep a record of what the vendor said – type it in, or add WhatsApp or email screenshots." />
      {vendor && <p className="card-text muted">All messages with {vendor.name} are on the <a className="link inline-link" href={vendorHref(vendor.id)}>vendor's page</a>.</p>}
      {editing && <MessageForm message={editing.message} itemId={item.id} onClose={() => setEditing(null)} />}
    </Card>
  );
}

// ── Warranty ─────────────────────────────────────────────────

export function WarrantyTab({ item }: { item: PurchaseItem }) {
  const { data } = useStore();
  const [editing, setEditing] = useState(false);
  const w = item.warranty;
  const end = warrantyEnd(item);
  const left = end ? daysUntil(end) : undefined;
  const docs = data.documents.filter((d) => d.itemIds.includes(item.id) && d.type === 'Warranty');
  return (
    <div className="grid-2">
      <Card title="Warranty" action={<button className="link" onClick={() => setEditing(true)}>{w ? 'Edit' : 'Add warranty'}</button>}>
        {!w ? (
          <EmptyState>No warranty details yet.</EmptyState>
        ) : (
          <>
            {end && (
              <p className={`warranty-left ${left! < 0 ? 'expired' : left! <= 30 ? 'soon' : ''}`}>
                <ShieldCheck size={18} /> {left! < 0 ? `Ended ${formatDate(end)}` : `Covered until ${formatDate(end)} (${left} day${left === 1 ? '' : 's'} left)`}
              </p>
            )}
            <dl className="detail-list">
              <div><dt>Starts</dt><dd>{w.start ? formatDate(w.start) : '—'}</dd></div>
              <div><dt>Length</dt><dd>{w.months ? `${w.months} months` : '—'}</dd></div>
              <div><dt>Ends</dt><dd>{end ? formatDate(end) : '—'}</dd></div>
              <div><dt>Provided by</dt><dd>{w.provider || '—'}</dd></div>
            </dl>
            {w.notes && <p className="notes-text muted-notes">{w.notes}</p>}
          </>
        )}
      </Card>
      <Card title="Warranty documents" action={<DocumentAdder defaults={{ itemIds: [item.id], vendorId: item.vendorId, type: 'Warranty' }}>{(open) => <button className="link" onClick={open}><Plus size={15} /> Upload</button>}</DocumentAdder>}>
        <DocumentRows docs={docs} empty="Upload the warranty card or certificate." />
      </Card>
      {editing && <WarrantyForm item={item} onClose={() => setEditing(false)} />}
    </div>
  );
}
