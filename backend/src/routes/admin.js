import { Router } from 'express';
import mongoose from 'mongoose';
import fs from 'node:fs/promises';
import path from 'node:path';
import multer from 'multer';
import {
  Page, Service, ProjectCategory, Project, Industry, Blog, Testimonial, Client, Faq, Job, Menu,
  Enquiry, CareerApplication, WebsiteSettings, User, ContentRevision, ActivityLog, Media, liveFilter,
} from '../models/index.js';
import { authenticate, csrfCheck, requirePerm } from '../middleware/auth.js';
import { can, canHtml, ROLES } from '../lib/rbac.js';
import { assertSafe, cleanBlocks, htmlMap, httpError } from '../lib/sanitize.js';
import { hashPassword, passwordProblem } from '../lib/password.js';
import { processUpload, removeMediaDir } from '../lib/media.js';
import { logActivity } from '../lib/activity.js';
import { UPLOAD_ROOT } from '../lib/config.js';

const router = Router();
router.use(authenticate, csrfCheck);

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const SYSTEM = ['_id', '__v', 'createdAt', 'updatedAt'];
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const validId = (id) => mongoose.isValidObjectId(id);
const slugify = (s) =>
  String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
const RESERVED = new Set(['admin', 'api', 'services', 'projects', 'industries', 'careers', 'contact', 'faqs', 'news', 'insights', 'uploads', 'sitemap-xml', 'robots-txt', 'assets']);
const label = (d) => d.title || d.name || d.question || d.email || d.key || d.slug || String(d._id);
const log = (req, action, resource, docId, summary) => logActivity({ user: req.user, action, resource, docId, summary, ip: req.ip });

const mediaDir = path.join(UPLOAD_ROOT, 'media');
const tmpDir = path.join(UPLOAD_ROOT, 'tmp');
const resumeDir = path.resolve(UPLOAD_ROOT, 'resumes');
await fs.mkdir(mediaDir, { recursive: true });
await fs.mkdir(tmpDir, { recursive: true });

/* ------------------------------------------------------------------ */
/* Revisions                                                           */
/* ------------------------------------------------------------------ */
const plain = (doc) => {
  const o = JSON.parse(JSON.stringify(doc.toObject ? doc.toObject() : doc));
  SYSTEM.forEach((k) => delete o[k]);
  return o;
};

async function snapshot(req, resource, docId, data, labelText) {
  await ContentRevision.create({ resource, docId, label: labelText, snapshot: data, author: { id: req.user.id, name: req.user.name } });
  const old = await ContentRevision.find({ resource, docId }).sort({ createdAt: -1 }).skip(30).select('_id').lean();
  if (old.length) await ContentRevision.deleteMany({ _id: { $in: old.map((o) => o._id) } });
}

/* ------------------------------------------------------------------ */
/* Resource registry for generic CRUD                                   */
/* ------------------------------------------------------------------ */
const REG = {
  pages: { M: Page, perm: 'content', search: ['title', 'slug'], versioned: true, dup: true, deny: ['blocks', 'draft'] },
  services: { M: Service, perm: 'content', search: ['title', 'slug'], versioned: true, dup: true, sort: { order: 1 } },
  industries: { M: Industry, perm: 'content', search: ['name', 'slug'], versioned: true, sort: { order: 1 } },
  blogs: { M: Blog, perm: 'content', search: ['title', 'slug'], versioned: true, dup: true, sort: { publishedAt: -1 } },
  testimonials: { M: Testimonial, perm: 'content', search: ['author', 'company', 'quote'], sort: { order: 1 } },
  clients: { M: Client, perm: 'content', search: ['name'], sort: { order: 1 } },
  faqs: { M: Faq, perm: 'content', search: ['question', 'group'], sort: { group: 1, order: 1 } },
  projects: { M: Project, perm: 'projects', search: ['title', 'slug', 'client', 'location'], versioned: true, dup: true, populate: 'category', sort: { order: 1, updatedAt: -1 } },
  'project-categories': { M: ProjectCategory, perm: 'projects', search: ['name', 'slug'], sort: { order: 1 } },
  jobs: { M: Job, perm: 'careers', search: ['title', 'slug', 'department'], dup: true },
  menus: { M: Menu, perm: 'settings', search: ['key'], versioned: true, sort: { key: 1 } },
  users: {
    M: User, perm: 'users', search: ['name', 'email'], sort: { createdAt: -1 },
    deny: ['passwordHash', 'sessions', 'failedAttempts', 'lockUntil', 'lastLoginAt'],
    async beforeSave(data, { req, existing }) {
      const out = { ...data };
      if ('email' in out) out.email = String(out.email || '').toLowerCase().trim();
      if (out.role && !ROLES.includes(out.role)) throw httpError(400, 'Invalid role.');
      if (out.password) {
        const problem = passwordProblem(out.password);
        if (problem) throw httpError(400, problem);
        out.passwordHash = await hashPassword(out.password);
        out.sessions = [];
      }
      delete out.password;
      if (!existing && !out.passwordHash) throw httpError(400, 'A password is required for new users.');
      if (existing) {
        if (existing._id.equals(req.user.id) && (out.active === false || (out.role && out.role !== existing.role))) {
          throw httpError(400, "You can't deactivate or change the role of your own account.");
        }
        if ((out.role && out.role !== existing.role) || (out.active === false && existing.active)) out.sessions = [];
      }
      return out;
    },
    async beforeDelete(existing, { req }) {
      if (existing._id.equals(req.user.id)) throw httpError(400, "You can't delete your own account.");
    },
  },
};

function resolve(req, res) {
  const d = REG[req.params.resource];
  if (!d) { res.status(404).json({ error: 'Not found' }); return null; }
  if (!can(req.user.role, d.perm)) { res.status(403).json({ error: 'You do not have permission for this.' }); return null; }
  return d;
}

function clean(body, d) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw httpError(400, 'Invalid request body.');
  const out = { ...body };
  [...SYSTEM, ...(d.deny || [])].forEach((k) => delete out[k]);
  return out;
}

function prepSlug(d, data, existing) {
  if (!d.M.schema.path('slug')) return;
  if (existing?.slug === 'home' && 'slug' in data && data.slug !== 'home') throw httpError(400, 'The home page slug cannot be changed.');
  if (!('slug' in data) || !data.slug) {
    if (existing) { delete data.slug; return; }
    data.slug = slugify(data.title || data.name);
  } else {
    data.slug = slugify(data.slug);
  }
  if (!data.slug) throw httpError(400, 'A slug is required.');
  if (d.M === Page && data.slug !== 'home' && RESERVED.has(data.slug) && data.slug !== existing?.slug) {
    throw httpError(400, `"${data.slug}" is reserved by the website. Choose another slug.`);
  }
}

async function uniqueSlug(M, base) {
  let slug = base;
  for (let i = 2; await M.exists({ slug }); i += 1) slug = `${base}-${i}`;
  return slug;
}

/* ------------------------------------------------------------------ */
/* Dashboard, SEO, activity                                            */
/* ------------------------------------------------------------------ */
router.get('/dashboard', wrap(async (req, res) => {
  const role = req.user.role;
  const out = {};
  const jobs = [];
  if (can(role, 'content')) {
    jobs.push(Page.countDocuments({ publishState: 'published' }).then((n) => (out.publishedPages = n)));
    jobs.push(Page.countDocuments({ $or: [{ publishState: 'draft' }, { draft: { $ne: null } }] }).then((n) => (out.draftPages = n)));
    jobs.push(Service.countDocuments({ active: true }).then((n) => (out.activeServices = n)));
  }
  if (can(role, 'projects')) jobs.push(Project.countDocuments().then((n) => (out.projects = n)));
  if (can(role, 'enquiries')) jobs.push(Enquiry.countDocuments({ status: 'new' }).then((n) => (out.newEnquiries = n)));
  if (can(role, 'careers')) jobs.push(CareerApplication.countDocuments({ status: 'new' }).then((n) => (out.newApplications = n)));
  if (can(role, 'logs')) jobs.push(ActivityLog.find().sort({ createdAt: -1 }).limit(10).lean().then((l) => (out.recentActivity = l)));
  const recent = [];
  const add = (M, resource, perm, fields) => can(role, perm) && jobs.push(
    M.find().sort({ updatedAt: -1 }).limit(5).select(`${fields} updatedAt`).lean().then((rows) => rows.forEach((r) => recent.push({ resource, id: r._id, title: r.title || r.name, updatedAt: r.updatedAt }))),
  );
  add(Page, 'pages', 'content', 'title');
  add(Service, 'services', 'content', 'title');
  add(Blog, 'blogs', 'content', 'title');
  add(Project, 'projects', 'projects', 'title');
  await Promise.all(jobs);
  out.recentUpdates = recent.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 8);
  res.json(out);
}));

router.get('/activity', requirePerm('logs'), wrap(async (req, res) => {
  const page = Math.max(1, +req.query.page || 1);
  const limit = 50;
  const [items, total] = await Promise.all([
    ActivityLog.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    ActivityLog.countDocuments(),
  ]);
  res.json({ items, total, page, limit });
}));

router.get('/seo-audit', requirePerm('content'), wrap(async (_req, res) => {
  const sources = [['Page', Page, 'pages'], ['Service', Service, 'services'], ['Industry', Industry, 'industries'], ['Blog', Blog, 'blogs'], ['Project', Project, 'projects']];
  const rows = await Promise.all(sources.map(async ([type, M, resource]) => {
    const docs = await M.find().select('title name slug seo').lean();
    return docs.map((d) => ({ type, resource, id: d._id, title: d.title || d.name, slug: d.slug, metaTitle: d.seo?.metaTitle || '', metaDescription: d.seo?.metaDescription || '', ogImage: d.seo?.ogImage || '' }));
  }));
  res.json({ items: rows.flat() });
}));

/* ------------------------------------------------------------------ */
/* Pages: draft / publish workflow                                      */
/* ------------------------------------------------------------------ */
const pagePerm = requirePerm('content');

router.get('/pages/by-slug/:slug', pagePerm, wrap(async (req, res) => {
  const page = await Page.findOne({ slug: slugify(req.params.slug) }).lean();
  if (!page) return res.status(404).json({ error: 'Not found' });
  res.json(page);
}));

router.put('/pages/:id/draft', pagePerm, wrap(async (req, res) => {
  if (!validId(req.params.id)) return res.status(404).json({ error: 'Not found' });
  const page = await Page.findById(req.params.id);
  if (!page) return res.status(404).json({ error: 'Not found' });
  const blocks = cleanBlocks(req.body?.blocks, { allowHtml: canHtml(req.user.role), existingHtml: htmlMap(page.blocks, page.draft?.blocks) });
  const title = typeof req.body?.title === 'string' && req.body.title.trim() ? req.body.title.trim().slice(0, 160) : page.draft?.title || page.title;
  let seo = page.draft?.seo || page.seo || {};
  if (req.body?.seo && typeof req.body.seo === 'object') {
    assertSafe(req.body.seo);
    const s = req.body.seo;
    seo = { metaTitle: String(s.metaTitle || '').slice(0, 200), metaDescription: String(s.metaDescription || '').slice(0, 400), ogImage: String(s.ogImage || ''), canonicalUrl: String(s.canonicalUrl || ''), noIndex: !!s.noIndex };
  }
  page.draft = { blocks, title, seo };
  page.markModified('draft');
  await page.save();
  res.json({ ok: true, savedAt: new Date() });
}));

router.post('/pages/:id/publish', pagePerm, wrap(async (req, res) => {
  if (!validId(req.params.id)) return res.status(404).json({ error: 'Not found' });
  const page = await Page.findById(req.params.id);
  if (!page) return res.status(404).json({ error: 'Not found' });
  if (!page.draft) return res.status(400).json({ error: 'There is no draft to publish.' });
  let schedule = null;
  if (req.body?.schedule) {
    schedule = new Date(req.body.schedule);
    if (Number.isNaN(schedule.getTime()) || schedule <= new Date()) return res.status(400).json({ error: 'Choose a future date to schedule publication.' });
    if (page.publishState === 'published') return res.status(409).json({ error: 'This page is already live. Publish now, or set it to draft first to schedule it.' });
  }
  await snapshot(req, 'pages', page._id, { title: page.title, blocks: page.blocks, seo: page.seo }, 'Live version before publish');
  const draft = page.draft;
  page.blocks = draft.blocks;
  page.title = draft.title || page.title;
  page.seo = draft.seo || page.seo;
  page.draft = null;
  page.markModified('draft');
  if (schedule) { page.publishState = 'scheduled'; page.publishAt = schedule; } else { page.publishState = 'published'; page.publishAt = undefined; }
  await page.save();
  await log(req, schedule ? 'schedule' : 'publish', 'pages', page._id, `${schedule ? 'Scheduled' : 'Published'} page "${page.title}"`);
  res.json({ ok: true, publishState: page.publishState });
}));

router.post('/pages/:id/discard-draft', pagePerm, wrap(async (req, res) => {
  if (!validId(req.params.id)) return res.status(404).json({ error: 'Not found' });
  const page = await Page.findByIdAndUpdate(req.params.id, { $set: { draft: null } });
  if (!page) return res.status(404).json({ error: 'Not found' });
  await log(req, 'discard_draft', 'pages', page._id, `Discarded draft of "${page.title}"`);
  res.json({ ok: true });
}));

/* ------------------------------------------------------------------ */
/* Website settings                                                     */
/* ------------------------------------------------------------------ */
const SETTINGS_KEYS = ['company', 'contact', 'social', 'announcement', 'header', 'footer', 'seoDefaults'];
router.get('/settings', requirePerm('settings'), wrap(async (_req, res) => {
  res.json(await WebsiteSettings.findOneAndUpdate({ key: 'main' }, { $setOnInsert: { key: 'main' } }, { upsert: true, new: true }).lean());
}));
router.put('/settings', requirePerm('settings'), wrap(async (req, res) => {
  const set = {};
  for (const k of SETTINGS_KEYS) if (req.body?.[k] !== undefined) set[k] = req.body[k];
  assertSafe(set);
  const map = set.contact?.mapEmbedUrl;
  if (map && !/^https:\/\/(www\.google\.com\/maps\/embed|maps\.google\.com\/)/.test(map)) {
    return res.status(400).json({ error: 'Map URL must be a Google Maps embed link (https://www.google.com/maps/embed?...).' });
  }
  const doc = await WebsiteSettings.findOneAndUpdate({ key: 'main' }, { $set: set }, { new: true, upsert: true, runValidators: true }).lean();
  await log(req, 'update', 'settings', doc._id, 'Updated website settings');
  res.json(doc);
}));

/* ------------------------------------------------------------------ */
/* Media library                                                        */
/* ------------------------------------------------------------------ */
const upload = multer({ dest: tmpDir, limits: { fileSize: 60 * 1024 * 1024, files: 10 } });
const mediaPerm = requirePerm('media');

router.get('/media', mediaPerm, wrap(async (req, res) => {
  const page = Math.max(1, +req.query.page || 1);
  const limit = Math.min(100, Math.max(1, +req.query.limit || 40));
  const filter = {};
  if (typeof req.query.q === 'string' && req.query.q.trim()) {
    const rx = new RegExp(esc(req.query.q.trim().slice(0, 60)), 'i');
    filter.$or = [{ originalName: rx }, { alt: rx }, { tags: rx }];
  }
  if (typeof req.query.category === 'string' && req.query.category) filter.category = req.query.category;
  if (req.query.kind === 'image' || req.query.kind === 'video') filter.kind = req.query.kind;
  const [items, total, categories] = await Promise.all([
    Media.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Media.countDocuments(filter),
    Media.distinct('category'),
  ]);
  res.json({ items, total, page, limit, categories });
}));

router.post('/media', mediaPerm, upload.array('files', 10), wrap(async (req, res) => {
  const items = [];
  const errors = [];
  const category = typeof req.body?.category === 'string' && req.body.category.trim() ? req.body.category.trim().slice(0, 40) : 'General';
  for (const f of req.files || []) {
    try {
      const info = await processUpload(f.path, f.originalname, mediaDir);
      const doc = await Media.create({ ...info, originalName: f.originalname.slice(0, 200), category, uploadedBy: req.user.id });
      items.push(doc);
    } catch (e) {
      errors.push({ name: f.originalname, error: e.message });
    } finally {
      await fs.unlink(f.path).catch(() => {});
    }
  }
  if (items.length) await log(req, 'upload', 'media', null, `Uploaded ${items.length} file(s)`);
  res.status(items.length ? 201 : 400).json({ items, errors });
}));

router.patch('/media/:id', mediaPerm, wrap(async (req, res) => {
  if (!validId(req.params.id)) return res.status(404).json({ error: 'Not found' });
  const set = {};
  if (typeof req.body.alt === 'string') set.alt = req.body.alt.slice(0, 300);
  if (typeof req.body.category === 'string' && req.body.category.trim()) set.category = req.body.category.trim().slice(0, 40);
  if (typeof req.body.originalName === 'string' && req.body.originalName.trim()) set.originalName = req.body.originalName.trim().slice(0, 200);
  if (Array.isArray(req.body.tags)) set.tags = req.body.tags.map((t) => String(t).trim().slice(0, 30)).filter(Boolean).slice(0, 20);
  const doc = await Media.findByIdAndUpdate(req.params.id, { $set: set }, { new: true }).lean();
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.json(doc);
}));

router.delete('/media/:id', mediaPerm, wrap(async (req, res) => {
  if (!validId(req.params.id)) return res.status(404).json({ error: 'Not found' });
  const doc = await Media.findByIdAndDelete(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  await removeMediaDir(mediaDir, doc.dir);
  await log(req, 'delete', 'media', doc._id, `Deleted media "${doc.originalName}"`);
  res.json({ ok: true });
}));

/* ------------------------------------------------------------------ */
/* Enquiries and career applications                                    */
/* ------------------------------------------------------------------ */
const csvCell = (v) => {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // neutralise spreadsheet formulas
  return `"${s.replace(/"/g, '""')}"`;
};

function listHandler(M, searchFields, statuses) {
  return wrap(async (req, res) => {
    const page = Math.max(1, +req.query.page || 1);
    const limit = Math.min(100, Math.max(1, +req.query.limit || 25));
    const filter = {};
    if (typeof req.query.status === 'string' && statuses.includes(req.query.status)) filter.status = req.query.status;
    if (typeof req.query.q === 'string' && req.query.q.trim()) {
      const rx = new RegExp(esc(req.query.q.trim().slice(0, 60)), 'i');
      filter.$or = searchFields.map((f) => ({ [f]: rx }));
    }
    const [items, total] = await Promise.all([
      M.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      M.countDocuments(filter),
    ]);
    res.json({ items, total, page, limit });
  });
}

const ENQ_STATUS = ['new', 'read', 'replied', 'closed'];
const APP_STATUS = ['new', 'reviewed', 'shortlisted', 'rejected'];

router.get('/enquiries', requirePerm('enquiries'), listHandler(Enquiry, ['name', 'email', 'company', 'message'], ENQ_STATUS));
router.get('/enquiries/export.csv', requirePerm('enquiries'), wrap(async (_req, res) => {
  const rows = await Enquiry.find().sort({ createdAt: -1 }).limit(5000).lean();
  const head = ['Date', 'Name', 'Email', 'Phone', 'Company', 'Service', 'Status', 'Message', 'Source'];
  const lines = rows.map((r) => [r.createdAt.toISOString(), r.name, r.email, r.phone, r.company, r.service, r.status, r.message, r.source].map(csvCell).join(','));
  res.type('text/csv').set('Content-Disposition', 'attachment; filename="enquiries.csv"').send([head.map(csvCell).join(','), ...lines].join('\r\n'));
}));
router.patch('/enquiries/:id', requirePerm('enquiries'), wrap(async (req, res) => {
  if (!validId(req.params.id) || !ENQ_STATUS.includes(req.body?.status)) return res.status(400).json({ error: 'Invalid request.' });
  const doc = await Enquiry.findByIdAndUpdate(req.params.id, { $set: { status: req.body.status } }, { new: true }).lean();
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.json(doc);
}));
router.delete('/enquiries/:id', requirePerm('enquiries'), wrap(async (req, res) => {
  if (!validId(req.params.id)) return res.status(404).json({ error: 'Not found' });
  const doc = await Enquiry.findByIdAndDelete(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  await log(req, 'delete', 'enquiries', doc._id, `Deleted enquiry from ${doc.email}`);
  res.json({ ok: true });
}));

router.get('/applications', requirePerm('careers'), listHandler(CareerApplication, ['name', 'email', 'jobTitle'], APP_STATUS));
router.patch('/applications/:id', requirePerm('careers'), wrap(async (req, res) => {
  if (!validId(req.params.id) || !APP_STATUS.includes(req.body?.status)) return res.status(400).json({ error: 'Invalid request.' });
  const doc = await CareerApplication.findByIdAndUpdate(req.params.id, { $set: { status: req.body.status } }, { new: true }).lean();
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.json(doc);
}));
router.get('/applications/:id/resume', requirePerm('careers'), wrap(async (req, res) => {
  if (!validId(req.params.id)) return res.status(404).json({ error: 'Not found' });
  const app = await CareerApplication.findById(req.params.id).lean();
  if (!app?.resume?.filename) return res.status(404).json({ error: 'Not found' });
  const file = path.join(resumeDir, path.basename(app.resume.filename));
  const name = String(app.resume.originalName || 'resume').replace(/[^\w.\- ]/g, '_');
  res.download(file, name, (err) => { if (err && !res.headersSent) res.status(404).json({ error: 'File not found' }); });
}));
router.delete('/applications/:id', requirePerm('careers'), wrap(async (req, res) => {
  if (!validId(req.params.id)) return res.status(404).json({ error: 'Not found' });
  const doc = await CareerApplication.findByIdAndDelete(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  if (doc.resume?.filename) await fs.unlink(path.join(resumeDir, path.basename(doc.resume.filename))).catch(() => {});
  await log(req, 'delete', 'applications', doc._id, `Deleted application from ${doc.email}`);
  res.json({ ok: true });
}));

/* ------------------------------------------------------------------ */
/* Generic CRUD                                                         */
/* ------------------------------------------------------------------ */
const FILTER_KEYS = ['publishState', 'projectStatus', 'active', 'type', 'category', 'role', 'group'];

router.get('/:resource', wrap(async (req, res) => {
  const d = resolve(req, res); if (!d) return;
  const page = Math.max(1, +req.query.page || 1);
  const limit = Math.min(100, Math.max(1, +req.query.limit || 25));
  const filter = {};
  if (typeof req.query.q === 'string' && req.query.q.trim()) {
    const rx = new RegExp(esc(req.query.q.trim().slice(0, 60)), 'i');
    filter.$or = d.search.map((f) => ({ [f]: rx }));
  }
  for (const k of FILTER_KEYS) {
    const v = req.query[k];
    if (typeof v === 'string' && v && d.M.schema.path(k)) filter[k] = v === 'true' ? true : v === 'false' ? false : v;
  }
  let q = d.M.find(filter).sort(d.sort || { updatedAt: -1 }).skip((page - 1) * limit).limit(limit);
  if (d.populate) q = q.populate(d.populate);
  if (d.M === Page) q = q.select('-blocks');
  const [items, total] = await Promise.all([q.lean(), d.M.countDocuments(filter)]);
  if (d.M === Page) items.forEach((i) => { i.hasDraft = !!i.draft; delete i.draft; });
  res.json({ items, total, page, limit });
}));

router.post('/:resource', wrap(async (req, res) => {
  const d = resolve(req, res); if (!d) return;
  let data = clean(req.body, d);
  assertSafe(data);
  if (d.beforeSave) data = await d.beforeSave(data, { req, existing: null });
  prepSlug(d, data, null);
  if (d.M === Page) {
    const title = String(data.title || 'Untitled').trim();
    data.blocks = [];
    data.publishState = data.publishState || 'draft';
    data.draft = { blocks: [{ id: 'hero', type: 'hero', props: { size: 'compact', headline: title }, style: {} }], title, seo: data.seo || {} };
  }
  const doc = await d.M.create(data);
  await log(req, 'create', req.params.resource, doc._id, `Created "${label(doc)}"`);
  res.status(201).json(doc.toJSON());
}));

router.get('/:resource/:id', wrap(async (req, res) => {
  const d = resolve(req, res); if (!d) return;
  if (!validId(req.params.id)) return res.status(404).json({ error: 'Not found' });
  const doc = await d.M.findById(req.params.id).lean();
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.json(doc);
}));

router.put('/:resource/:id', wrap(async (req, res) => {
  const d = resolve(req, res); if (!d) return;
  if (!validId(req.params.id)) return res.status(404).json({ error: 'Not found' });
  const existing = await d.M.findById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  let data = clean(req.body, d);
  assertSafe(data);
  if (d.beforeSave) data = await d.beforeSave(data, { req, existing });
  prepSlug(d, data, existing);
  if (d.M === Page && existing.slug === 'home' && data.publishState && data.publishState !== 'published') {
    throw httpError(400, 'The home page must stay published.');
  }
  if (d.versioned && d.M !== Page) await snapshot(req, req.params.resource, existing._id, plain(existing), 'Before edit');
  existing.set(data);
  await existing.save();
  await log(req, 'update', req.params.resource, existing._id, `Updated "${label(existing)}"`);
  res.json(existing.toJSON());
}));

router.delete('/:resource/:id', wrap(async (req, res) => {
  const d = resolve(req, res); if (!d) return;
  if (!validId(req.params.id)) return res.status(404).json({ error: 'Not found' });
  const existing = await d.M.findById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  if (d.M === Page && existing.slug === 'home') throw httpError(400, 'The home page cannot be deleted.');
  if (d.M === ProjectCategory && (await Project.exists({ category: existing._id }))) throw httpError(409, 'This category still has projects. Move or delete them first.');
  if (d.M === Menu) throw httpError(400, 'Menus cannot be deleted.');
  if (d.beforeDelete) await d.beforeDelete(existing, { req });
  await existing.deleteOne();
  await log(req, 'delete', req.params.resource, existing._id, `Deleted "${label(existing)}"`);
  res.json({ ok: true });
}));

router.post('/:resource/:id/duplicate', wrap(async (req, res) => {
  const d = resolve(req, res); if (!d) return;
  if (!d.dup || !validId(req.params.id)) return res.status(404).json({ error: 'Not found' });
  const src = await d.M.findById(req.params.id).lean();
  if (!src) return res.status(404).json({ error: 'Not found' });
  SYSTEM.forEach((k) => delete src[k]);
  if (src.title) src.title = `${src.title} (copy)`;
  src.slug = await uniqueSlug(d.M, `${src.slug}-copy`);
  if (d.M.schema.path('publishState')) src.publishState = 'draft';
  if (d.M === Page) src.draft = null;
  if (d.M.schema.path('active')) src.active = false;
  const doc = await d.M.create(src);
  await log(req, 'duplicate', req.params.resource, doc._id, `Duplicated as "${label(doc)}"`);
  res.status(201).json(doc.toJSON());
}));

router.get('/:resource/:id/revisions', wrap(async (req, res) => {
  const d = resolve(req, res); if (!d) return;
  if (!d.versioned || !validId(req.params.id)) return res.status(404).json({ error: 'Not found' });
  const items = await ContentRevision.find({ resource: req.params.resource, docId: req.params.id }).sort({ createdAt: -1 }).select('label author createdAt').limit(30).lean();
  res.json({ items });
}));

router.post('/:resource/:id/revisions/:rid/restore', wrap(async (req, res) => {
  const d = resolve(req, res); if (!d) return;
  if (!d.versioned || !validId(req.params.id) || !validId(req.params.rid)) return res.status(404).json({ error: 'Not found' });
  const [existing, rev] = await Promise.all([
    d.M.findById(req.params.id),
    ContentRevision.findOne({ _id: req.params.rid, resource: req.params.resource, docId: req.params.id }).lean(),
  ]);
  if (!existing || !rev) return res.status(404).json({ error: 'Not found' });
  if (d.M === Page) {
    // Restores into the draft so the editor can review it before publishing.
    const blocks = cleanBlocks(rev.snapshot.blocks || [], { allowHtml: canHtml(req.user.role), existingHtml: htmlMap(existing.blocks, existing.draft?.blocks) });
    existing.draft = { blocks, title: rev.snapshot.title || existing.title, seo: rev.snapshot.seo || {} };
    existing.markModified('draft');
  } else {
    assertSafe(rev.snapshot);
    await snapshot(req, req.params.resource, existing._id, plain(existing), 'Before restore');
    const data = { ...rev.snapshot };
    (d.deny || []).forEach((k) => delete data[k]);
    existing.set(data);
  }
  await existing.save();
  await log(req, 'restore', req.params.resource, existing._id, `Restored an earlier version of "${label(existing)}"`);
  res.json({ ok: true, intoDraft: d.M === Page });
}));

export default router;
