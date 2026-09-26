import { useRef, useState, type ReactNode } from 'react';
import { newId, todayIso, useRoomName, useStore } from '../data/store';
import { blankItem, findCategory, findVendorByName, normName, slug } from '../data/budget';
import type { AmountStatus, AppData, BudgetCategory, PurchaseItem, Vendor } from '../data/types';
import { money } from '../format';
import { EditorModal } from '../components/forms';
import { Badge } from '../components/ui';

// ─────────────────────────────────────────────────────────────
// IMPORTING ITEMS FROM A FILE
// A small .json file lists items (name, vendor, room, category,
// amount…). Items already in the app are recognised and skipped,
// so importing the same file twice never creates duplicates.
// ─────────────────────────────────────────────────────────────

export const ITEMS_FILE_KIND = 'grand-dunman-home/budget-items';

interface FileItem {
  name: string;
  vendor?: string;
  room?: string; // room id or name; empty = whole home
  category?: string;
  amount?: number | null; // null or missing = TBD
  amountStatus?: AmountStatus;
  description?: string;
  dimensions?: string;
  quantity?: number;
  notes?: string;
}

interface Row {
  src: FileItem;
  existing?: PurchaseItem;
  roomId?: string;
  roomMissing: boolean;
}

function readFile(text: string): FileItem[] {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('This file is not a valid items file.');
  }
  const obj = raw as { kind?: string; items?: unknown };
  if (obj?.kind !== ITEMS_FILE_KIND || !Array.isArray(obj.items)) throw new Error('This file is not a Grand Dunman Home items file.');
  return obj.items.filter((x): x is FileItem => !!x && typeof (x as FileItem).name === 'string' && !!(x as FileItem).name.trim());
}

/** An item already in the app with the same name (and the same vendor, when both have one). */
function findExisting(data: AppData, src: FileItem) {
  const vendor = src.vendor ? findVendorByName(data.vendors, src.vendor) : undefined;
  return data.purchases.find((i) => normName(i.name) === normName(src.name) && (!src.vendor || !i.vendorId || !vendor || i.vendorId === vendor.id));
}

function findRoom(data: AppData, room?: string) {
  if (!room?.trim()) return undefined;
  const n = normName(room);
  return data.rooms.find((r) => r.id === room || normName(r.name) === n || (r.includes && normName(`${r.name} ${r.includes}`) === n));
}

/** Wraps an "Import items" button. */
export function ItemImport({ children }: { children: (open: () => void) => ReactNode }) {
  const { data } = useStore();
  const input = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Row[] | null>(null);

  return (
    <>
      {children(() => input.current?.click())}
      <input
        ref={input}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (!file) return;
          try {
            const items = readFile(await file.text());
            if (!items.length) throw new Error('This file has no items in it.');
            setRows(items.map((src) => {
              const room = findRoom(data, src.room);
              return { src, existing: findExisting(data, src), roomId: room?.id, roomMissing: !!src.room?.trim() && !room };
            }));
          } catch (err) {
            window.alert((err as Error).message);
          }
        }}
      />
      {rows && <ImportPreview rows={rows} onClose={() => setRows(null)} />}
    </>
  );
}

function ImportPreview({ rows, onClose }: { rows: Row[]; onClose: () => void }) {
  const { update, notify } = useStore();
  const roomName = useRoomName();
  const fresh = rows.filter((r) => !r.existing);

  const run = () => {
    if (!fresh.length) return onClose();
    update((d) => {
      const vendors: Vendor[] = [...d.vendors];
      const categories: BudgetCategory[] = [...d.budgetCategories];
      const purchases: PurchaseItem[] = [...d.purchases];
      for (const { src, roomId } of fresh) {
        if (findExisting({ ...d, vendors, purchases }, src)) continue; // appeared since the preview
        let vendorId: string | undefined;
        const vendorText = src.vendor?.trim();
        if (vendorText) {
          let v = findVendorByName(vendors, vendorText);
          if (!v) {
            const fixed = `vendor-${slug(vendorText)}`;
            v = { id: vendors.some((x) => x.id === fixed) ? newId() : fixed, name: vendorText };
            vendors.push(v);
          }
          vendorId = v.id;
        }
        let categoryId: string | undefined;
        if (src.category?.trim()) {
          let c = findCategory(categories, src.category);
          if (!c) {
            c = { id: newId(), name: src.category.trim(), budget: 0 };
            categories.push(c);
          }
          categoryId = c.id;
        }
        const amount = typeof src.amount === 'number' && src.amount >= 0 ? src.amount : null;
        // A fixed id, so importing on two devices at once still gives one item each.
        const fixedId = `item-${slug(src.vendor ?? '')}-${slug(src.name)}`;
        purchases.push({
          ...blankItem(purchases.some((x) => x.id === fixedId) ? newId() : fixedId, todayIso()),
          name: src.name.trim(),
          vendorId,
          roomId,
          categoryId,
          totalAmount: amount,
          amountStatus: amount === null ? 'Estimated' : (src.amountStatus ?? 'Estimated'),
          description: src.description?.trim() || undefined,
          dimensions: src.dimensions?.trim() || undefined,
          quantity: typeof src.quantity === 'number' && src.quantity > 0 ? src.quantity : undefined,
          notes: src.notes?.trim() || undefined,
        });
      }
      return { ...d, vendors, budgetCategories: categories, purchases };
    });
    notify(`${fresh.length} item${fresh.length === 1 ? '' : 's'} imported`);
    onClose();
  };

  return (
    <EditorModal title="Import items" onClose={onClose} onSave={run} saveLabel={fresh.length ? `Import ${fresh.length} item${fresh.length === 1 ? '' : 's'}` : 'Close'}>
      <p className="card-text">
        {fresh.length} new item{fresh.length === 1 ? '' : 's'} to add
        {rows.length > fresh.length ? `, ${rows.length - fresh.length} already in the app (skipped, so nothing is doubled up)` : ''}.
        Nothing is marked as paid – you add payments yourself.
      </p>
      <ul className="list import-items">
        {rows.map((r, i) => (
          <li key={i} className={`list-row ${r.existing ? 'is-skipped' : ''}`}>
            <div className="grow">
              <p className="row-title">{r.src.name}</p>
              <p className="row-sub">
                {[r.src.vendor, r.roomMissing ? `Room "${r.src.room}" not found – whole home` : roomName(r.roomId), r.src.category].filter(Boolean).join(' · ')}
              </p>
            </div>
            <div className="pay-amount">
              <span className="row-amount">{typeof r.src.amount === 'number' ? money(r.src.amount) : <span className="tbd">TBD</span>}</span>
              {r.existing ? <Badge>Already added</Badge> : <Badge tone="good">New</Badge>}
            </div>
          </li>
        ))}
      </ul>
    </EditorModal>
  );
}
