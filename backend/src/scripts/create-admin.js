// Creates (or resets the password of) a Super Administrator.
//   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='long-password-1' ADMIN_NAME='Your Name' node src/scripts/create-admin.js
import 'dotenv/config';
import mongoose from 'mongoose';
import { User } from '../models/index.js';
import { hashPassword, passwordProblem } from '../lib/password.js';

const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD || '';
const name = process.env.ADMIN_NAME || 'Administrator';
if (!/^\S+@\S+\.\S+$/.test(email)) { console.error('Set ADMIN_EMAIL to a valid email address.'); process.exit(1); }
const problem = passwordProblem(password);
if (problem) { console.error(problem); process.exit(1); }

await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/phoenix');
const passwordHash = await hashPassword(password);
const existing = await User.findOne({ email });
if (existing) {
  await User.updateOne({ _id: existing._id }, { $set: { passwordHash, role: 'super_admin', active: true, sessions: [], failedAttempts: 0 }, $unset: { lockUntil: 1 } });
  console.log(`Updated ${email}: password reset, role super_admin.`);
} else {
  await User.create({ name, email, passwordHash, role: 'super_admin' });
  console.log(`Created super administrator ${email}.`);
}
await mongoose.disconnect();
