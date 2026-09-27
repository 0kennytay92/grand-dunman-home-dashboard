import { useState, type ReactNode } from 'react';
import { ChevronLeft, Download, ExternalLink, FileText, Pencil } from 'lucide-react';
import { useImageUrl } from '../../data/images';
import { useStore } from '../../data/store';
import { documentTypes, fileSize } from '../../data/budget';
import type { DocumentFile, DocumentType } from '../../data/types';
import { formatDate, money } from '../../format';
import { DocumentForm } from '../../editors/DocumentForm';
import { Badge, Card, Chips, EmptyState } from '../../components/ui';
import { budgetHref, documentHref, itemHref, vendorHref } from './links';

const typeTone = (t: DocumentType) =>
  t === 'Invoice' ? 'accent' : t === 'Receipt' || t === 'Proof of Payment' ? 'good' : t === 'Quotation' || t === 'Contract' || t === 'Purchase Order' ? 'info' : 'neutral';

/** A small preview: the picture's thumbnail, or a file icon. */
export function DocThumb({ doc }: { doc: DocumentFile }) {
  const url = useImageUrl(doc.id, 'thumb', !!doc.hasThumb);
  return (
    <span className="doc-thumb">
      {url ? <img src={url} alt="" loading="lazy" /> : <><FileText size={20} strokeWidth={1.6} /><small>{doc.mimeType === 'application/pdf' ? 'PDF' : doc.fileName.split('.').pop()?.slice(0, 4).toUpperCase()}</small></>}
    </span>
  );
}

export function DocumentRows({ docs, empty = 'No documents yet.' }: { docs: DocumentFile[]; empty?: string }) {
  const { data } = useStore();
  if (!docs.length) return <EmptyState>{empty}</EmptyState>;
  const vendorName = (id?: string) => data.vendors.find((v) => v.id === id)?.name;
  return (
    <ul className="list">
      {[...docs].sort((a, b) => b.date.localeCompare(a.date) || b.addedAt.localeCompare(a.addedAt)).map((d) => (
        <li key={d.id}>
          <a className="list-row" href={documentHref(d.id)}>
            <DocThumb doc={d} />
            <div className="grow">
              <p className="row-title">{d.title}</p>
              <p className="row-sub">{[vendorName(d.vendorId), d.number, formatDate(d.date)].filter(Boolean).join(' · ')}</p>
            </div>
            <div className="pay-amount">
              <Badge tone={typeTone(d.type)}>{d.type}</Badge>
              {d.amount !== undefined && <span className="row-meta">{money(d.amount)}</span>}
            </div>
          </a>
        </li>
      ))}
    </ul>
  );
}

/** All documents, filterable by type (Budget page). */
export function DocumentsCard({ action }: { action?: ReactNode }) {
  const { documents } = useStore().data;
  const used = documentTypes.filter((t) => documents.some((d) => d.type === t));
  const [type, setType] = useState<'All' | DocumentType>('All');
  const [all, setAll] = useState(false);
  const shown = documents.filter((d) => type === 'All' || d.type === type);
  const sorted = [...shown].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <Card title="Documents" action={action}>
      {used.length > 1 && <Chips options={['All', ...used] as const} value={type} onChange={(v) => { setType(v); setAll(false); }} />}
      <DocumentRows docs={all ? sorted : sorted.slice(0, 6)} empty='No documents yet. Upload quotations, invoices and receipts – PDFs or photos.' />
      {sorted.length > 6 && !all && <button className="text-btn" onClick={() => setAll(true)}>Show all {sorted.length}</button>}
    </Card>
  );
}

/** One document: the original file, and what it's linked to. */
export function DocumentPage({ docId }: { docId: string }) {
  const { data } = useStore();
  const [editing, setEditing] = useState(false);
  const doc = data.documents.find((d) => d.id === docId);
  const url = useImageUrl(docId, 'original', !!doc);
  const [failed, setFailed] = useState(false);

  if (!doc) {
    return (
      <>
        <a className="back" href={budgetHref()}><ChevronLeft size={18} /> Renovation Budget</a>
        <EmptyState>This document could not be found. It may have been deleted.</EmptyState>
      </>
    );
  }
  const items = data.purchases.filter((i) => doc.itemIds.includes(i.id));
  const payments = data.payments.filter((p) => doc.paymentIds.includes(p.id));
  const vendor = data.vendors.find((v) => v.id === doc.vendorId);
  const isPdf = doc.mimeType === 'application/pdf';
  const isImage = doc.mimeType.startsWith('image/');
  const back = items.length === 1 ? { href: itemHref(items[0].id, 'documents'), label: items[0].name } : { href: budgetHref(), label: 'Renovation Budget' };

  return (
    <>
      <a className="back" href={back.href}><ChevronLeft size={18} /> {back.label}</a>
      <header className="page-header">
        <div>
          <p className="eyebrow">{doc.type}</p>
          <h1>{doc.title}</h1>
          <p className="subtitle">{[vendor?.name, doc.number, formatDate(doc.date), doc.amount !== undefined && money(doc.amount)].filter(Boolean).join(' · ')}</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-ghost" onClick={() => setEditing(true)}><Pencil size={15} /> Edit</button>
          {url && <a className="btn btn-ghost" href={url} target="_blank" rel="noopener noreferrer"><ExternalLink size={15} /> Open</a>}
          {url && <a className="btn btn-primary" href={url} download={doc.fileName}><Download size={16} /> Download original</a>}
        </div>
      </header>

      <div className="doc-layout">
        <div className="doc-preview">
          {!url ? (
            <p className="empty">{failed ? 'The file is not on this device.' : 'Loading…'}</p>
          ) : isImage ? (
            <img src={url} alt={doc.title} onError={() => setFailed(true)} />
          ) : isPdf ? (
            <iframe src={url} title={doc.title} />
          ) : (
            <p className="empty">No preview for this kind of file – use Open or Download.</p>
          )}
        </div>
        <div className="stack">
          <Card title="Linked to">
            <dl className="detail-list one">
              <div><dt>Vendor</dt><dd>{vendor ? <a className="link inline-link" href={vendorHref(vendor.id)}>{vendor.name}</a> : '—'}</dd></div>
              <div>
                <dt>Items</dt>
                <dd>{items.length ? items.map((i, n) => <span key={i.id}>{n > 0 && ', '}<a className="link inline-link" href={itemHref(i.id, 'documents')}>{i.name}</a></span>) : '—'}</dd>
              </div>
              {(doc.relatesTo || doc.issueIds?.length) && (
                <div>
                  <dt>About</dt>
                  <dd>{[doc.relatesTo && `The ${doc.relatesTo.toLowerCase()}`, ...data.issues.filter((x) => doc.issueIds?.includes(x.id)).map((x) => `Issue: ${x.title}`)].filter(Boolean).join(', ')}</dd>
                </div>
              )}
              <div>
                <dt>Payments</dt>
                <dd>{payments.length ? payments.map((p) => `${money(p.amount)} ${p.type.toLowerCase()} (${formatDate(p.date)})`).join(', ') : '—'}</dd>
              </div>
            </dl>
          </Card>
          <Card title="File">
            <dl className="detail-list one">
              <div><dt>Original file</dt><dd>{doc.fileName}</dd></div>
              <div><dt>Size</dt><dd>{fileSize(doc.sizeBytes)}</dd></div>
              <div><dt>Added</dt><dd>{formatDate(doc.addedAt.slice(0, 10))}</dd></div>
            </dl>
            {doc.notes && <p className="notes-text muted-notes">{doc.notes}</p>}
            <p className="card-text muted">Private: only people in your home can open it.</p>
          </Card>
        </div>
      </div>

      {editing && <DocumentForm doc={doc} onClose={() => setEditing(false)} onDeleted={() => (window.location.hash = back.href.slice(1))} />}
    </>
  );
}
