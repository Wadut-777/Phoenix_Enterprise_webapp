import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
import { ACCESS_SECRET } from '../lib/config.js';
import { can } from '../lib/rbac.js';

/** Requires a valid access cookie and an active account. Looked up each request so deactivation is immediate. */
export async function authenticate(req, res, next) {
  try {
    const token = req.cookies?.pe_access;
    if (!token) return res.status(401).json({ error: 'Please sign in.' });
    let payload;
    try {
      payload = jwt.verify(token, ACCESS_SECRET, { algorithms: ['HS256'] });
    } catch {
      return res.status(401).json({ error: 'Session expired.' });
    }
    const user = await User.findById(payload.sub).select('name email role active').lean();
    if (!user || !user.active) return res.status(401).json({ error: 'Please sign in.' });
    req.user = { id: String(user._id), name: user.name, email: user.email, role: user.role };
    next();
  } catch (e) {
    next(e);
  }
}

export const requirePerm = (perm) => (req, res, next) =>
  can(req.user.role, perm) ? next() : res.status(403).json({ error: 'You do not have permission for this.' });

/** Double-submit CSRF check: state-changing requests must echo the pe_csrf cookie in a header. */
export function csrfCheck(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const cookie = req.cookies?.pe_csrf;
  const header = req.get('x-csrf-token');
  const ok =
    cookie && header && cookie.length === header.length &&
    crypto.timingSafeEqual(Buffer.from(cookie), Buffer.from(header));
  return ok ? next() : res.status(403).json({ error: 'Invalid security token. Please refresh the page.' });
}
