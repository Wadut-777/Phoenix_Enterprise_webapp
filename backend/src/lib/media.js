import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { httpError } from './sanitize.js';

const LADDER = [480, 960, 1600];
const MAX_IMAGE = 25 * 1024 * 1024;
const MAX_VIDEO = 60 * 1024 * 1024;

let sharpPromise;
const getSharp = () => (sharpPromise ??= import('sharp').then((m) => m.default).catch(() => null));

/** Identifies a file from its first bytes. The client-supplied MIME type and extension are never trusted. */
export function sniff(b) {
  if (b.length < 12) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { mime: 'image/jpeg', ext: 'jpg', kind: 'image' };
  if (b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { mime: 'image/png', ext: 'png', kind: 'image' };
  if (b.toString('ascii', 0, 4) === 'GIF8') return { mime: 'image/gif', ext: 'gif', kind: 'image' };
  if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') return { mime: 'image/webp', ext: 'webp', kind: 'image' };
  if (b.toString('ascii', 4, 8) === 'ftyp') {
    const brand = b.toString('ascii', 8, 12);
    if (brand === 'avif' || brand === 'avis') return { mime: 'image/avif', ext: 'avif', kind: 'image' };
    return { mime: 'video/mp4', ext: 'mp4', kind: 'video' };
  }
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return { mime: 'video/webm', ext: 'webm', kind: 'video' };
  return null;
}

const baseName = (name) =>
  path.parse(String(name)).name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'file';

/**
 * Validates an uploaded temp file and stores it under mediaDir/<uuid>/.
 * Images become WebP at 480/960/1600px (EXIF stripped, auto-rotated) when sharp is available;
 * the 1600 variant is the canonical URL. Animated GIFs, videos and the no-sharp fallback keep the original.
 */
export async function processUpload(tmpPath, originalName, mediaDir) {
  const fh = await fs.open(tmpPath, 'r');
  const head = Buffer.alloc(16);
  await fh.read(head, 0, 16, 0);
  await fh.close();
  const type = sniff(head);
  if (!type) throw httpError(400, 'Unsupported file. Upload JPG, PNG, WebP, AVIF, GIF, MP4 or WebM.');
  const { size } = await fs.stat(tmpPath);
  if (type.kind === 'image' && size > MAX_IMAGE) throw httpError(400, 'Images must be 25 MB or smaller.');
  if (type.kind === 'video' && size > MAX_VIDEO) throw httpError(400, 'Videos must be 60 MB or smaller.');

  const dir = crypto.randomUUID();
  const outDir = path.join(mediaDir, dir);
  await fs.mkdir(outDir, { recursive: true });
  const base = baseName(originalName);
  const url = (f) => `/uploads/media/${dir}/${f}`;

  try {
    const sharp = type.kind === 'image' && type.mime !== 'image/gif' ? await getSharp() : null;
    if (sharp) {
      const meta = await sharp(tmpPath).metadata();
      const variants = [];
      for (const w of LADDER) {
        const file = `${base}-${w}.webp`;
        await sharp(tmpPath).rotate().resize({ width: w, withoutEnlargement: true }).webp({ quality: 80 }).toFile(path.join(outDir, file));
        variants.push({ width: w, url: url(file) });
      }
      const swap = meta.orientation && meta.orientation >= 5;
      return {
        kind: 'image', mimeType: 'image/webp', size,
        width: swap ? meta.height : meta.width, height: swap ? meta.width : meta.height,
        url: variants[variants.length - 1].url, variants, dir,
      };
    }
    const file = `${base}.${type.ext}`;
    await fs.copyFile(tmpPath, path.join(outDir, file));
    return { kind: type.kind, mimeType: type.mime, size, url: url(file), variants: [], dir };
  } catch (e) {
    await fs.rm(outDir, { recursive: true, force: true });
    throw e.status ? e : httpError(400, 'This file could not be processed as an image.');
  }
}

export async function removeMediaDir(mediaDir, dir) {
  if (!/^[0-9a-f-]{36}$/.test(String(dir))) return;
  await fs.rm(path.join(mediaDir, dir), { recursive: true, force: true });
}
