import { useState } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { newId, todayIso, useStore } from '../data/store';
import { addMonths, deliveryConditions, installationConditions, issueStatuses, messageChannels } from '../data/budget';
import type { InspectionCondition, Issue, IssueStatus, MessageChannel, PurchaseItem, VendorMessage } from '../data/types';
import { formatDate } from '../format';
import { DateInput, EditorModal, Field, FieldRow, NumberInput, SelectInput, TextArea, TextInput, numText, toNumber } from '../components/forms';
import { PhotoPicks, usePhotoPicks } from '../components/PhotoPicks';

// ─────────────────────────────────────────────────────────────
// DELIVERY, INSTALLATION, ISSUES, MESSAGES AND WARRANTY
// ─────────────────────────────────────────────────────────────

type Stage = 'delivery' | 'installation';

const conditionLabel: Record<InspectionCondition, string> = {
  Good: 'Good',
  'Minor Issue': 'Minor issue',
  Damaged: 'Damaged',
  'Wrong Item': 'Wrong item',
  'Incomplete Delivery': 'Incomplete',
  'Not Installed Correctly': 'Not installed correctly',
  'Incomplete Installation': 'Incomplete',
};

/**
 * MARK DELIVERED / MARK INSTALLED: date → photos → condition → accept, or report an issue.
 * Built for a phone: big buttons, one screen.
 */
export function InspectionForm({ item, stage, onClose }: { item: PurchaseItem; stage: Stage; onClose: () => void }) {
  const { upsert, getData, notify } = useStore();
  const existing = stage === 'delivery' ? item.deliveryInspection : item.installationInspection;
  const [date, setDate] = useState(existing?.date ?? (stage === 'delivery' ? item.actualDelivery : item.actualInstallation) ?? todayIso());
  const [condition, setCondition] = useState<InspectionCondition | null>(existing?.condition ?? null);
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const picks = usePhotoPicks(existing?.photoIds ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const conditions = stage === 'delivery' ? deliveryConditions : installationConditions;
  const serious = !!condition && condition !== 'Good' && condition !== 'Minor Issue';
  const word = stage === 'delivery' ? 'delivery' : 'installation';

  const finish = async (accept: boolean) => {
    if (busy) return;
    if (!condition) return setError(`How did the ${word} go? Choose one of the options above.`);
    if (!date) return setError('Pick the date.');
    setBusy(true);
    const photoIds = await picks.commit();
    const latest = getData().purchases.find((i) => i.id === item.id) ?? item;
    let issueId: string | undefined;
    if (!accept) {
      issueId = newId();
      const issue: Issue = {
        id: issueId, itemId: item.id, kind: stage === 'delivery' ? 'Delivery' : 'Installation', condition,
        title: condition === 'Good' ? `Problem with ${word}` : `${conditionLabel[condition]} on ${word}`,
        description: notes.trim() || undefined, status: 'Open', reportedDate: date, photoIds: [],
      };
      upsert('issues', issue);
    }
    const inspection = { date, condition, accepted: accept, notes: notes.trim() || undefined, photoIds, issueId };
    if (stage === 'delivery') {
      upsert('purchases', {
        ...latest, deliveryInspection: inspection, actualDelivery: date,
        deliveryStatus: accept ? 'Delivered' : condition === 'Incomplete Delivery' ? 'Partially Delivered' : 'Delivery Issue',
      });
    } else {
      upsert('purchases', { ...latest, installationInspection: inspection, actualInstallation: date, installationStatus: accept ? 'Completed' : 'Installation Issue' });
    }
    setBusy(false);
    notify(accept ? (stage === 'delivery' ? 'Delivery accepted' : 'Installation accepted') : 'Issue reported');
    onClose();
  };

  return (
    <EditorModal
      title={stage === 'delivery' ? `Mark delivered: ${item.name}` : `Mark installed: ${item.name}`}
      onClose={busy ? () => {} : onClose}
      onSave={() => finish(!serious)}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <span className="grow" />
          <button type="button" className="btn btn-danger" onClick={() => finish(false)} disabled={busy}><AlertTriangle size={16} /> Report issue</button>
          <button type="button" className="btn btn-primary" onClick={() => finish(true)} disabled={busy || serious} title={serious ? 'Report an issue instead' : undefined}>
            <CheckCircle2 size={16} /> {busy ? 'Saving…' : 'Accept'}
          </button>
        </>
      }
    >
      <DateInput label={stage === 'delivery' ? 'Delivered on' : 'Installed on'} value={date} onChange={setDate} />
      <Field label="Photos" hint={`Take photos of the ${word} (the item, labels, any damage).`}>{() => <PhotoPicks picks={picks} label="Take photo" />}</Field>
      <Field label={`How was the ${word}?`}>
        {() => (
          <div className="condition-grid" role="radiogroup">
            {conditions.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={condition === c}
                className={`condition ${condition === c ? 'on' : ''} ${c === 'Good' ? 'c-good' : c === 'Minor Issue' ? 'c-minor' : 'c-bad'}`}
                onClick={() => { setCondition(c); setError(''); }}
              >
                {conditionLabel[c]}
              </button>
            ))}
          </div>
        )}
      </Field>
      <TextArea label="Notes" value={notes} onChange={setNotes} placeholder={serious ? 'What is wrong? e.g. scratch on the left leg' : 'Anything to remember'} />
      {serious && <p className="banner-info">This needs an issue report – tap <strong>Report issue</strong>. You can track it until the vendor fixes it.</p>}
      {error && <p className="field-msg">{error}</p>}
    </EditorModal>
  );
}

/** Report or update an issue (defect). Resolving the last open one puts the item's status back. */
export function IssueForm({ issue, itemId, defaultKind = 'Other', onClose }: { issue?: Issue; itemId?: string; defaultKind?: Issue['kind']; onClose: () => void }) {
  const { data, upsert, remove, getData, notify } = useStore();
  const [item, setItem] = useState(issue?.itemId ?? itemId ?? '');
  const [title, setTitle] = useState(issue?.title ?? '');
  const [kind, setKind] = useState<Issue['kind']>(issue?.kind ?? defaultKind);
  const [status, setStatus] = useState<IssueStatus>(issue?.status ?? 'Open');
  const [reportedDate, setReportedDate] = useState(issue?.reportedDate ?? todayIso());
  const [fixDate, setFixDate] = useState(issue?.fixDate ?? '');
  const [description, setDescription] = useState(issue?.description ?? '');
  const [notes, setNotes] = useState(issue?.notes ?? '');
  const picks = usePhotoPicks(issue?.photoIds ?? []);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const items = [...data.purchases].sort((a, b) => a.name.localeCompare(b.name));

  const save = async () => {
    if (busy) return;
    const e: Record<string, string> = {};
    if (!item) e.item = 'Which item has the problem?';
    if (!title.trim()) e.title = 'Describe the problem in a few words, e.g. "Scratch on table top"';
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    const photoIds = await picks.commit();
    const wasResolved = issue?.status === 'Resolved';
    const next: Issue = {
      ...(issue ?? {}),
      id: issue?.id ?? newId(), itemId: item, kind, title: title.trim(), status, reportedDate,
      fixDate: fixDate || undefined, description: description.trim() || undefined, notes: notes.trim() || undefined, photoIds,
      resolvedDate: status === 'Resolved' ? (issue?.resolvedDate ?? todayIso()) : undefined,
    };
    upsert('issues', next);
    let extra = '';
    // The last open delivery / installation issue resolved: the item is back on track.
    if (status === 'Resolved' && !wasResolved) {
      const others = getData().issues.filter((x) => x.itemId === item && x.id !== next.id && x.kind === kind && x.status !== 'Resolved');
      const it = getData().purchases.find((i) => i.id === item);
      if (it && !others.length) {
        if (kind === 'Delivery' && (it.deliveryStatus === 'Delivery Issue' || it.deliveryStatus === 'Partially Delivered')) {
          upsert('purchases', { ...it, deliveryStatus: 'Delivered' });
          extra = ' · delivery marked as Delivered';
        }
        if (kind === 'Installation' && it.installationStatus === 'Installation Issue') {
          upsert('purchases', { ...it, installationStatus: 'Completed' });
          extra = ' · installation marked as Completed';
        }
      }
    }
    setBusy(false);
    notify((issue ? (status === 'Resolved' && !wasResolved ? 'Issue resolved' : 'Issue updated') : 'Issue reported') + extra);
    onClose();
  };

  const del = () => {
    if (!issue || !window.confirm(`Delete the issue "${issue.title}"?`)) return;
    remove('issues', issue.id);
    notify('Issue deleted');
    onClose();
  };

  return (
    <EditorModal title={issue ? 'Issue' : 'Report issue'} onClose={busy ? () => {} : onClose} onSave={save} onDelete={issue ? del : undefined} saveLabel={busy ? 'Saving…' : 'Save'}>
      {!itemId || issue ? (
        <SelectInput label="Item" value={item} onChange={setItem} error={errors.item} options={[{ value: '', label: 'Choose an item…' }, ...items.map((i) => ({ value: i.id, label: i.name }))]} />
      ) : null}
      <TextInput label="What's wrong?" value={title} onChange={setTitle} error={errors.title} placeholder="e.g. Scratch on table top" autoFocus={!issue} />
      <FieldRow>
        <SelectInput label="Found during" value={kind} onChange={(v) => setKind(v as Issue['kind'])} options={[{ value: 'Delivery', label: 'Delivery' }, { value: 'Installation', label: 'Installation' }, { value: 'Other', label: 'Later / other' }]} />
        <SelectInput label="Status" value={status} onChange={(v) => setStatus(v as IssueStatus)} options={issueStatuses.map((s) => ({ value: s, label: s }))} />
      </FieldRow>
      <FieldRow>
        <DateInput label="Reported on" value={reportedDate} onChange={setReportedDate} />
        <DateInput label="Fix date (if booked)" value={fixDate} onChange={setFixDate} />
      </FieldRow>
      <Field label="Photos">{() => <PhotoPicks picks={picks} label="Take photo" />}</Field>
      <TextArea label="Details" value={description} onChange={setDescription} placeholder="Where exactly, how big, what the vendor said…" />
      <TextArea label="Notes" value={notes} onChange={setNotes} />
      {issue?.resolvedDate && <p className="field-hint">Resolved on {formatDate(issue.resolvedDate)}</p>}
    </EditorModal>
  );
}

/** Log a conversation with a vendor: text and/or screenshots. */
export function MessageForm({ message, vendorId, itemId, onClose }: { message?: VendorMessage; vendorId?: string; itemId?: string; onClose: () => void }) {
  const { data, upsert, remove, notify } = useStore();
  const defaultVendor = message?.vendorId ?? vendorId ?? data.purchases.find((i) => i.id === itemId)?.vendorId ?? '';
  const [vendor, setVendor] = useState(defaultVendor);
  const [itemIds, setItemIds] = useState<string[]>(message?.itemIds ?? (itemId ? [itemId] : []));
  const [date, setDate] = useState(message?.date ?? todayIso());
  const [channel, setChannel] = useState<MessageChannel>(message?.channel ?? 'WhatsApp');
  const [direction, setDirection] = useState<VendorMessage['direction']>(message?.direction ?? 'From Vendor');
  const [text, setText] = useState(message?.text ?? '');
  const picks = usePhotoPicks(message?.photoIds ?? []);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const vendorItems = data.purchases.filter((i) => i.vendorId === vendor || itemIds.includes(i.id)).sort((a, b) => a.name.localeCompare(b.name));

  const save = async () => {
    if (busy) return;
    const e: Record<string, string> = {};
    if (!vendor) e.vendor = 'Which vendor was this with?';
    if (!text.trim() && !picks.count) e.text = 'Type what was said, or add a screenshot.';
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    const photoIds = await picks.commit();
    upsert('messages', { id: message?.id ?? newId(), vendorId: vendor, itemIds, date, channel, direction, text: text.trim(), photoIds });
    setBusy(false);
    notify(message ? 'Message updated' : 'Message saved');
    onClose();
  };

  const del = () => {
    if (!message || !window.confirm('Delete this message?')) return;
    remove('messages', message.id);
    notify('Message deleted');
    onClose();
  };

  return (
    <EditorModal title={message ? 'Message' : 'Add message'} onClose={busy ? () => {} : onClose} onSave={save} onDelete={message ? del : undefined} saveLabel={busy ? 'Saving…' : 'Save'}>
      <SelectInput label="Vendor" value={vendor} onChange={setVendor} error={errors.vendor} options={[{ value: '', label: 'Choose a vendor…' }, ...[...data.vendors].sort((a, b) => a.name.localeCompare(b.name)).map((v) => ({ value: v.id, label: v.name }))]} />
      <FieldRow>
        <SelectInput label="How" value={channel} onChange={(v) => setChannel(v as MessageChannel)} options={messageChannels.map((c) => ({ value: c, label: c }))} />
        <DateInput label="Date" value={date} onChange={setDate} />
      </FieldRow>
      <SelectInput label="Who" value={direction} onChange={(v) => setDirection(v as VendorMessage['direction'])} options={[{ value: 'From Vendor', label: 'From the vendor' }, { value: 'To Vendor', label: 'From us to the vendor' }, { value: 'Note', label: 'Note (e.g. summary of a call)' }]} />
      <TextArea label="What was said" value={text} onChange={setText} placeholder="e.g. Delivery moved to 12 Oct, 2–5pm" />
      {errors.text && <p className="field-msg">{errors.text}</p>}
      <Field label="Screenshots">{() => <PhotoPicks picks={picks} label="Add screenshot" />}</Field>
      {vendorItems.length > 0 && (
        <Field label="About (optional)">
          {() => (
            <div className="checklist">
              <ul>
                {vendorItems.map((i) => (
                  <li key={i.id}>
                    <label className="checkbox-line">
                      <input type="checkbox" checked={itemIds.includes(i.id)} onChange={() => setItemIds((x) => (x.includes(i.id) ? x.filter((y) => y !== i.id) : [...x, i.id]))} />
                      <span>{i.name}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Field>
      )}
    </EditorModal>
  );
}

/** Warranty: start, length, provider. The end date is worked out unless typed in. */
export function WarrantyForm({ item, onClose }: { item: PurchaseItem; onClose: () => void }) {
  const { upsert, notify } = useStore();
  const w = item.warranty ?? {};
  const [start, setStart] = useState(w.start ?? item.actualInstallation ?? item.actualDelivery ?? '');
  const [months, setMonths] = useState(numText(w.months));
  const [end, setEnd] = useState(w.end ?? '');
  const [provider, setProvider] = useState(w.provider ?? '');
  const [notes, setNotes] = useState(w.notes ?? '');
  const [error, setError] = useState('');
  const m = toNumber(months);
  const worked = start && m && !Number.isNaN(m) && m > 0 ? addMonths(start, Math.round(m)) : '';

  const save = () => {
    if (m !== undefined && (Number.isNaN(m) || m <= 0)) return setError('Enter the number of months, e.g. 24');
    const warranty = { start: start || undefined, months: m ? Math.round(m) : undefined, end: end || undefined, provider: provider.trim() || undefined, notes: notes.trim() || undefined };
    const empty = !Object.values(warranty).some(Boolean);
    upsert('purchases', { ...item, warranty: empty ? undefined : warranty });
    notify('Warranty saved');
    onClose();
  };

  return (
    <EditorModal title="Warranty" onClose={onClose} onSave={save}>
      <FieldRow>
        <DateInput label="Starts" value={start} onChange={setStart} />
        <NumberInput label="Length" value={months} onChange={setMonths} suffix="months" error={error} step="1" />
      </FieldRow>
      <DateInput label="Ends (leave empty to work it out)" value={end} onChange={setEnd} />
      {!end && worked && <p className="field-hint">Ends on {formatDate(worked)}</p>}
      <TextInput label="Provided by" value={provider} onChange={setProvider} placeholder="e.g. the vendor, or the brand" />
      <TextArea label="Notes" value={notes} onChange={setNotes} placeholder="What's covered, how to claim…" />
    </EditorModal>
  );
}

/** "Mark delivered" from the Budget page: pick the item first, then inspect it. */
export function QuickDelivered({ onClose }: { onClose: () => void }) {
  const { data } = useStore();
  const [chosen, setChosen] = useState('');
  const [go, setGo] = useState(false);
  const waiting = data.purchases
    .filter((i) => (i.deliveryStatus !== 'Delivered' && i.deliveryStatus !== 'Returned / Exchanged') || !i.deliveryInspection)
    .sort((a, b) => (a.expectedDelivery ?? '9999').localeCompare(b.expectedDelivery ?? '9999') || a.name.localeCompare(b.name));
  const item = data.purchases.find((i) => i.id === chosen);
  if (go && item) return <InspectionForm item={item} stage="delivery" onClose={onClose} />;
  return (
    <EditorModal title="Mark delivered" onClose={onClose} onSave={() => item && setGo(true)} saveLabel="Next">
      <SelectInput
        label="What was delivered?"
        value={chosen}
        onChange={setChosen}
        options={[{ value: '', label: 'Choose an item…' }, ...waiting.map((i) => ({ value: i.id, label: `${i.name}${i.expectedDelivery ? ` – expected ${formatDate(i.expectedDelivery, { day: 'numeric', month: 'short' })}` : ''}` }))]}
      />
      {!waiting.length && <p className="card-text">Everything has been delivered and checked.</p>}
    </EditorModal>
  );
}
