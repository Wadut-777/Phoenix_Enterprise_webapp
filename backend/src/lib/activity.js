import { ActivityLog } from '../models/index.js';

/** Best-effort audit trail: a logging failure never breaks the action being logged. */
export async function logActivity({ user, action, resource, docId, summary, ip }) {
  try {
    await ActivityLog.create({
      user: user?.id,
      userName: user?.name,
      userEmail: user?.email,
      action,
      resource,
      docId: docId ? String(docId) : undefined,
      summary: summary ? String(summary).slice(0, 300) : undefined,
      ip,
    });
  } catch (e) {
    console.error('activity log failed:', e.message);
  }
}
