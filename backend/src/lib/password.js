import bcrypt from 'bcryptjs';

const COST = 12;

export const hashPassword = (pw) => bcrypt.hash(pw, COST);
export const verifyPassword = (pw, hash) => bcrypt.compare(pw, hash);

let dummy;
/** Burns the same time as a real check so unknown emails can't be told apart by response time. */
export async function dummyVerify(pw) {
  dummy ??= await bcrypt.hash('not-a-real-password', COST);
  await bcrypt.compare(String(pw), dummy);
}

export function passwordProblem(pw) {
  if (typeof pw !== 'string' || pw.length < 10) return 'Password must be at least 10 characters.';
  if (pw.length > 128) return 'Password must be 128 characters or fewer.';
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return 'Password must include letters and numbers.';
  return null;
}
