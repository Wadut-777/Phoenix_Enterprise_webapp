import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import path from 'node:path';
import fs from 'node:fs';
import publicRoutes from './routes/public.js';
import seoRoutes from './routes/seo.js';

const {
  PORT = 5000,
  MONGODB_URI = 'mongodb://127.0.0.1:27017/phoenix',
  CORS_ORIGINS = '',
  UPLOAD_DIR = './uploads',
  NODE_ENV = 'development',
} = process.env;

const app = express();
app.set('trust proxy', 1); // behind nginx
app.disable('x-powered-by');

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
const origins = CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean);
app.use(cors({ origin: origins.length ? origins : false, credentials: true }));
app.use(compression());
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

app.use('/api', rateLimit({ windowMs: 60 * 1000, limit: 240, standardHeaders: true, legacyHeaders: false }));

app.get('/api/health', (_req, res) => {
  const ok = mongoose.connection.readyState === 1;
  res.status(ok ? 200 : 503).json({ status: ok ? 'ok' : 'degraded', db: ok });
});

// Publicly readable media only. Resumes live in a separate, never-served directory.
const mediaDir = path.join(UPLOAD_DIR, 'media');
fs.mkdirSync(mediaDir, { recursive: true });
app.use('/uploads/media', express.static(mediaDir, { maxAge: '30d', immutable: true, index: false }));

app.use('/api', publicRoutes);
app.use('/', seoRoutes);

app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err?.message?.startsWith('Resume must be') || err?.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'Resume must be 5 MB or smaller.' : err.message });
  }
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
