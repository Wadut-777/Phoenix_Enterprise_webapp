import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { seoFields, type Field } from '../lib/blockDefs';
import { Badge, fmtDate, stateTone } from './ui';

export type Cfg = {
  endpoint: string;
  title: string;
  singular: string;
  perm: string;
  fields: Field[];
  defaults?: Record<string, any>;
  columns: { label: string; render: (i: any) => ReactNode }[];
  versioned?: boolean;
  duplicable?: boolean;
  canCreate?: boolean;
  canDelete?: boolean;
  filter?: { key: string; label: string; options: { value: string; label: string }[] };
  rowActions?: (i: any) => ReactNode;
  help?: string;
};

const text = (key: string, label: string, extra: Partial<Field> = {}): Field => ({ key, label, type: 'text', ...extra });
const order: Field = { key: 'order', label: 'Display order (lower comes first)', type: 'number' };
const active: Field = { key: 'active', label: 'Active (visible on the website)', type: 'bool' };
const publish: Field[] = [
  { key: 'publishState', label: 'Status', type: 'select', options: [{ value: 'published', label: 'Published' }, { value: 'draft', label: 'Draft (hidden)' }, { value: 'scheduled', label: 'Scheduled' }] },
  { key: 'publishAt', label: 'Publish at (for scheduled)', type: 'datetime' },
];
const seo: Field = { key: 'seo', label: 'SEO', type: 'group', fields: seoFields };
const slug = text('slug', 'URL slug', { help: 'Used in the page address. Leave blank to generate from the title.' });
const state = (i: any) => <Badge tone={stateTone(i.publishState)}>{i.publishState}</Badge>;
const activeBadge = (i: any) => (i.active ? <Badge tone="green">Active</Badge> : <Badge>Hidden</Badge>);

const icons = ['building', 'factory', 'ruler', 'warehouse', 'bolt', 'shield', 'signal', 'gauge', 'wrench', 'users'].map((v) => ({ value: v, label: v }));

export const resources: Record<string, Cfg> = {
  pages: {
    endpoint: 'pages', title: 'Pages', singular: 'page', perm: 'content', versioned: true, duplicable: true,
    help: 'Page content is edited visually. Use “Edit visually” to open the live editor.',
    defaults: { publishState: 'draft', showInNav: false },
    fields: [text('title', 'Title'), slug, { key: 'showInNav', label: 'Show in navigation menu', type: 'bool' }, ...publish, seo],
    columns: [
      { label: 'Title', render: (i) => <strong>{i.title}</strong> },
      { label: 'URL', render: (i) => <code className="text-xs">/{i.slug === 'home' ? '' : i.slug}</code> },
      { label: 'Status', render: (i) => <span className="space-x-1">{state(i)}{i.hasDraft && <Badge tone="amber">Unpublished changes</Badge>}</span> },
      { label: 'Updated', render: (i) => fmtDate(i.updatedAt) },
    ],
    filter: { key: 'publishState', label: 'Status', options: [{ value: 'published', label: 'Published' }, { value: 'draft', label: 'Draft' }, { value: 'scheduled', label: 'Scheduled' }] },
    rowActions: (i) => <Link className="font-semibold text-ember" to={`${i.slug === 'home' ? '/' : `/${i.slug}`}?edit=1`}>Edit visually</Link>,
  },
  services: {
    endpoint: 'services', title: 'Services', singular: 'service', perm: 'content', versioned: true, duplicable: true,
    defaults: { active: true, icon: 'building', order: 0 },
    fields: [
      text('title', 'Title'), slug, { key: 'icon', label: 'Icon', type: 'select', options: icons },
      { key: 'summary', label: 'Short summary', type: 'textarea' }, { key: 'heroImage', label: 'Hero image', type: 'image' },
      { key: 'intro', label: 'Introduction (paragraphs)', type: 'paras' },
      { key: 'scope', label: 'Scope of services', type: 'lines' }, { key: 'capabilities', label: 'Key capabilities', type: 'lines' },
      { key: 'methodology', label: 'Execution methodology', type: 'list', itemLabel: 'Step', fields: [text('title', 'Title'), { key: 'text', label: 'Text', type: 'textarea' }] },
      { key: 'relatedServices', label: 'Related services', type: 'multiref', source: 'services', valueKey: 'slug', labelKey: 'title' },
      order, active, seo,
    ],
    columns: [{ label: 'Title', render: (i) => <strong>{i.title}</strong> }, { label: 'Status', render: activeBadge }, { label: 'Order', render: (i) => i.order }],
  },
  projects: {
    endpoint: 'projects', title: 'Projects', singular: 'project', perm: 'projects', versioned: true, duplicable: true,
    defaults: { publishState: 'published', projectStatus: 'Completed', featured: false, order: 0 },
    fields: [
      text('title', 'Title'), slug,
      { key: 'category', label: 'Category', type: 'ref', source: 'project-categories', valueKey: '_id', labelKey: 'name' },
      { key: 'serviceSlugs', label: 'Services delivered', type: 'multiref', source: 'services', valueKey: 'slug', labelKey: 'title' },
      { key: 'industrySlug', label: 'Industry', type: 'ref', source: 'industries', valueKey: 'slug', labelKey: 'name' },
      text('client', 'Client name'), text('location', 'Location'),
      { key: 'projectStatus', label: 'Project status', type: 'select', options: [{ value: 'Completed', label: 'Completed' }, { value: 'Ongoing', label: 'Ongoing' }] },
      { key: 'completionDate', label: 'Completion date', type: 'date' },
      { key: 'summary', label: 'Short summary', type: 'textarea' },
      { key: 'description', label: 'Description (paragraphs)', type: 'paras' },
      { key: 'scope', label: 'Project scope', type: 'lines' },
      { key: 'coverImage', label: 'Cover image', type: 'image' },
      { key: 'gallery', label: 'Photo gallery', type: 'list', itemLabel: 'Photo', fields: [{ key: 'url', label: 'Image', type: 'image' }, text('alt', 'Alt text')] },
      { key: 'beforeAfter', label: 'Before and after', type: 'list', itemLabel: 'Pair', fields: [{ key: 'before', label: 'Before', type: 'image' }, { key: 'after', label: 'After', type: 'image' }, text('caption', 'Caption')] },
      { key: 'featured', label: 'Featured on the home page', type: 'bool' },
      { key: 'isPlaceholder', label: 'Sample content (shows a “sample” notice)', type: 'bool' },
      order, ...publish, seo,
    ],
    columns: [
      { label: 'Title', render: (i) => <strong>{i.title}</strong> },
      { label: 'Category', render: (i) => i.category?.name || '' },
      { label: 'Project', render: (i) => <Badge tone={stateTone(i.projectStatus)}>{i.projectStatus}</Badge> },
      { label: 'Visibility', render: (i) => <span className="space-x-1">{state(i)}{i.isPlaceholder && <Badge tone="amber">Sample</Badge>}</span> },
    ],
    filter: { key: 'projectStatus', label: 'Project status', options: [{ value: 'Completed', label: 'Completed' }, { value: 'Ongoing', label: 'Ongoing' }] },
  },
  'project-categories': {
    endpoint: 'project-categories', title: 'Project categories', singular: 'category', perm: 'projects', defaults: { order: 0 },
    fields: [text('name', 'Name'), slug, order],
    columns: [{ label: 'Name', render: (i) => <strong>{i.name}</strong> }, { label: 'Slug', render: (i) => <code className="text-xs">{i.slug}</code> }, { label: 'Order', render: (i) => i.order }],
  },
  industries: {
    endpoint: 'industries', title: 'Industries', singular: 'industry', perm: 'content', versioned: true, defaults: { active: true, order: 0 },
    fields: [
      text('name', 'Name'), slug, { key: 'summary', label: 'Short summary', type: 'textarea' }, { key: 'image', label: 'Image', type: 'image' },
      { key: 'intro', label: 'Introduction (paragraphs)', type: 'paras' }, { key: 'capabilities', label: 'Capabilities', type: 'lines' },
      { key: 'serviceSlugs', label: 'Related services', type: 'multiref', source: 'services', valueKey: 'slug', labelKey: 'title' },
      order, active, seo,
    ],
    columns: [{ label: 'Name', render: (i) => <strong>{i.name}</strong> }, { label: 'Status', render: activeBadge }, { label: 'Order', render: (i) => i.order }],
  },
  blogs: {
    endpoint: 'blogs', title: 'News & insights', singular: 'post', perm: 'content', versioned: true, duplicable: true,
    defaults: { type: 'news', publishState: 'draft', publishedAt: new Date().toISOString() },
    fields: [
      text('title', 'Title'), slug, { key: 'type', label: 'Section', type: 'select', options: [{ value: 'news', label: 'News & updates' }, { value: 'insight', label: 'Insights (blog)' }] },
      { key: 'excerpt', label: 'Excerpt', type: 'textarea' }, { key: 'coverImage', label: 'Cover image', type: 'image' },
      text('author', 'Author'), { key: 'content', label: 'Content (paragraphs)', type: 'paras', help: 'Start a paragraph with "## " for a sub-heading or "- " for a bullet.' },
      { key: 'tags', label: 'Tags', type: 'tags' }, { key: 'publishedAt', label: 'Publish date', type: 'datetime' }, ...publish, seo,
    ],
    columns: [
      { label: 'Title', render: (i) => <strong>{i.title}</strong> }, { label: 'Section', render: (i) => i.type },
      { label: 'Status', render: state }, { label: 'Date', render: (i) => fmtDate(i.publishedAt) },
    ],
    filter: { key: 'type', label: 'Section', options: [{ value: 'news', label: 'News' }, { value: 'insight', label: 'Insights' }] },
  },
  testimonials: {
    endpoint: 'testimonials', title: 'Testimonials', singular: 'testimonial', perm: 'content', defaults: { active: true, order: 0 },
    help: 'Only add genuine testimonials from real clients, with their permission.',
    fields: [{ key: 'quote', label: 'Quote', type: 'textarea' }, text('author', 'Person'), text('role', 'Role'), text('company', 'Company'), order, active],
    columns: [{ label: 'Person', render: (i) => <strong>{i.author}</strong> }, { label: 'Company', render: (i) => i.company }, { label: 'Status', render: activeBadge }],
  },
  clients: {
    endpoint: 'clients', title: 'Client logos', singular: 'client', perm: 'content', defaults: { active: true, order: 0 },
    help: 'Only add clients you have permission to display.',
    fields: [text('name', 'Name'), { key: 'logo', label: 'Logo', type: 'image' }, text('url', 'Website (optional)'), order, active],
    columns: [{ label: 'Name', render: (i) => <strong>{i.name}</strong> }, { label: 'Visible', render: activeBadge }, { label: 'Order', render: (i) => i.order }],
  },
  faqs: {
    endpoint: 'faqs', title: 'FAQs', singular: 'FAQ', perm: 'content', defaults: { active: true, order: 0, group: 'General' },
    fields: [text('question', 'Question'), { key: 'answer', label: 'Answer', type: 'textarea' }, text('group', 'Group'), order, active],
    columns: [{ label: 'Question', render: (i) => <strong>{i.question}</strong> }, { label: 'Group', render: (i) => i.group }, { label: 'Status', render: activeBadge }],
  },
  jobs: {
    endpoint: 'jobs', title: 'Job openings', singular: 'job', perm: 'careers', duplicable: true, defaults: { active: true, employmentType: 'Full-time' },
    fields: [
      text('title', 'Job title'), slug, text('department', 'Department'), text('location', 'Location'), text('employmentType', 'Employment type'),
      { key: 'summary', label: 'Summary', type: 'textarea' }, { key: 'responsibilities', label: 'Responsibilities', type: 'lines' },
      { key: 'requirements', label: 'Requirements', type: 'lines' }, { key: 'closingDate', label: 'Closing date', type: 'date' }, active,
    ],
    columns: [{ label: 'Title', render: (i) => <strong>{i.title}</strong> }, { label: 'Location', render: (i) => i.location }, { label: 'Status', render: activeBadge }],
  },
  menus: {
    endpoint: 'menus', title: 'Navigation menus', singular: 'menu', perm: 'settings', versioned: true, canCreate: false, canDelete: false,
    help: 'The “header” menu drives the main navigation and its dropdown; “footer” drives the footer links. Changes apply on every page.',
    fields: [
      text('key', 'Menu', { readOnlyOnEdit: true }),
      { key: 'items', label: 'Links', type: 'list', itemLabel: 'Link', fields: [text('label', 'Label'), text('url', 'Link'), { key: 'children', label: 'Dropdown links', type: 'list', itemLabel: 'Dropdown link', fields: [text('label', 'Label'), text('url', 'Link')] }] },
    ],
    columns: [{ label: 'Menu', render: (i) => <strong>{i.key}</strong> }, { label: 'Links', render: (i) => i.items?.length ?? 0 }],
  },
  users: {
    endpoint: 'users', title: 'Users & roles', singular: 'user', perm: 'users', defaults: { role: 'content_editor', active: true },
    help: 'Super Administrator: everything. Administrator: website, CMS, settings and logs. Content Editor: pages, content and media. Project Manager: projects and media. Enquiry Manager: enquiries and applications.',
    fields: [
      text('name', 'Full name'), text('email', 'Email'),
      { key: 'role', label: 'Role', type: 'select', options: [{ value: 'super_admin', label: 'Super Administrator' }, { value: 'admin', label: 'Administrator' }, { value: 'content_editor', label: 'Content Editor' }, { value: 'project_manager', label: 'Project Manager' }, { value: 'enquiry_manager', label: 'Enquiry Manager' }] },
      { key: 'password', label: 'Password', type: 'password', help: 'At least 10 characters with letters and numbers.' },
      { key: 'active', label: 'Account active', type: 'bool' },
    ],
    columns: [
      { label: 'Name', render: (i) => <strong>{i.name}</strong> }, { label: 'Email', render: (i) => i.email },
      { label: 'Role', render: (i) => <Badge>{String(i.role).replace('_', ' ')}</Badge> }, { label: 'Status', render: (i) => (i.active ? <Badge tone="green">Active</Badge> : <Badge tone="red">Disabled</Badge>) },
      { label: 'Last sign-in', render: (i) => fmtDate(i.lastLoginAt) },
    ],
  },
};
