import { Router } from 'express';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { User } from '../models/index.js';
import { ACCESS_SECRET, REFRESH_SECRET, isProd } from '../lib/config.js';
import { PERMS } from '../lib/rbac.js';
import { dummyVerify, hashPassword, passwordProblem, verifyPassword } from '../lib/password.js';
import { logActivity } from '../lib/activity.js';
import { authenticate, csrfCheck } from '../middleware/auth.js';

const router = Router();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const ACCESS_MS = 15 * 60 * 1000;
const REFRESH_MS = 7 * 24 * 60 * 60 * 1000;
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

const cookieBase = { secure: isProd, path: '/' };
const publicUser = (u) => ({ id: String(u._id), name: u.name, email: u.email, role: u.role, perms: PERMS[u.role] || [] });

function clearCookies(res) {
  res.clearCookie('pe_access', { ...cookieBase, httpOnly: true, sameSite: 'lax' });
  res.clearCookie('pe_refresh', { ...cookieBase, path: '/api/auth', httpOnly: true, sameSite: 'strict' });
  res.clearCookie('pe_csrf', { ...cookieBase, sameSite: 'lax' });
}

/** Issues a fresh access + refresh pair and records the refresh session (max 5 devices). */
async function startSession(res, user) {
  const jti = crypto.randomUUID();
  const access = jwt.sign({ sub: String(user._id), role: user.role }, ACCESS_SECRET, { algorithm: 'HS256', expiresIn: ACCESS_MS / 1000 });
  const refresh = jwt.sign({ sub: String(user._id), jti }, REFRESH_SECRET, { algorithm: 'HS256', expiresIn: REFRESH_MS / 1000 });
  const now = Date.now();
  await User.updateOne(
    { _id: user._id },
    [{ $set: { sessions: { $slice: [{ $concatArrays: [{ $filter: { input: { $ifNull: ['$sessions', []] }, cond: { $gt: ['$$this.expiresAt', new Date(now)] } } }, [{ jti: sha(jti), expiresAt: new Date(now + REFRESH_MS) }]] }, -5] } } }],
  );
  res.cookie('pe_access', access, { ...cookieBase, httpOnly: true, sameSite: 'lax', maxAge: ACCESS_MS });
  res.cookie('pe_refresh', refresh, { ...cookieBase, path: '/api/auth', httpOnly: true, sameSite: 'strict', maxAge: REFRESH_MS });
  res.cookie('pe_csrf', crypto.randomBytes(24).toString('hex'), { ...cookieBase, httpOnly: false, sameSite: 'lax', maxAge: REFRESH_MS });
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many sign-in attempts. Please try again later.' },
});

const loginSchema = z.object({ email: z.string().trim().email().max(200), password: z.string().min(1).max(200) });

router.post('/login', loginLimiter, wrap(async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Email and password are required.' });
  const email = parsed.data.email.toLowerCase();
  const pw = parsed.data.password;
  const user = await User.findOne({ email }).select('+passwordHash');

  if (user?.lockUntil && user.lockUntil > new Date()) {
    await dummyVerify(pw);
    return res.status(429).json({ error: 'Too many failed attempts. Please try again in a few minutes.' });
  }
  let ok = false;
  if (user?.active) ok = await verifyPassword(pw, user.passwordHash);
  else await dummyVerify(pw);

  if (!ok) {
    if (user) {
      const fails = (user.failedAttempts || 0) + 1;
      await User.updateOne({ _id: user._id }, { $set: fails >= 5 ? { failedAttempts: 0, lockUntil: new Date(Date.now() + 15 * 60 * 1000) } : { failedAttempts: fails } });
    }
    await logActivity({ user: user && { id: user._id, name: user.name, email: user.email }, action: 'login_failed', summary: `Failed sign-in for ${email}`, ip: req.ip });
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  await User.updateOne({ _id: user._id }, { $set: { failedAttempts: 0, lastLoginAt: new Date() }, $unset: { lockUntil: 1 } });
  await startSession(res, user);
  await logActivity({ user: { id: user._id, name: user.name, email: user.email }, action: 'login', summary: 'Signed in', ip: req.ip });
  res.json({ user: publicUser(user) });
}));

// Rotates the refresh token. Presenting an already-used token revokes every session for that user.
router.post('/refresh', csrfCheck, wrap(async (req, res) => {
  const token = req.cookies?.pe_refresh;
  if (!token) return res.status(401).json({ error: 'Please sign in.' });
  let payload;
  try {
    payload = jwt.verify(token, REFRESH_SECRET, { algorithms: ['HS256'] });
  } catch {
    clearCookies(res);
    return res.status(401).json({ error: 'Session expired.' });
  }
  const user = await User.findById(payload.sub).select('+sessions');
  if (!user || !user.active) { clearCookies(res); return res.status(401).json({ error: 'Please sign in.' }); }
  const hash = sha(payload.jti);
  const known = (user.sessions || []).some((s) => s.jti === hash && s.expiresAt > new Date());
  if (!known) {
    await User.updateOne({ _id: user._id }, { $set: { sessions: [] } });
    await logActivity({ user: { id: user._id, name: user.name, email: user.email }, action: 'token_reuse', summary: 'Refresh token reuse detected; all sessions revoked', ip: req.ip });
    clearCookies(res);
    return res.status(401).json({ error: 'Session expired.' });
  }
  await User.updateOne({ _id: user._id }, { $pull: { sessions: { jti: hash } } });
  await startSession(res, user);
  res.json({ user: publicUser(user) });
}));

router.post('/logout', wrap(async (req, res) => {
  try {
    const payload = jwt.verify(req.cookies?.pe_refresh || '', REFRESH_SECRET, { algorithms: ['HS256'] });
    await User.updateOne({ _id: payload.sub }, { $pull: { sessions: { jti: sha(payload.jti) } } });
  } catch { /* already signed out */ }
  clearCookies(res);
  res.json({ ok: true });
}));

router.get('/me', authenticate, (req, res) => {
  res.json({ user: { ...req.user, perms: PERMS[req.user.role] || [] } });
});

router.post('/change-password', authenticate, csrfCheck, wrap(async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  const problem = passwordProblem(newPassword);
  if (problem) return res.status(400).json({ error: problem });
  const user = await User.findById(req.user.id).select('+passwordHash');
  if (!user || !(await verifyPassword(String(currentPassword || ''), user.passwordHash))) {
    return res.status(400).json({ error: 'Current password is incorrect.' });
  }
  await User.updateOne({ _id: user._id }, { $set: { passwordHash: await hashPassword(newPassword), sessions: [] } });
  await startSession(res, user);
  await logActivity({ user: req.user, action: 'password_change', summary: 'Changed own password', ip: req.ip });
  res.json({ ok: true });
}));

export default router;
