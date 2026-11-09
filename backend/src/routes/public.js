import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import {
  Page, Service, Project, ProjectCategory, Industry, Blog, Testimonial, Client, Faq, Job,
  Enquiry, CareerApplication, WebsiteSettings, Menu, liveFilter,
} from '../models/index.js';

const router = Router();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const notFound = (res) => res.status(404).json({ error: 'Not found' });
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const slugParam = (v) => String(v || '').toLowerCase().replace(/[^a-z0-9-]/g, '');

// ---- Site-wide -----------------------------------------------------------
router.get('/site', wrap(async (_req, res) => {
  const [settings, menus] = await Promise.all([
    WebsiteSettings.findOne({ key: 'main' }).lean(),
    Menu.find().lean(),
  ]);
  res.json({
    settings: settings || {},
    menus: Object.fromEntries(menus.map((m) => [m.key, m.items])),
  });
}));

router.get('/pages/:slug', wrap(async (req, res) => {
  const page = await Page.findOne({ slug: slugParam(req.params.slug), ...liveFilter() }).select('-draft').lean();
  if (!page) return notFound(res);
  res.json(page);
}));

// ---- Services ------------------------------------------------------------
router.get('/services', wrap(async (_req, res) => {
  const items = await Service.find({ active: true }).sort({ order: 1 }).lean();
  res.json({ items });
}));

router.get('/services/:slug', wrap(async (req, res) => {
  const service = await Service.findOne({ slug: slugParam(req.params.slug), active: true }).lean();
  if (!service) return notFound(res);
  const [related, projects] = await Promise.all([
    Service.find({ slug: { $in: service.relatedServices || [] }, active: true }).sort({ order: 1 }).lean(),
    Project.find({ serviceSlugs: service.slug, ...liveFilter() }).sort({ order: 1 }).limit(3).populate('category').lean(),
  ]);
  res.json({ service, related, projects });
}));

// ---- Projects ------------------------------------------------------------
router.get('/project-categories', wrap(async (_req, res) => {
  res.json({ items: await ProjectCategory.find().sort({ order: 1 }).lean() });
}));

router.get('/projects', wrap(async (req, res) => {
  const { category, q, status, featured } = req.query;
  const limit = Math.min(Number(req.query.limit) || 24, 60);
  const page = Math.max(Number(req.query.page) || 1, 1);
  const filter = { ...liveFilter() };
  if (typeof category === 'string' && category) {
    const cat = await ProjectCategory.findOne({ slug: slugParam(category) }).lean();
    filter.category = cat ? cat._id : null;
  }
  if (status === 'Completed' || status === 'Ongoing') filter.projectStatus = status;
  if (featured === 'true') filter.featured = true;
  if (typeof q === 'string' && q.trim()) {
    const rx = new RegExp(escapeRegex(q.trim().slice(0, 60)), 'i');
    filter.$and = [{ $or: [{ title: rx }, { summary: rx }, { client: rx }, { location: rx }] }];
  }
  const [items, total] = await Promise.all([
    Project.find(filter).sort({ order: 1, completionDate: -1 }).skip((page - 1) * limit).limit(limit).populate('category').lean(),
    Project.countDocuments(filter),
  ]);
  res.json({ items, total, page, limit });
}));

router.get('/projects/:slug', wrap(async (req, res) => {
  const project = await Project.findOne({ slug: slugParam(req.params.slug), ...liveFilter() }).populate('category').lean();
  if (!project) return notFound(res);
  const [services, related] = await Promise.all([
    Service.find({ slug: { $in: project.serviceSlugs || [] }, active: true }).sort({ order: 1 }).lean(),
    Project.find({ _id: { $ne: project._id }, category: project.category?._id, ...liveFilter() }).limit(3).populate('category').lean(),
  ]);
  res.json({ project, services, related });
}));

// ---- Industries ----------------------------------------------------------
router.get('/industries', wrap(async (_req, res) => {
  res.json({ items: await Industry.find({ active: true }).sort({ order: 1 }).lean() });
}));

router.get('/industries/:slug', wrap(async (req, res) => {
  const industry = await Industry.findOne({ slug: slugParam(req.params.slug), active: true }).lean();
  if (!industry) return notFound(res);
  const [services, projects] = await Promise.all([
    Service.find({ slug: { $in: industry.serviceSlugs || [] }, active: true }).sort({ order: 1 }).lean(),
    Project.find({ industrySlug: industry.slug, ...liveFilter() }).limit(6).populate('category').lean(),
  ]);
  res.json({ industry, services, projects });
}));

// ---- Blog / news ---------------------------------------------------------
router.get('/blogs', wrap(async (req, res) => {
  const filter = { ...liveFilter() };
  if (req.query.type === 'news' || req.query.type === 'insight') filter.type = req.query.type;
  const items = await Blog.find(filter).select('-content').sort({ publishedAt: -1 }).limit(50).lean();
  res.json({ items });
}));

router.get('/blogs/:slug', wrap(async (req, res) => {
  const post = await Blog.findOne({ slug: slugParam(req.params.slug), ...liveFilter() }).lean();
  if (!post) return notFound(res);
  res.json(post);
}));

// ---- Misc content --------------------------------------------------------
router.get('/testimonials', wrap(async (_req, res) => {
  res.json({ items: await Testimonial.find({ active: true }).sort({ order: 1 }).lean() });
}));
router.get('/clients', wrap(async (_req, res) => {
  res.json({ items: await Client.find({ active: true }).sort({ order: 1 }).lean() });
}));
router.get('/faqs', wrap(async (_req, res) => {
  res.json({ items: await Faq.find({ active: true }).sort({ group: 1, order: 1 }).lean() });
}));

// ---- Careers -------------------------------------------------------------
const openJobs = () => ({
  active: true,
  $or: [{ closingDate: { $exists: false } }, { closingDate: null }, { closingDate: { $gte: new Date() } }],
});
router.get('/jobs', wrap(async (_req, res) => {
  res.json({ items: await Job.find(openJobs()).sort({ createdAt: -1 }).lean() });
}));
router.get('/jobs/:slug', wrap(async (req, res) => {
  const job = await Job.findOne({ slug: slugParam(req.params.slug), ...openJobs() }).lean();
  if (!job) return notFound(res);
  res.json(job);
}));

// ---- Form submissions ----------------------------------------------------
const formLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many submissions. Please try again later.' },
});

const clean = (max) => z.string().trim().max(max);
const enquirySchema = z.object({
  name: clean(120).min(2),
  email: clean(200).email(),
  phone: clean(40).optional().default(''),
  company: clean(160).optional().default(''),
  service: clean(160).optional().default(''),
  message: clean(4000).min(10),
  source: clean(160).optional().default(''),
  website: z.string().optional().default(''), // honeypot
});

router.post('/enquiries', formLimiter, wrap(async (req, res) => {
  const parsed = enquirySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Please check the highlighted fields.', fields: parsed.error.flatten().fieldErrors });
  }
  const { website, ...data } = parsed.data;
  // Honeypot: bots fill hidden fields. Pretend success without storing.
  if (website) return res.status(201).json({ ok: true });
  await Enquiry.create({ ...data, ip: req.ip, userAgent: String(req.get('user-agent') || '').slice(0, 300) });
  res.status(201).json({ ok: true });
}));

const resumeDir = path.join(process.env.UPLOAD_DIR || './uploads', 'resumes');
fs.mkdirSync(resumeDir, { recursive: true });
const allowedResume = {
  '.pdf': ['application/pdf'],
  '.doc': ['application/msword'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
};
const upload = multer({
  storage: multer.diskStorage({
    destination: resumeDir,
    filename: (_req, file, cb) => cb(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(allowedResume[ext]?.includes(file.mimetype) ? null : new Error('Resume must be a PDF, DOC or DOCX file.'), true);
  },
});

const applySchema = z.object({
  jobSlug: clean(120).optional().default(''),
  name: clean(120).min(2),
  email: clean(200).email(),
  phone: clean(40).optional().default(''),
  coverNote: clean(3000).optional().default(''),
  website: z.string().optional().default(''),
});

router.post('/careers/apply', formLimiter, upload.single('resume'), wrap(async (req, res) => {
  const discard = () => req.file && fs.unlink(req.file.path, () => {});
  const parsed = applySchema.safeParse(req.body);
  if (!parsed.success) {
    discard();
    return res.status(400).json({ error: 'Please check the highlighted fields.', fields: parsed.error.flatten().fieldErrors });
  }
  if (!req.file) return res.status(400).json({ error: 'Please attach your resume.' });
  if (parsed.data.website) { discard(); return res.status(201).json({ ok: true }); }
  const job = parsed.data.jobSlug ? await Job.findOne({ slug: slugParam(parsed.data.jobSlug) }).lean() : null;
  await CareerApplication.create({
    job: job?._id,
    jobTitle: job?.title || 'General application',
    name: parsed.data.name,
    email: parsed.data.email,
    phone: parsed.data.phone,
    coverNote: parsed.data.coverNote,
    resume: {
      filename: req.file.filename,
      originalName: req.file.originalname.slice(0, 200),
      mimeType: req.file.mimetype,
      size: req.file.size,
    },
    ip: req.ip,
  });
  res.status(201).json({ ok: true });
}));

export default router;
