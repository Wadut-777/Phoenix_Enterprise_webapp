export const httpError = (status, message) => Object.assign(new Error(message), { status });

export const BLOCK_TYPES = [
  'hero', 'intro', 'richText', 'textImage', 'twoColumn', 'fullImage', 'serviceGrid', 'projectGallery',
  'featureList', 'industries', 'process', 'stats', 'clients', 'testimonials', 'people', 'faq', 'video',
  'cta', 'contactForm', 'html',
];

const BAD_URL = /^\s*(javascript|vbscript|data):/i;
const BAD_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/** Rejects script-capable URLs and prototype-pollution keys anywhere in a value. */
export function assertSafe(value, depth = 0) {
  if (depth > 12) throw httpError(400, 'Content is nested too deeply.');
  if (typeof value === 'string') {
    if (BAD_URL.test(value)) throw httpError(400, 'Links must be http(s), mailto, tel or relative paths.');
    return;
  }
  if (Array.isArray(value)) return value.forEach((v) => assertSafe(v, depth + 1));
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      if (BAD_KEYS.has(k)) throw httpError(400, 'Invalid field name.');
      assertSafe(v, depth + 1);
    }
  }
}

const HEX = /^#[0-9a-f]{3,8}$/i;
const ALIGN = ['left', 'center', 'right'];

function cleanStyle(style) {
  const out = {};
  if (!style || typeof style !== 'object') return out;
  for (const k of ['background', 'color']) {
    if (typeof style[k] === 'string' && HEX.test(style[k])) out[k] = style[k];
  }
  for (const k of ['paddingTop', 'paddingBottom']) {
    const n = Number(style[k]);
    if (style[k] !== '' && style[k] != null && Number.isFinite(n)) out[k] = Math.min(400, Math.max(0, Math.round(n)));
  }
  if (ALIGN.includes(style.align)) out.align = style.align;
  return out;
}

/**
 * Validates and normalises page-builder blocks.
 * `allowHtml`: whether the caller may create or change custom HTML blocks.
 * `existingHtml`: Map(blockId -> code) of HTML already stored, so non-privileged editors can keep (not alter) it.
 */
export function cleanBlocks(blocks, { allowHtml = false, existingHtml = new Map() } = {}) {
  if (!Array.isArray(blocks)) throw httpError(400, 'Blocks must be a list.');
  if (blocks.length > 150) throw httpError(400, 'Too many blocks on one page.');
  const seen = new Set();
  return blocks.map((b) => {
    if (!b || typeof b !== 'object') throw httpError(400, 'Invalid block.');
    const id = String(b.id || '');
    if (!/^[\w-]{1,40}$/.test(id) || seen.has(id)) throw httpError(400, 'Invalid or duplicate block id.');
    seen.add(id);
    if (!BLOCK_TYPES.includes(b.type)) throw httpError(400, `Unknown block type "${String(b.type).slice(0, 30)}".`);
    const props = b.props && typeof b.props === 'object' && !Array.isArray(b.props) ? b.props : {};
    if (b.type === 'html') {
      const code = typeof props.code === 'string' ? props.code : '';
      if (code.length > 50000) throw httpError(400, 'Custom HTML is too long.');
      if (!allowHtml && existingHtml.get(id) !== code) {
        throw httpError(403, 'Only administrators can add or change custom HTML blocks.');
      }
    } else {
      assertSafe(props);
    }
    return { id, type: b.type, props, style: cleanStyle(b.style) };
  });
}

export function htmlMap(...blockLists) {
  const m = new Map();
  for (const list of blockLists) {
    for (const b of list || []) if (b?.type === 'html') m.set(b.id, b.props?.code ?? '');
  }
  return m;
}
