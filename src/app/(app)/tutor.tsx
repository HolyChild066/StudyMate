import { useState } from 'react';
import { View, ActivityIndicator, Pressable, Alert, Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import JSZip from 'jszip';
import * as mammoth from 'mammoth';
import { Brain, BookOpen, CalendarDays, Upload, FileText, Trash2, ChevronDown, ChevronUp } from 'lucide-react-native';

import { AppText, Button, Card, Screen, SectionHeader } from '@/components/ui';
import { generateQuizFromText, generateFlashcardsFromText, summarizeNotes, type QuizQuestion, type Flashcard } from '@/lib/ai';
import { colors, radius, space } from '@/theme/tokens';

type ResultType = 'quiz' | 'flashcards' | 'summary' | null;

function getExtension(name: string): string {
  const m = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m?.[1] || '';
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => {
      const code = Number(n);
      return Number.isFinite(code) ? String.fromCharCode(code) : '';
    })
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => {
      const code = parseInt(n, 16);
      return Number.isFinite(code) ? String.fromCharCode(code) : '';
    });
}

function normalizeExtractedText(text: string): string {
  return decodeEntities(text)
    .replace(/\r/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function stripRtf(text: string): string {
  return normalizeExtractedText(
    text
      .replace(/\\par[d]?/g, '\n')
      .replace(/\\'[0-9a-fA-F]{2}/g, ' ')
      .replace(/\\[a-zA-Z]+-?\d* ?/g, '')
      .replace(/[{}]/g, ' ')
  );
}

function base64ToUint8(base64: string): Uint8Array {
  const clean = base64.replace(/\s+/g, '');
  if (typeof globalThis.atob === 'function') {
    const binary = globalThis.atob(clean);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
  // @ts-ignore Buffer may exist in some runtimes
  const buf = (globalThis as any).Buffer?.from(clean, 'base64');
  if (buf) return new Uint8Array(buf);
  return new Uint8Array();
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const bytes = base64ToUint8(base64);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

function bytesToLatin1(bytes: Uint8Array): string {
  let out = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    const sub = bytes.subarray(i, i + chunk);
    out += String.fromCharCode(...sub);
  }
  return out;
}

function uint8ToBase64(bytes: Uint8Array): string {
  // @ts-ignore Buffer may exist
  const B: any = (globalThis as any).Buffer;
  if (B) return B.from(bytes).toString('base64');
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  if (typeof globalThis.btoa === 'function') return globalThis.btoa(binary);
  return '';
}

async function readFileBytes(uri: string): Promise<Uint8Array> {
  if (Platform.OS === 'web') {
    const res = await fetch(uri);
    if (!res.ok) throw new Error(`Failed to fetch file (${res.status})`);
    const ab = await res.arrayBuffer();
    return new Uint8Array(ab);
  }
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    return base64ToUint8(base64);
  } catch (e) {
    // fallback: try fetch for content/file URIs in some runtimes
    try {
      const res = await fetch(uri);
      const ab = await res.arrayBuffer();
      return new Uint8Array(ab);
    } catch {}
    throw e;
  }
}

async function readFileText(uri: string): Promise<string> {
  if (Platform.OS === 'web') {
    const res = await fetch(uri);
    if (!res.ok) throw new Error(`Failed to fetch file (${res.status})`);
    return await res.text();
  }
  try {
    const text = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 });
    if (text != null) return text;
  } catch {}
  try {
    const bytes = await readFileBytes(uri);
    return decodeUtf8Bytes(bytes);
  } catch {}
  return '';
}

function isMostlyReadable(text: string): boolean {
  const t = text.trim();
  if (t.length < 30) return false;
  const sample = t.slice(0, 2000);
  let readable = 0;
  for (let i = 0; i < sample.length; i++) {
    const c = sample.charCodeAt(i);
    if (c === 9 || c === 10 || c === 13 || (c >= 32 && c <= 126) || c >= 160) readable++;
  }
  return readable / sample.length > 0.75;
}

function extractXmlTagTexts(xml: string, tag: string): string[] {
  const parts: string[] = [];
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const val = normalizeExtractedText((m[1] || '').replace(/<[^>]+>/g, ' '));
    if (val) parts.push(val);
  }
  return parts;
}

async function readZipText(uri: string): Promise<JSZip> {
  const bytes = await readFileBytes(uri);
  try {
    return await JSZip.loadAsync(bytes);
  } catch {
    const base64 = uint8ToBase64(bytes);
    return await JSZip.loadAsync(base64, { base64: true });
  }
}

function extractDocxText(xml: string): string {
  const blocks: string[] = [];
  const pRe = /<w:p[\s\S]*?<\/w:p>/gi;
  let p: RegExpExecArray | null;
  while ((p = pRe.exec(xml)) !== null) {
    const t = extractXmlTagTexts(p[0], 'w:t').join('');
    if (t.trim()) blocks.push(t.trim());
  }
  if (blocks.length > 0) return normalizeExtractedText(blocks.join('\n'));
  return normalizeExtractedText(extractXmlTagTexts(xml, 'w:t').join(' '));
}

function extractPptxText(slideXmls: string[]): string {
  const slides: string[] = [];
  for (const xml of slideXmls) {
    const texts = extractXmlTagTexts(xml, 'a:t');
    if (texts.length) slides.push(texts.join(' '));
  }
  return normalizeExtractedText(slides.join('\n'));
}

function extractXlsxText(sharedXml: string | null, sheetXmls: string[]): string {
  const parts: string[] = [];
  if (sharedXml) {
    // sharedStrings may have nested <r><t>
    const siRe = /<si[\s\S]*?<\/si>/gi;
    let m: RegExpExecArray | null;
    while ((m = siRe.exec(sharedXml)) !== null) {
      const t = extractXmlTagTexts(m[0], 't').join('');
      if (t) parts.push(t);
    }
    if (parts.length === 0) {
      parts.push(...extractXmlTagTexts(sharedXml, 't'));
    }
  }
  for (const xml of sheetXmls) {
    // inline strings
    const inline = extractXmlTagTexts(xml, 't');
    if (inline.length) parts.push(inline.join(' '));
    const vals = extractXmlTagTexts(xml, 'v');
    if (vals.length) parts.push(vals.join(' '));
  }
  return normalizeExtractedText(parts.join('\n'));
}

function decodePdfHexString(hex: string): string {
  const clean = hex.replace(/\s+/g, '');
  if (!clean) return '';
  const padded = clean.length % 2 === 0 ? clean : clean + '0';
  let out = '';
  for (let i = 0; i < padded.length; i += 2) {
    const code = parseInt(padded.slice(i, i + 2), 16);
    if (!Number.isFinite(code)) continue;
    // Try to keep readable chars; map some common PDF bytes
    if (code === 0) continue;
    out += String.fromCharCode(code);
  }
  return out;
}

function decodePdfStringLiteral(raw: string): string {
  let out = '';
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i]!;
    if (ch !== '\\') {
      out += ch;
      continue;
    }
    const next = raw[++i];
    if (next == null) break;
    if (next === 'n') out += '\n';
    else if (next === 'r') out += '\r';
    else if (next === 't') out += '\t';
    else if (next === 'b' || next === 'f') out += ' ';
    else if (next === '(' || next === ')' || next === '\\') out += next;
    else if (/[0-7]/.test(next)) {
      let oct = next;
      for (let j = 0; j < 2 && i + 1 < raw.length && /[0-7]/.test(raw[i + 1]!); j++) oct += raw[++i]!;
      const code = parseInt(oct, 8);
      if (Number.isFinite(code)) out += String.fromCharCode(code);
    } else {
      out += next;
    }
  }
  return out;
}

function extractReadableRuns(content: string): string {
  // Extract long-ish runs of mostly readable characters from arbitrary/binary-ish text
  const runs = content.match(/[A-Za-z0-9][A-Za-z0-9 \t,.;:()\-_'"\[\]\/!?@\n\r]{15,}/g) || [];
  const cleaned = runs
    .map((r) => normalizeExtractedText(r))
    .filter((r) => r.length >= 20 && /[A-Za-z]{3}/.test(r));
  // Deduplicate repeated runs (common in binaries)
  const uniq: string[] = [];
  const seen = new Set<string>();
  for (const r of cleaned) {
    const key = r.slice(0, 120);
    if (seen.has(key)) continue;
    seen.add(key);
    uniq.push(r);
  }
  return normalizeExtractedText(uniq.join('\n'));
}

function extractPdfTextBestEffort(content: string): string {
  const chunks: string[] = [];

  // Tj: (text) Tj or <hex> Tj
  const tjRe = /(\((?:\\.|[^\\)])*\)|<[^>]*>)\s*Tj/g;
  let m: RegExpExecArray | null;
  while ((m = tjRe.exec(content)) !== null) {
    const token = m[1] || '';
    if (token.startsWith('(')) {
      chunks.push(decodePdfStringLiteral(token.slice(1, -1)));
    } else if (token.startsWith('<')) {
      chunks.push(decodePdfHexString(token.slice(1, -1)));
    }
  }

  // TJ arrays: [(text) -123 <hex> (text)] TJ
  const tjArrRe = /\[([\s\S]*?)\]\s*TJ/gi;
  while ((m = tjArrRe.exec(content)) !== null) {
    const arr = m[1] || '';
    let line = '';
    const tokRe = /(\((?:\\.|[^\\)])*\)|<[^>]*>)/g;
    let tm: RegExpExecArray | null;
    while ((tm = tokRe.exec(arr)) !== null) {
      const token = tm[1] || '';
      if (token.startsWith('(')) line += decodePdfStringLiteral(token.slice(1, -1));
      else if (token.startsWith('<')) line += decodePdfHexString(token.slice(1, -1));
    }
    if (line.trim()) chunks.push(line);
  }

  // Parenthesized strings fallback
  if (chunks.join(' ').trim().length < 40) {
    const anyRe = /\(((?:\\.|[^\\)]){3,})\)/g;
    while ((m = anyRe.exec(content)) !== null) {
      const decoded = decodePdfStringLiteral(m[1] || '');
      if (/[A-Za-z0-9]/.test(decoded)) chunks.push(decoded);
    }
  }

  let text = normalizeExtractedText(chunks.join('\n'));

  // Aggressive fallback: extract readable runs from raw content (helps some uncompressed/simple cases)
  if (text.length < 40 || !isMostlyReadable(text)) {
    const runs = extractReadableRuns(content);
    if (runs.length > text.length) text = runs;
  }

  return normalizeExtractedText(text);
}

function decodeUtf8Bytes(bytes: Uint8Array): string {
  try {
    if (typeof TextDecoder !== 'undefined') return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  } catch {}
  try {
    // fallback: percent-decode UTF-8 bytes
    let s = '';
    for (let i = 0; i < bytes.length; i++) s += `%${bytes[i]!.toString(16).padStart(2, '0')}`;
    return decodeURIComponent(s);
  } catch {}
  return bytesToLatin1(bytes);
}

async function readUtf8TextBestEffort(uri: string): Promise<string> {
  try {
    const text = await readFileText(uri);
    if (text) return text;
  } catch {}
  return '';
}

function pickReadableResult(...candidates: Array<{ text: string; warning?: string; min?: number }>) {
  for (const c of candidates) {
    const cleaned = normalizeExtractedText(c.text || '');
    const min = c.min ?? 20;
    if (cleaned.length >= min && (isMostlyReadable(cleaned) || cleaned.length >= 80)) {
      return { text: cleaned, warning: c.warning } as { text: string; warning?: string };
    }
  }
  // last resort: any non-trivial text
  for (const c of candidates) {
    const cleaned = normalizeExtractedText(c.text || '');
    if (cleaned.length >= 12) return { text: cleaned, warning: c.warning } as { text: string; warning?: string };
  }
  return null;
}

async function readDocumentText(uri: string, name: string): Promise<{ text: string | null; warning?: string }> {
  const ext = getExtension(name);

  try {
    if (['txt', 'md', 'csv', 'json', 'log', 'xml', 'html', 'htm'].includes(ext)) {
      const text = normalizeExtractedText(await readUtf8TextBestEffort(uri));
      if (ext === 'html' || ext === 'htm' || ext === 'xml') {
        const stripped = normalizeExtractedText(text.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' '));
        if (stripped.length >= 12) return { text: stripped };
      }
      return { text: text || null, warning: text ? undefined : 'The file appears to be empty.' };
    }

    if (ext === 'rtf') {
      const raw = await readUtf8TextBestEffort(uri);
      const stripped = stripRtf(raw);
      const picked = pickReadableResult({ text: stripped, min: 10 }, { text: raw, min: 10 });
      return picked ? { text: picked.text } : { text: null, warning: 'Could not extract readable text from this .rtf file.' };
    }

    if (ext === 'docx') {
      const tries: Array<{ text: string; warning?: string; min?: number }> = [];
      let zipTextCombined = '';
      let debug = 'docx-debug:';
      try {
        const zip = await readZipText(uri);
        const allPaths = Object.keys(zip.files || {});
        const xmlPaths = allPaths.filter((k) => /^word\/.*\.xml$/i.test(k) && !zip.files[k]!.dir);
        debug += ` zip=ok files=${allPaths.length} wordXml=${xmlPaths.length};`;
        // prioritize main document, then others
        xmlPaths.sort((a, b) => {
          const pa = /document\.xml$/i.test(a) ? 0 : /header|footer|footnote|endnote|comment/i.test(a) ? 1 : 2;
          const pb = /document\.xml$/i.test(b) ? 0 : /header|footer|footnote|endnote|comment/i.test(b) ? 1 : 2;
          return pa - pb || a.localeCompare(b);
        });
        const parts: string[] = [];
        for (const path of xmlPaths) {
          const f = zip.file(path);
          if (!f) continue;
          try {
            const xml = await f.async('string');
            let t = extractDocxText(xml);
            if (!t) t = normalizeExtractedText(extractXmlTagTexts(xml, 'w:t').join(' '));
            if (!t) t = normalizeExtractedText(extractXmlTagTexts(xml.replace(/w:/g, ''), 't').join(' '));
            if (t) parts.push(t);
          } catch {}
        }
        zipTextCombined = normalizeExtractedText(parts.join('\n'));
        debug += ` zipText=${zipTextCombined.length};`;
        if (zipTextCombined) tries.push({ text: zipTextCombined });
      } catch (e) {
        debug += ` zip=fail(${e instanceof Error ? e.message : 'err'});`;
      }

      try {
        const bytes = await readFileBytes(uri);
        const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
        const m: any = mammoth as any;
        const extractRawText = m?.extractRawText || m?.default?.extractRawText;
        if (typeof extractRawText === 'function') {
          try {
            const result = await extractRawText({ arrayBuffer });
            const v = normalizeExtractedText(result?.value || '');
            debug += ` mammothRaw=${v.length};`;
            if (v) tries.push({ text: v });
          } catch (e) {
            debug += ` mammothRawErr;`;
          }
        } else {
          debug += ' mammothRaw=na;';
        }
        const convertToHtml = m?.convertToHtml || m?.default?.convertToHtml;
        if (typeof convertToHtml === 'function') {
          try {
            const htmlRes = await convertToHtml({ arrayBuffer });
            const html = String(htmlRes?.value || '');
            const stripped = normalizeExtractedText(html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' '));
            debug += ` mammothHtml=${stripped.length};`;
            if (stripped) tries.push({ text: stripped, min: 10 });
          } catch {
            debug += ' mammothHtmlErr;';
          }
        } else {
          debug += ' mammothHtml=na;';
        }
      } catch {
        debug += ' mammoth=fail;';
      }

      // last resort: readable runs from raw bytes (rarely useful for zip/docx but cheap)
      try {
        const bytes = await readFileBytes(uri);
        const runs = extractReadableRuns(bytesToLatin1(bytes));
        debug += ` runs=${(runs || '').length};`;
        if (runs && runs.length > (zipTextCombined?.length || 0)) tries.push({ text: runs, min: 30 });
      } catch {}

      const picked = pickReadableResult(...tries);
      if (picked) return { text: picked.text };
      return { text: null, warning: `Could not extract readable text from this .docx. If it has selectable text, this may be an unsupported/packaging issue in-app. (${debug})` };
    }

    if (ext === 'pptx') {
      try {
        const zip = await readZipText(uri);
        const slideFiles = Object.keys(zip.files)
          .filter((k) => /^ppt\/(slides\/slide|notesSlides\/notesSlide)\d+\.xml$/i.test(k))
          .sort();
        const xmls: string[] = [];
        for (const path of slideFiles) {
          const f = zip.file(path);
          if (f) xmls.push(await f.async('string'));
        }
        const text = extractPptxText(xmls);
        const picked = pickReadableResult({ text });
        if (picked) return { text: picked.text };
      } catch {}
      return { text: null, warning: 'Could not extract readable text from this .pptx. If slides are image-based, they cannot be read in-app.' };
    }

    if (ext === 'xlsx') {
      try {
        const zip = await readZipText(uri);
        const shared = zip.file('xl/sharedStrings.xml');
        const sharedXml = shared ? await shared.async('string') : null;
        const sheetFiles = Object.keys(zip.files)
          .filter((k) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(k))
          .sort();
        const sheetXmls: string[] = [];
        for (const path of sheetFiles) {
          const f = zip.file(path);
          if (f) sheetXmls.push(await f.async('string'));
        }
        const text = extractXlsxText(sharedXml, sheetXmls);
        const picked = pickReadableResult({ text, warning: 'Extracted text from .xlsx (best effort). For cleaner notes, export as .csv or .txt.' });
        if (picked) return { text: picked.text, warning: picked.warning };
      } catch {}
      return { text: null, warning: 'Could not extract readable text from this .xlsx. Try a text-based sheet or export as .csv.' };
    }

    if (ext === 'epub') {
      try {
        const zip = await readZipText(uri);
        const texts: string[] = [];
        const htmlFiles = Object.keys(zip.files).filter((k) => /\.(x?html?|xml)$/i.test(k) && !zip.files[k]!.dir);
        for (const path of htmlFiles.slice(0, 60)) {
          const f = zip.file(path);
          if (!f) continue;
          const content = await f.async('string');
          const stripped = normalizeExtractedText(content.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' '));
          if (stripped.length > 20) texts.push(stripped);
        }
        const text = normalizeExtractedText(texts.join('\n'));
        const picked = pickReadableResult({ text, min: 40, warning: 'Extracted text from .epub (best effort).' });
        if (picked) return { text: picked.text, warning: picked.warning };
      } catch {}
      return { text: null, warning: 'Could not extract readable text from this .epub.' };
    }

    if (ext === 'pdf') {
      const tries: Array<{ text: string; warning?: string; min?: number }> = [];
      try {
        const bytes = await readFileBytes(uri);
        const content = bytesToLatin1(bytes);
        tries.push({ text: extractPdfTextBestEffort(content), warning: 'Extracted text from PDF (best effort). Some formatting may be lost.', min: 30 });
        const runs = extractReadableRuns(content);
        tries.push({ text: runs, warning: 'Extracted partial text from PDF (best effort). This PDF may be compressed or image-heavy.', min: 30 });
      } catch {}
      try {
        const raw = await readFileText(uri);
        tries.push({ text: extractPdfTextBestEffort(raw), warning: 'Extracted text from PDF (best effort).', min: 30 });
      } catch {}
      const picked = pickReadableResult(...tries);
      if (picked) return { text: picked.text, warning: picked.warning };
      return { text: null, warning: 'Could not extract readable text from this PDF. Many PDFs are compressed or scanned; text-based (non-scanned) PDFs work best in-app.' };
    }

    if (ext === 'doc' || ext === 'ppt' || ext === 'xls') {
      try {
        const bytes = await readFileBytes(uri);
        const raw = bytesToLatin1(bytes);
        const runs = extractReadableRuns(raw);
        const picked = pickReadableResult({ text: runs, warning: `Extracted text from legacy .${ext} file (best effort). For better results, save as .${ext}x.`, min: 30 });
        if (picked) return { text: picked.text, warning: picked.warning };
      } catch {}
      return { text: null, warning: `Could not extract readable text from legacy .${ext}. Try saving as .${ext}x (text-based).` };
    }

    // Unknown extension or fallback: try UTF-8 text, then best-effort binary text
    try {
      const raw = await readUtf8TextBestEffort(uri);
      const text = normalizeExtractedText(raw);
      if (text && (isMostlyReadable(text) || text.length >= 40)) return { text };
    } catch {}
    try {
      const bytes = await readFileBytes(uri);
      const raw = bytesToLatin1(bytes);
      const runs = extractReadableRuns(raw);
      const picked = pickReadableResult({ text: runs, warning: 'Extracted text using best-effort parsing. Results may vary by file type.', min: 30 });
      if (picked) return { text: picked.text, warning: picked.warning };
    } catch {}

    return { text: null, warning: `Could not extract readable text from this .${ext || 'file'}. It may be scanned/image-based or in an unsupported format.` };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return { text: null, warning: `Failed to read file: ${message}` };
  }
}

export default function TutorScreen() {
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [resultType, setResultType] = useState<ResultType>(null);
  const [quiz, setQuiz] = useState<QuizQuestion[] | null>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[] | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  const [showAnswers, setShowAnswers] = useState<Record<number, boolean>>({});

  const handleGenerate = async (action: 'quiz' | 'flashcards' | 'summary') => {
    if (!notes) return;
    setLoading(true);
    setError(null);
    setResultType(null);
    setQuiz(null);
    setFlashcards(null);
    setSummary(null);
    setExpandedCard(null);
    setShowAnswers({});
    try {
      if (action === 'quiz') {
        const q = await generateQuizFromText(notes, 5);
        setQuiz(q);
        setResultType('quiz');
      } else if (action === 'flashcards') {
        const cards = await generateFlashcardsFromText(notes, 5);
        setFlashcards(cards);
        setResultType('flashcards');
      } else {
        const s = await summarizeNotes(notes);
        setSummary(s);
        setResultType('summary');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: false,
      });

      if ((result as any).canceled) return;

      const asset: any = (result as any).assets && (result as any).assets.length > 0 ? (result as any).assets[0] : result;
      const uri = asset?.uri;
      const name = asset?.name || asset?.fileName || 'document';

      if (!uri) {
        Alert.alert('No file selected', 'The file picker did not return a file.');
        return;
      }

      setFileName(name);
      setError(null);
      setWarning(null);
      setNotes(null);
      setResultType(null);

      const { text, warning: w } = await readDocumentText(uri, name);
      if (w) setWarning(w);
      const cleaned = text?.trim() ?? '';
      if (cleaned.length > 0) {
        setNotes(cleaned);
      } else {
        setError(w || 'Could not read file or no readable text was found. Try a different text-based file.');
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      setError(message);
      Alert.alert('Error', message);
    }
  };

  return (
    <Screen scroll>
      <View style={{ paddingTop: space.lg, gap: space.xl }}>
        <View style={{ gap: 4 }}>
          <AppText variant="h1">AI Tutor</AppText>
          <AppText variant="caption" color={colors.muted}>
            Upload notes, then generate quizzes, flashcards, or summaries.
          </AppText>
        </View>

        <Card style={{ gap: space.md, alignItems: 'center' }}>
          <Pressable
            onPress={pickDocument}
            style={{
              width: '100%',
              paddingVertical: space.xl,
              borderRadius: radius.xl,
              borderWidth: 2,
              borderColor: colors.border,
              borderStyle: 'dashed',
              alignItems: 'center',
              justifyContent: 'center',
              gap: space.sm,
            }}>
            <Upload size={28} color={colors.primary} />
            <AppText variant="small" style={{ fontWeight: '600' }}>
              Upload notes
            </AppText>
            <AppText variant="caption" color={colors.muted}>
              txt, md, csv, rtf, docx, pptx, xlsx, epub, pdf (best effort)
            </AppText>
          </Pressable>

          {fileName ? (
            <View style={{ gap: 6, width: '100%' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                <FileText size={16} color={notes ? colors.success : colors.muted} />
                <AppText variant="small" style={{ flex: 1 }} numberOfLines={1}>
                  {fileName}
                </AppText>
                <Pressable onPress={() => { setNotes(null); setFileName(null); setResultType(null); setQuiz(null); setFlashcards(null); setSummary(null); setError(null); setWarning(null); }}>
                  <Trash2 size={16} color={colors.danger} />
                </Pressable>
              </View>
              {notes ? (
                <AppText variant="caption" color={colors.success}>Text extracted. You can generate a quiz, flashcards, or summary.</AppText>
              ) : (
                <AppText variant="caption" color={colors.muted}>No usable text extracted yet — generation buttons are disabled.</AppText>
              )}
            </View>
          ) : null}
          {warning ? <AppText variant="caption" color={colors.muted}>{warning}</AppText> : null}
        </Card>

        <View style={{ gap: space.sm }}>
          <Button label="Generate Quiz" icon={<Brain size={18} color="#fff" />} onPress={() => handleGenerate('quiz')} disabled={!notes?.trim() || loading} />
          <Button label="Generate Flashcards" variant="secondary" icon={<BookOpen size={18} color={colors.text} />} onPress={() => handleGenerate('flashcards')} disabled={!notes?.trim() || loading} />
          <Button label="Summarize Notes" variant="secondary" icon={<CalendarDays size={18} color={colors.text} />} onPress={() => handleGenerate('summary')} disabled={!notes?.trim() || loading} />
          {!notes?.trim() && fileName && !loading ? (
            <AppText variant="caption" color={colors.muted}>
              Upload a text-based file to enable generation. Scanned/image-only files may not be readable in-app.
            </AppText>
          ) : null}
        </View>

        {loading ? <ActivityIndicator color={colors.primary} /> : null}
        {error ? (
          <Card tone="flat">
            <AppText variant="small" color={colors.danger}>{error}</AppText>
          </Card>
        ) : null}

        {resultType === 'flashcards' && flashcards ? (
          <View style={{ gap: space.md }}>
            <SectionHeader title="Flashcards" subtitle={`${flashcards.length} cards`} />
            {flashcards.map((card, i) => {
              const expanded = expandedCard === i;
              return (
                <Pressable key={i} onPress={() => setExpandedCard(expanded ? null : i)}>
                  <Card style={{ gap: space.sm }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: space.sm }}>
                      <AppText variant="small" style={{ fontWeight: '700', flex: 1 }}>{card.front}</AppText>
                      {expanded ? <ChevronUp size={16} color={colors.muted} /> : <ChevronDown size={16} color={colors.muted} />}
                    </View>
                    {expanded ? (
                      <View style={{ gap: space.xs, paddingTop: space.xs, borderTopWidth: 1, borderTopColor: colors.border }}>
                        <AppText variant="small" color={colors.text}>{card.back}</AppText>
                        {card.hint ? <AppText variant="caption" color={colors.muted}>Hint: {card.hint}</AppText> : null}
                      </View>
                    ) : (
                      <AppText variant="caption" color={colors.muted}>Tap to reveal answer</AppText>
                    )}
                  </Card>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {resultType === 'quiz' && quiz ? (
          <View style={{ gap: space.md }}>
            <SectionHeader title="Quiz" subtitle={`${quiz.length} questions`} />
            {quiz.map((q, i) => {
              const revealed = !!showAnswers[i];
              return (
                <Card key={i} style={{ gap: space.sm }}>
                  <AppText variant="small" style={{ fontWeight: '700' }}>{i + 1}. {q.question}</AppText>
                  <View style={{ gap: 6 }}>
                    {q.options.map((opt, j) => {
                      const isCorrect = j === q.correctIndex;
                      return (
                        <View
                          key={j}
                          style={{
                            paddingVertical: 8,
                            paddingHorizontal: 10,
                            borderRadius: radius.md,
                            borderWidth: 1,
                            borderColor: revealed && isCorrect ? colors.success : colors.border,
                            backgroundColor: revealed && isCorrect ? '#ecfdf3' : 'transparent',
                          }}>
                          <AppText variant="small">{String.fromCharCode(65 + j)}. {opt}</AppText>
                        </View>
                      );
                    })}
                  </View>
                  <Pressable onPress={() => setShowAnswers((s) => ({ ...s, [i]: !s[i] }))}>
                    <AppText variant="caption" color={colors.primary}>
                      {revealed ? 'Hide answer' : 'Show answer'}
                    </AppText>
                  </Pressable>
                  {revealed ? (
                    <AppText variant="caption" color={colors.muted}>{q.explanation}</AppText>
                  ) : null}
                </Card>
              );
            })}
          </View>
        ) : null}

        {resultType === 'summary' && summary ? (
          <View style={{ gap: space.md }}>
            <SectionHeader title="Summary" />
            <Card>
              <AppText variant="small" style={{ lineHeight: 22 }}>{summary}</AppText>
            </Card>
          </View>
        ) : null}
      </View>
      <View style={{ height: 110 }} />
    </Screen>
  );
}
