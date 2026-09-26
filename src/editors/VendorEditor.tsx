import { useState } from 'react';
import { newId, useStore } from '../data/store';
import { findVendorByName } from '../data/budget';
import type { Vendor } from '../data/types';
import { EditorModal, FieldRow, TextArea, TextInput } from '../components/forms';

export function VendorEditor({ vendor, onClose, onDeleted }: { vendor?: Vendor; onClose: () => void; onDeleted?: () => void }) {
  const { data, upsert, remove, notify } = useStore();
  const [f, setF] = useState<Omit<Vendor, 'id'>>({
    name: vendor?.name ?? '', contactPerson: vendor?.contactPerson ?? '', mobile: vendor?.mobile ?? '', whatsapp: vendor?.whatsapp ?? '',
    email: vendor?.email ?? '', website: vendor?.website ?? '', address: vendor?.address ?? '', uen: vendor?.uen ?? '', notes: vendor?.notes ?? '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const field = (k: keyof typeof f) => ({ value: f[k] ?? '', onChange: (v: string) => setF((x) => ({ ...x, [k]: v })) });

  const save = () => {
    const e: Record<string, string> = {};
    if (!f.name.trim()) e.name = "Please enter the vendor's name.";
    const same = findVendorByName(data.vendors, f.name);
    if (same && same.id !== vendor?.id) e.name = `"${same.name}" is already in your vendors.`;
    if (f.email?.trim() && !/^\S+@\S+\.\S+$/.test(f.email.trim())) e.email = 'That email address looks incomplete.';
    setErrors(e);
    if (Object.keys(e).length) return;
    const clean = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, typeof v === 'string' ? v.trim() || undefined : v]));
    upsert('vendors', { ...(vendor ?? {}), ...clean, id: vendor?.id ?? newId(), name: f.name.trim() });
    notify(vendor ? 'Vendor updated' : 'Vendor added');
    onClose();
  };

  const del = () => {
    if (!vendor) return;
    const items = data.purchases.filter((i) => i.vendorId === vendor.id).length;
    const payments = data.payments.filter((p) => p.vendorId === vendor.id).length;
    if (items || payments) {
      window.alert(`"${vendor.name}" has ${[items && `${items} item${items > 1 ? 's' : ''}`, payments && `${payments} payment${payments > 1 ? 's' : ''}`].filter(Boolean).join(' and ')}. Change their vendor or delete them first.`);
      return;
    }
    if (!window.confirm(`Delete "${vendor.name}"?`)) return;
    remove('vendors', vendor.id);
    notify('Vendor deleted');
    onClose();
    onDeleted?.();
  };

  return (
    <EditorModal title={vendor ? 'Edit vendor' : 'Add vendor'} onClose={onClose} onSave={save} onDelete={vendor ? del : undefined}>
      <TextInput label="Vendor name" {...field('name')} error={errors.name} placeholder="e.g. Oak & Stone Carpentry" autoFocus={!vendor} />
      <TextInput label="Contact person" {...field('contactPerson')} />
      <FieldRow>
        <TextInput label="Mobile" {...field('mobile')} placeholder="+65 …" />
        <TextInput label="WhatsApp" {...field('whatsapp')} placeholder="+65 … (if different)" />
      </FieldRow>
      <TextInput label="Email" {...field('email')} error={errors.email} />
      <TextInput label="Website" {...field('website')} placeholder="https://…" />
      <TextInput label="Address" {...field('address')} />
      <TextInput label="UEN (company registration no.)" {...field('uen')} />
      <TextArea label="Notes" {...field('notes')} />
    </EditorModal>
  );
}
