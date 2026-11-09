// Roles and the permission groups each one holds.
export const ROLES = ['super_admin', 'admin', 'content_editor', 'project_manager', 'enquiry_manager'];

const ALL = ['content', 'settings', 'projects', 'enquiries', 'careers', 'media', 'logs', 'users'];

export const PERMS = {
  super_admin: ALL,
  admin: ALL.filter((p) => p !== 'users'),
  content_editor: ['content', 'media'],
  project_manager: ['projects', 'media'],
  enquiry_manager: ['enquiries', 'careers'],
};

export const can = (role, perm) => PERMS[role]?.includes(perm) ?? false;

/** Custom HTML blocks can run arbitrary markup, so only these roles may write them. */
export const canHtml = (role) => role === 'super_admin' || role === 'admin';
