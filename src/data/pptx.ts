import { unzip } from 'fflate';
import type { Room } from './types';

// ─────────────────────────────────────────────────────────────
// POWERPOINT IMPORT
// A .pptx file is a zip of XML files and images. This reads each
// slide's pictures, title, text and speaker notes – entirely on
// this device; nothing is uploaded anywhere.
// ─────────────────────────────────────────────────────────────

export interface SlideImage {
  name: string;
  blob: Blob;
}

export interface SlideInfo {
  number: number; // 1-based, in presentation order
  title: string;
  text: string; // other text on the slide
  notes: string; // speaker notes
  images: SlideImage[]; // largest first
}

const imageTypes: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp' };

function unzipAsync(bytes: Uint8Array) {
  return new Promise<Record<string, Uint8Array>>((resolve, reject) => unzip(bytes, (err, files) => (err ? reject(err) : resolve(files))));
}

const decoder = new TextDecoder();
const read = (files: Record<string, Uint8Array>, path: string) => (files[path] ? decoder.decode(files[path]) : '');

function parseXml(xml: string) {
  return new DOMParser().parseFromString(xml, 'application/xml');
}

/** Relationship id → target path, resolved relative to the part's folder. */
function relationships(files: Record<string, Uint8Array>, partPath: string) {
  const folder = partPath.slice(0, partPath.lastIndexOf('/'));
  const relsPath = `${folder}/_rels/${partPath.slice(partPath.lastIndexOf('/') + 1)}.rels`;
  const map = new Map<string, { target: string; type: string }>();
  const doc = parseXml(read(files, relsPath));
  for (const rel of Array.from(doc.getElementsByTagName('Relationship'))) {
    const target = rel.getAttribute('Target') ?? '';
    if (rel.getAttribute('TargetMode') === 'External') continue;
    map.set(rel.getAttribute('Id') ?? '', { target: resolvePath(folder, target), type: rel.getAttribute('Type') ?? '' });
  }
  return map;
}

function resolvePath(folder: string, target: string) {
  if (target.startsWith('/')) return target.slice(1);
  const parts = folder.split('/');
  for (const seg of target.split('/')) {
    if (seg === '..') parts.pop();
    else if (seg !== '.') parts.push(seg);
  }
  return parts.join('/');
}

/** Paragraphs of text in a slide or notes part, in reading order. */
function paragraphs(doc: Document) {
  const out: { text: string; isTitle: boolean }[] = [];
  for (const sp of Array.from(doc.getElementsByTagNameNS('*', 'sp'))) {
    const ph = sp.getElementsByTagNameNS('*', 'ph')[0];
    const phType = ph?.getAttribute('type') ?? '';
    if (['sldNum', 'dt', 'ftr', 'hdr', 'sldImg'].includes(phType)) continue;
    const isTitle = phType === 'title' || phType === 'ctrTitle';
    for (const p of Array.from(sp.getElementsByTagNameNS('*', 'p'))) {
      const text = Array.from(p.getElementsByTagNameNS('*', 't')).map((t) => t.textContent ?? '').join('').trim();
      if (text) out.push({ text, isTitle });
    }
  }
  return out;
}

export async function readPptx(file: Blob): Promise<SlideInfo[]> {
  let files: Record<string, Uint8Array>;
  try {
    files = await unzipAsync(new Uint8Array(await file.arrayBuffer()));
  } catch {
    throw new Error('This file could not be opened. Please choose a PowerPoint (.pptx) file.');
  }
  if (!files['ppt/presentation.xml']) throw new Error('This does not look like a PowerPoint (.pptx) file.');

  // Slide order comes from the presentation's slide list.
  const presRels = relationships(files, 'ppt/presentation.xml');
  const pres = parseXml(read(files, 'ppt/presentation.xml'));
  let slidePaths = Array.from(pres.getElementsByTagNameNS('*', 'sldId'))
    .map((el) => presRels.get(el.getAttribute('r:id') ?? el.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id') ?? '')?.target)
    .filter((p): p is string => !!p && !!files[p]);
  if (!slidePaths.length) {
    slidePaths = Object.keys(files)
      .filter((k) => /^ppt\/slides\/slide\d+\.xml$/.test(k))
      .sort((a, b) => parseInt(a.match(/\d+/)![0], 10) - parseInt(b.match(/\d+/)![0], 10));
  }

  return slidePaths.map((path, i) => {
    const rels = relationships(files, path);
    const xml = read(files, path);
    const doc = parseXml(xml);

    // Pictures placed on the slide, in order, each counted once.
    const seen = new Set<string>();
    const images: SlideImage[] = [];
    for (const m of xml.matchAll(/r:embed="([^"]+)"/g)) {
      const rel = rels.get(m[1]);
      if (!rel || seen.has(rel.target)) continue;
      seen.add(rel.target);
      const ext = rel.target.split('.').pop()!.toLowerCase();
      const bytes = files[rel.target];
      if (!bytes || !imageTypes[ext]) continue; // skip vector formats the browser can't show (EMF/WMF)
      images.push({ name: rel.target.split('/').pop()!, blob: new Blob([bytes as Uint8Array<ArrayBuffer>], { type: imageTypes[ext] }) });
    }
    images.sort((a, b) => b.blob.size - a.blob.size);

    const paras = paragraphs(doc);
    const titlePara = paras.find((p) => p.isTitle) ?? paras[0];
    const title = titlePara?.text ?? '';
    const text = paras.filter((p) => p !== titlePara).map((p) => p.text).join('\n');

    const notesRel = [...rels.values()].find((r) => r.type.endsWith('/notesSlide'));
    const notes = notesRel ? paragraphs(parseXml(read(files, notesRel.target))).map((p) => p.text).join('\n') : '';

    return { number: i + 1, title, text, notes, images };
  });
}

// ── Working out what each slide is ───────────────────────────

/** Extra words people commonly use for the rooms in this home. */
const aliases: Record<string, string[]> = {
  'lift-lobby': ['lift lobby', 'lobby', 'foyer', 'entrance'],
  living: ['living room', 'living', 'lounge'],
  dining: ['dining room', 'dining'],
  'dry-kitchen': ['dry kitchen', 'kitchen', 'pantry'],
  'wet-kitchen': ['wet kitchen'],
  balcony: ['balcony'],
  master: ['master bedroom', 'master bath', 'master bathroom', 'master'],
  'bedroom-2': ['bedroom 2', 'bedroom two', 'bed 2', 'br2', 'study'],
  'bedroom-3': ['bedroom 3', 'bedroom three', 'bed 3', 'br3', 'guest room', 'bath 3'],
  'junior-master': ['junior master', 'jr master', 'junior master bath'],
  yard: ['yard'],
  'power-room': ['power room'],
  utility: ['utility'],
  store: ['store room', 'storeroom', 'store'],
};

/** Best-matching room for some slide text (the longest matching phrase wins), or undefined. */
export function guessRoom(text: string, rooms: Room[]) {
  const hay = ` ${text.toLowerCase().replace(/[^a-z0-9]+/g, ' ')} `;
  let best: { id: string; len: number } | undefined;
  for (const r of rooms) {
    const phrases = [r.name, r.includes, ...(aliases[r.id] ?? [])].filter(Boolean).map((p) => p!.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim());
    for (const p of phrases) {
      if (p && hay.includes(` ${p} `) && (!best || p.length > best.len)) best = { id: r.id, len: p.length };
    }
  }
  return best?.id;
}

/** Splits "…Prompt: xyz" out of slide text. Speaker notes are used as the prompt when there is no label. */
export function splitPrompt(slide: SlideInfo) {
  const all = slide.text;
  const m = all.match(/(?:^|\n)\s*(?:design\s+)?prompt\s*[:\-–]\s*([\s\S]*)$/i);
  if (m) return { description: all.slice(0, m.index).trim(), prompt: m[1].trim() };
  return { description: all.trim(), prompt: slide.notes.trim() };
}
