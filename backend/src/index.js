import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import path from 'node:path';
import fs from 'node:fs';
import { UPLOAD_ROOT } from './lib/config.js';
import publicRoutes from './routes/public.js';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import seoRoutes from './routes/seo.js';

const {
  PORT = 5000,
  MONGODB_URI = 'mongodb://127.0.0.1:27017/phoenix',
  CORS_ORIGINS = '',
  NODE_ENV = 'development',
} = process.env;

const app = express();
app.set('trust proxy', 1); // behind nginx
app.disable('x-powered-by');

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
const origins = CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean);
app.use(cors({ origin: origins.length ? origins : false, credentials: true }));
app.use(compression());
app.use(cookieParser());
// The page editor sends whole block layouts, so admin routes get a larger JSON limit.
app.use('/api/admin', express.json({ limit: '2mb' }));
app.use(express.json({ limit: '200kb' }));

// Drop Mongo operator keys ($where, a.b) from user input to block NoSQL injection.
const strip = (obj) => {
  if (!obj || typeof obj !== 'object') return;
  for (const key of Object.keys(obj)) {
    if (key.startsWith('$') || key.includes('.')) delete obj[key];
    else strip(obj[key]);
  }
};
app.use((req, _res, next) => { strip(req.body); strip(req.query); strip(req.params); next(); });

app.use(['/api/admin', '/api/auth'], (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
app.use('/api', rateLimit({ windowMs: 60 * 1000, limit: 240, standardHeaders: true, legacyHeaders: false, skip: (req) => req.path.startsWith('/admin') }));
app.use('/api/admin', rateLimit({ windowMs: 60 * 1000, limit: 600, standardHeaders: true, legacyHeaders: false }));

app.get('/api/health', (_req, res) => {
  const ok = mongoose.connection.readyState === 1;
  res.status(ok ? 200 : 503).json({ status: ok ? 'ok' : 'degraded', db: ok });
});

// Publicly readable media only. Resumes live in a separate, never-served directory.
const mediaDir = path.join(UPLOAD_ROOT, 'media');
fs.mkdirSync(mediaDir, { recursive: true });
app.use('/uploads/media', express.static(mediaDir, { maxAge: '30d', immutable: true, index: false, dotfiles: 'deny' }));

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', publicRoutes);
app.use('/', seoRoutes);

app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  if (err?.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: req.path.includes('careers') ? 'Resume must be 5 MB or smaller.' : 'File is too large.' });
  }
  if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'Request is too large.' });
  if (err?.name === 'ValidationError') {
    const first = Object.values(err.errors || {})[0];
    return res.status(400).json({ error: first?.message || 'Some fields are invalid.' });
  }
  if (err?.name === 'CastError') return res.status(400).json({ error: `Invalid value for "${err.path}".` });
  if (err?.code === 11000) return res.status(409).json({ error: 'That slug or unique value is already in use.' });
  if (err?.message?.startsWith('Resume must be')) return res.status(400).json({ error: err.message });
  if (err?.status && err.status < 500) return res.status(err.status).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: NODE_ENV === 'production' ? 'Something went wrong.' : String(err.message) });
});

async function connect() {
  for (let attempt = 1; ; attempt += 1) {
    try {
      await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
      console.log('MongoDB connected');
      return;
    } catch (e) {
      console.error(`MongoDB connection failed (attempt ${attempt}): ${e.message}`);
      await new Promise((r) => setTimeout(r, Math.min(attempt * 2000, 15000)));
    }
  }
}

app.listen(PORT, () => console.log(`API listening on :${PORT}`));
connect();
