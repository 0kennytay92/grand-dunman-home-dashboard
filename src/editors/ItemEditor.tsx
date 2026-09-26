import { useState } from 'react';
import { newId, todayIso, useRoomName, useStore } from '../data/store';
import { amountStatuses, blankItem, deliveryStatuses, findVendorByName, installationStatuses, withAmount } from '../data/budget';
import type { AmountStatus, DeliveryStatus, InstallationStatus, PurchaseItem } from '../data/types';
import { money } from '../format';
import { DateInput, EditorModal, FieldRow, NumberInput, SelectInput, TextArea, TextInput, numText, toNumber } from '../components/forms';

const NEW_VENDOR = '__new__';

/** Checks a total amount typed in. Empty = TBD (null). Returns an error message or the amount. */
export function readAmount(text: string): { amount: number | null } | { error: string } {
  const n = toNumber(text);
  if (n === undefined) return { amount: null };
  if (Number.isNaN(n) || n < 0) return { error: 'Enter an amount, e.g. 2950 – or leave empty for TBD' };
  return { amount: Math.round(n * 100) / 100 };
}

/** Add or edit an item (something being bought or built). */
export function ItemEditor({
  item,
  defaults,
  onClose,
  onSaved,
  onDeleted,
}: {
  item?: PurchaseItem;
  defaults?: { roomId?: string; vendorId?: string };
  onClose: () => void;
  onSaved?: (id: string) => void;
  onDeleted?: () => void;
}) {
  const { data, upsert, remove, notify } = useStore();
  const roomName = useRoomName();
  const base = item ?? blankItem(newId(), todayIso());
  const [name, setName] = useState(base.name);
  const [vendorId, setVendorId] = useState(item ? (item.vendorId ?? '') : (defaults?.vendorId ?? ''));
  const [newVendor, setNewVendor] = useState('');
  const [roomId, setRoomId] = useState(item ? (item.roomId ?? '') : (defaults?.roomId ?? ''));
  const [categoryId, setCategoryId] = useState(base.categoryId ?? '');
  const [quantity, setQuantity] = useState(numText(base.quantity));
  const [description, setDescription] = useState(base.description ?? '');
  const [amount, setAmount] = useState(base.totalAmount === null ? '' : numText(base.totalAmount));
  const [amountStatus, setAmountStatus] = useState<AmountStatus>(base.amountStatus);
  const [reason, setReason] = useState('');
  const [brand, setBrand] = useState(base.brand ?? '');
  const [model, setModel] = useState(base.model ?? '');
  const [sku, setSku] = useState(base.sku ?? '');
  const [dimensions, setDimensions] = useState(base.dimensions ?? '');
  const [material, setMaterial] = useState(base.material ?? '');
  const [colour, setColour] = useState(base.colour ?? '');
  const [finish, setFinish] = useState(base.finish ?? '');
  const [url, setUrl] = useState(base.url ?? '');
  const [notes, setNotes] = useState(base.notes ?? '');
  const [orderDate, setOrderDate] = useState(base.orderDate ?? '');
  const [deliveryStatus, setDeliveryStatus] = useState<DeliveryStatus>(base.deliveryStatus);
  const [expectedDelivery, setExpectedDelivery] = useState(base.expectedDelivery ?? '');
  const [actualDelivery, setActualDelivery] = useState(base.actualDelivery ?? '');
  const [installationStatus, setInstallationStatus] = useState<InstallationStatus>(base.installationStatus);
  const [expectedInstallation, setExpectedInstallation] = useState(base.expectedInstallation ?? '');
  const [actualInstallation, setActualInstallation] = useState(base.actualInstallation ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const parsed = readAmount(amount);
  const amountChanged = !!item && 'amount' in parsed && (parsed.amount !== item.totalAmount || amountStatus !== item.amountStatus);
  const hasDetails = !!(base.brand || base.model || base.sku || base.dimensions || base.material || base.colour || base.finish || base.url || base.notes);

  const save = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'What is this item?';
    if ('error' in parsed) e.amount = parsed.error;
    const qty = toNumber(quantity);
    if (qty !== undefined && (Number.isNaN(qty) || qty <= 0)) e.quantity = 'Enter a number, e.g. 2';
    if (vendorId === NEW_VENDOR && !newVendor.trim()) e.vendor = "Type the new vendor's name";
    if (url.trim() && !/^https?:\/\//i.test(url.trim()) && !/^[\w-]+(\.[\w-]+)+/.test(url.trim())) e.url = 'Paste the full web address, e.g. https://…';
    setErrors(e);
    if (Object.keys(e).length || 'error' in parsed) return;

    // A new vendor is created (or an existing one with the same name reused).
    let vId = vendorId || undefined;
    if (vendorId === NEW_VENDOR) {
      const existing = findVendorByName(data.vendors, newVendor);
      if (existing) vId = existing.id;
      else {
        vId = newId();
        upsert('vendors', { id: vId, name: newVendor.trim() });
      }
    }

    const cleanUrl = url.trim() && !/^https?:\/\//i.test(url.trim()) ? `https://${url.trim()}` : url.trim();
    const opt = (s: string) => s.trim() || undefined;
    const next: PurchaseItem = {
      ...base,
      name: name.trim(),
      vendorId: vId,
      roomId: roomId || undefined,
      categoryId: categoryId || undefined,
      quantity: qty,
      description: opt(description),
      brand: opt(brand), model: opt(model), sku: opt(sku), dimensions: opt(dimensions),
      material: opt(material), colour: opt(colour), finish: opt(finish), url: cleanUrl || undefined, notes: opt(notes),
      orderDate: orderDate || undefined,
      deliveryStatus, expectedDelivery: expectedDelivery || undefined, actualDelivery: actualDelivery || undefined,
      installationStatus, expectedInstallation: expectedInstallation || undefined, actualInstallation: actualInstallation || undefined,
    };
    const saved = item ? withAmount(next, parsed.amount, amountStatus, reason, todayIso()) : { ...next, totalAmount: parsed.amount, amountStatus };
    upsert('purchases', saved);
    notify(item ? 'Item updated' : 'Item added');
    onClose();
    onSaved?.(saved.id);
  };

  const del = () => {
    if (!item) return;
    const n = data.payments.filter((p) => p.itemId === item.id).length;
    const extra = n ? `\n\nIts ${n} payment${n > 1 ? 's are' : ' is'} kept (money records are never deleted with an item) and will show as "not linked to an item".` : '';
    if (!window.confirm(`Delete "${item.name}"?${extra}`)) return;
    remove('purchases', item.id);
    notify('Item deleted');
    onClose();
    onDeleted?.();
  };

  const vendors = [...data.vendors].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <EditorModal title={item ? 'Edit item' : 'Add item'} onClose={onClose} onSave={save} onDelete={item ? del : undefined}>
      <TextInput label="Item name" value={name} onChange={setName} error={errors.name} placeholder="e.g. Dining table" autoFocus={!item} />

      <SelectInput
        label="Vendor"
        value={vendorId}
        onChange={setVendorId}
        error={vendorId === NEW_VENDOR ? undefined : errors.vendor}
        options={[{ value: '', label: 'No vendor yet' }, ...vendors.map((v) => ({ value: v.id, label: v.name })), { value: NEW_VENDOR, label: '+ Add a new vendor…' }]}
      />
      {vendorId === NEW_VENDOR && <TextInput label="New vendor's name" value={newVendor} onChange={setNewVendor} error={errors.vendor} placeholder="e.g. Oak & Stone Carpentry" autoFocus />}

      <FieldRow>
        <SelectInput label="Room" value={roomId} onChange={setRoomId} options={[{ value: '', label: 'Whole home' }, ...data.rooms.map((r) => ({ value: r.id, label: roomName(r.id) }))]} />
        <SelectInput label="Category" value={categoryId} onChange={setCategoryId} options={[{ value: '', label: 'No category' }, ...data.budgetCategories.map((c) => ({ value: c.id, label: c.name }))]} />
      </FieldRow>

      <FieldRow>
        <NumberInput label="Total amount" value={amount} onChange={setAmount} suffix="S$" error={errors.amount} hint={amount.trim() === '' ? 'Empty = TBD (not known yet)' : undefined} />
        <SelectInput label="Amount is" value={amountStatus} onChange={(v) => setAmountStatus(v as AmountStatus)} options={amountStatuses.map((s) => ({ value: s, label: s === 'Estimated' ? 'Estimated (a guess)' : 'Confirmed (agreed)' }))} />
      </FieldRow>
      {amountChanged && (
        <TextInput
          label="Why did the amount change? (optional)"
          value={reason}
          onChange={setReason}
          placeholder="e.g. Final quotation received"
          hint={`Was ${item!.totalAmount === null ? 'TBD' : money(item!.totalAmount)} (${item!.amountStatus.toLowerCase()}). The change is kept in the item's history.`}
        />
      )}

      <FieldRow>
        <NumberInput label="Quantity" value={quantity} onChange={setQuantity} error={errors.quantity} step="1" />
        <DateInput label="Order date" value={orderDate} onChange={setOrderDate} />
      </FieldRow>
      <TextArea label="Description" value={description} onChange={setDescription} placeholder="e.g. Solid oak top, matt black legs" />

      <details className="form-section" open={hasDetails}>
        <summary>Product details</summary>
        <FieldRow>
          <TextInput label="Brand" value={brand} onChange={setBrand} />
          <TextInput label="Model" value={model} onChange={setModel} />
        </FieldRow>
        <FieldRow>
          <TextInput label="SKU / product code" value={sku} onChange={setSku} />
          <TextInput label="Dimensions" value={dimensions} onChange={setDimensions} placeholder="e.g. W1800 × D900" />
        </FieldRow>
        <FieldRow>
          <TextInput label="Material" value={material} onChange={setMaterial} />
          <TextInput label="Colour" value={colour} onChange={setColour} />
        </FieldRow>
        <TextInput label="Finish" value={finish} onChange={setFinish} />
        <TextInput label="Product link" value={url} onChange={setUrl} error={errors.url} placeholder="https://…" />
        <TextArea label="Notes" value={notes} onChange={setNotes} />
      </details>

      <details className="form-section" open={!!item && (base.deliveryStatus !== 'Not Ordered' || base.installationStatus !== 'Not Required')}>
        <summary>Delivery & installation</summary>
        <SelectInput label="Delivery status" value={deliveryStatus} onChange={(v) => setDeliveryStatus(v as DeliveryStatus)} options={deliveryStatuses.map((s) => ({ value: s, label: s }))} />
        <FieldRow>
          <DateInput label="Expected delivery" value={expectedDelivery} onChange={setExpectedDelivery} />
          <DateInput label="Actual delivery" value={actualDelivery} onChange={setActualDelivery} />
        </FieldRow>
        <SelectInput label="Installation status" value={installationStatus} onChange={(v) => setInstallationStatus(v as InstallationStatus)} options={installationStatuses.map((s) => ({ value: s, label: s }))} />
        <FieldRow>
          <DateInput label="Expected installation" value={expectedInstallation} onChange={setExpectedInstallation} />
          <DateInput label="Actual installation" value={actualInstallation} onChange={setActualInstallation} />
        </FieldRow>
      </details>
    </EditorModal>
  );
}

/** Quick change of just the total amount, with an optional reason kept in the history. */
export function AmountEditor({ item, onClose }: { item: PurchaseItem; onClose: () => void }) {
  const { upsert, notify } = useStore();
  const [amount, setAmount] = useState(item.totalAmount === null ? '' : numText(item.totalAmount));
  const [status, setStatus] = useState<AmountStatus>(item.amountStatus);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const save = () => {
    const parsed = readAmount(amount);
    if ('error' in parsed) {
      setError(parsed.error);
      return;
    }
    const next = withAmount(item, parsed.amount, status, reason, todayIso());
    if (next !== item) {
      upsert('purchases', next);
      notify(parsed.amount === null ? 'Amount set to TBD' : `Total amount: ${money(parsed.amount)}`);
    }
    onClose();
  };

  return (
    <EditorModal title="Total amount" onClose={onClose} onSave={save}>
      <FieldRow>
        <NumberInput label="Total amount" value={amount} onChange={setAmount} suffix="S$" error={error} hint={amount.trim() === '' ? 'Empty = TBD (not known yet)' : undefined} />
        <SelectInput label="Amount is" value={status} onChange={(v) => setStatus(v as AmountStatus)} options={amountStatuses.map((s) => ({ value: s, label: s === 'Estimated' ? 'Estimated (a guess)' : 'Confirmed (agreed)' }))} />
      </FieldRow>
      <TextInput label="Why did it change? (optional)" value={reason} onChange={setReason} placeholder="e.g. Final quotation received" hint={`Now ${item.totalAmount === null ? 'TBD' : money(item.totalAmount)} (${item.amountStatus.toLowerCase()}). Paid and remaining update automatically.`} />
    </EditorModal>
  );
}
