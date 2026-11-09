import crypto from 'node:crypto';

export const isProd = process.env.NODE_ENV === 'production';

function secret(name) {
  const v = process.env[name];
  if (v && v.length >= 32) return v;
  if (isProd) {
    console.error(`${name} must be set to a random value of at least 32 characters.`);
    process.exit(1);
  }
  console.warn(`[dev] ${name} is not set (or shorter than 32 chars); using an ephemeral secret. Sessions reset on restart.`);
  return crypto.randomBytes(48).toString('hex');
}

export const ACCESS_SECRET = secret('JWT_ACCESS_SECRET');
export const REFRESH_SECRET = secret('JWT_REFRESH_SECRET');
export const UPLOAD_ROOT = process.env.UPLOAD_DIR || './uploads';
