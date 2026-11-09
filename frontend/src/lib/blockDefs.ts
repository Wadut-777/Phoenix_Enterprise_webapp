/** Field schema used by the admin forms and the editor's Content panel. */
export type Field = {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'bool' | 'select' | 'date' | 'datetime' | 'color' | 'image' | 'video'
    | 'paras' | 'lines' | 'tags' | 'list' | 'group' | 'ref' | 'multiref' | 'password';
  help?: string;
  placeholder?: string;
  options?: { value: string; label: string }[];
  fields?: Field[];
  itemLabel?: string;
  source?: string;      // admin collection for ref/multiref
  valueKey?: string;    // '_id' | 'slug'
  labelKey?: string;
  readOnlyOnEdit?: boolean;
};

const link = (key: string, label: string): Field => ({ key, label, type: 'group', fields: [
  { key: 'label', label: 'Label', type: 'text' },
  { key: 'url', label: 'Link (e.g. /contact or https://…)', type: 'text' },
] });

const head: Field[] = [
  { key: 'eyebrow', label: 'Small label above heading', type: 'text' },
  { key: 'heading', label: 'Heading', type: 'text' },
  { key: 'intro', label: 'Introduction', type: 'textarea' },
];

export type BlockDef = { label: string; description: string; fields: Field[]; defaults: () => Record<string, any> };

export const blockDefs: Record<string, BlockDef> = {
  hero: {
    label: 'Hero banner', description: 'Large banner with headline, image or video and buttons.',
    fields: [
      { key: 'size', label: 'Height', type: 'select', options: [{ value: 'full', label: 'Full screen' }, { value: 'compact', label: 'Compact' }] },
      { key: 'eyebrow', label: 'Small label', type: 'text' },
      { key: 'headline', label: 'Headline', type: 'text' },
      { key: 'subheadline', label: 'Supporting text', type: 'textarea' },
      { key: 'image', label: 'Background image', type: 'image' },
      { key: 'video', label: 'Background video (optional)', type: 'video' },
      link('primaryCta', 'Primary button'),
      link('secondaryCta', 'Secondary button'),
    ],
    defaults: () => ({ size: 'compact', eyebrow: '', headline: 'Your headline here', subheadline: '', primaryCta: { label: '', url: '' }, secondaryCta: { label: '', url: '' } }),
  },
  intro: {
    label: 'Company introduction', description: 'Text on the left with highlight points beside it.',
    fields: [
      { key: 'eyebrow', label: 'Small label', type: 'text' }, { key: 'heading', label: 'Heading', type: 'text' },
      { key: 'body', label: 'Paragraphs (blank line between)', type: 'paras' },
      { key: 'image', label: 'Image (optional)', type: 'image' },
      { key: 'highlights', label: 'Highlights', type: 'list', itemLabel: 'Highlight', fields: [{ key: 'title', label: 'Title', type: 'text' }, { key: 'text', label: 'Text', type: 'textarea' }] },
      link('link', 'Link'),
    ],
    defaults: () => ({ eyebrow: 'About', heading: 'Introduce your company', body: ['Write a short overview here.'], highlights: [], link: { label: '', url: '' } }),
  },
  richText: {
    label: 'Text section', description: 'Heading and paragraphs.',
    fields: [{ key: 'heading', label: 'Heading', type: 'text' }, { key: 'body', label: 'Paragraphs (blank line between)', type: 'paras', help: 'Start a paragraph with "## " for a sub-heading or "- " for a bullet.' }],
    defaults: () => ({ heading: 'Section heading', body: ['Write your text here.'] }),
  },
  textImage: {
    label: 'Text + image', description: 'Text beside a photograph.',
    fields: [
      { key: 'eyebrow', label: 'Small label', type: 'text' }, { key: 'heading', label: 'Heading', type: 'text' },
      { key: 'body', label: 'Paragraphs', type: 'paras' }, { key: 'image', label: 'Image', type: 'image' },
      { key: 'imageSide', label: 'Image position', type: 'select', options: [{ value: 'right', label: 'Right' }, { value: 'left', label: 'Left' }] },
    ],
    defaults: () => ({ eyebrow: '', heading: 'Heading', body: ['Write your text here.'], image: '', imageSide: 'right' }),
  },
  twoColumn: {
    label: 'Two columns', description: 'Two side-by-side text columns.',
    fields: [
      ...head,
      { key: 'left', label: 'Left column', type: 'group', fields: [{ key: 'heading', label: 'Heading', type: 'text' }, { key: 'body', label: 'Paragraphs', type: 'paras' }] },
      { key: 'right', label: 'Right column', type: 'group', fields: [{ key: 'heading', label: 'Heading', type: 'text' }, { key: 'body', label: 'Paragraphs', type: 'paras' }] },
    ],
    defaults: () => ({ eyebrow: '', heading: '', intro: '', left: { heading: 'Left', body: ['Text'] }, right: { heading: 'Right', body: ['Text'] } }),
  },
  fullImage: {
    label: 'Full-width image', description: 'An edge-to-edge photograph with optional caption.',
    fields: [
      { key: 'image', label: 'Image', type: 'image' }, { key: 'alt', label: 'Alt text (for accessibility)', type: 'text' },
      { key: 'caption', label: 'Caption', type: 'text' },
      { key: 'height', label: 'Height', type: 'select', options: [{ value: 'sm', label: 'Short' }, { value: 'md', label: 'Medium' }, { value: 'screen', label: 'Full screen' }] },
    ],
    defaults: () => ({ image: '', alt: '', caption: '', height: 'md' }),
  },
  serviceGrid: {
    label: 'Service grid', description: 'Cards for your services (content from Services).',
    fields: [...head, { key: 'limit', label: 'How many to show', type: 'number' }],
    defaults: () => ({ eyebrow: 'What we do', heading: 'Our services', intro: '', limit: 10 }),
  },
  projectGallery: {
    label: 'Project gallery', description: 'Project cards with category filter (content from Projects).',
    fields: [...head, { key: 'featuredOnly', label: 'Only featured projects', type: 'bool' }, { key: 'limit', label: 'How many to show', type: 'number' }],
    defaults: () => ({ eyebrow: 'Portfolio', heading: 'Featured projects', intro: '', featuredOnly: true, limit: 6 }),
  },
  featureList: {
    label: 'Feature list', description: 'Numbered points on a dark background.',
    fields: [...head, { key: 'items', label: 'Items', type: 'list', itemLabel: 'Item', fields: [{ key: 'title', label: 'Title', type: 'text' }, { key: 'text', label: 'Text', type: 'textarea' }] }],
    defaults: () => ({ eyebrow: '', heading: 'Why choose us', intro: '', items: [{ title: 'Point one', text: 'Describe it.' }] }),
  },
  industries: {
    label: 'Industries', description: 'Industry tiles (content from Industries).',
    fields: head, defaults: () => ({ eyebrow: 'Sectors', heading: 'Industries we serve', intro: '' }),
  },
  process: {
    label: 'Process steps', description: 'Numbered work-process steps.',
    fields: [...head, { key: 'steps', label: 'Steps', type: 'list', itemLabel: 'Step', fields: [{ key: 'title', label: 'Title', type: 'text' }, { key: 'text', label: 'Text', type: 'textarea' }] }],
    defaults: () => ({ eyebrow: 'How we work', heading: 'Our process', intro: '', steps: [{ title: 'Step one', text: 'Describe it.' }] }),
  },
  stats: {
    label: 'Statistics', description: 'Key figures. Only enter figures that are accurate.',
    fields: [{ key: 'heading', label: 'Heading', type: 'text' }, { key: 'items', label: 'Figures', type: 'list', itemLabel: 'Figure', fields: [{ key: 'value', label: 'Value', type: 'text' }, { key: 'suffix', label: 'Suffix (e.g. +)', type: 'text' }, { key: 'label', label: 'Label', type: 'text' }] }],
    defaults: () => ({ heading: 'At a glance', items: [] }),
  },
  clients: { label: 'Client logos', description: 'Logos from Clients.', fields: [{ key: 'heading', label: 'Heading', type: 'text' }], defaults: () => ({ heading: 'Clients & partners' }) },
  testimonials: { label: 'Testimonials', description: 'Quotes from Testimonials.', fields: [{ key: 'heading', label: 'Heading', type: 'text' }], defaults: () => ({ heading: 'What clients say' }) },
  people: {
    label: 'Leadership / people', description: 'Photos with names and roles.',
    fields: [{ key: 'eyebrow', label: 'Small label', type: 'text' }, { key: 'heading', label: 'Heading', type: 'text' },
      { key: 'items', label: 'People', type: 'list', itemLabel: 'Person', fields: [{ key: 'name', label: 'Name', type: 'text' }, { key: 'role', label: 'Role', type: 'text' }, { key: 'bio', label: 'Short bio', type: 'textarea' }, { key: 'photo', label: 'Photo', type: 'image' }] }],
    defaults: () => ({ eyebrow: '', heading: 'Leadership', items: [] }),
  },
  faq: { label: 'FAQ accordion', description: 'Questions from FAQs.', fields: [...head, { key: 'group', label: 'Only this FAQ group (optional)', type: 'text' }], defaults: () => ({ eyebrow: '', heading: 'Frequently asked questions', intro: '', group: '' }) },
  video: { label: 'Video', description: 'An uploaded video player.', fields: [{ key: 'heading', label: 'Heading', type: 'text' }, { key: 'url', label: 'Video', type: 'video' }, { key: 'poster', label: 'Poster image', type: 'image' }], defaults: () => ({ heading: '', url: '', poster: '' }) },
  cta: {
    label: 'Call-to-action banner', description: 'Heading with a button or an enquiry form.',
    fields: [{ key: 'heading', label: 'Heading', type: 'text' }, { key: 'text', label: 'Text', type: 'textarea' }, { key: 'showForm', label: 'Show enquiry form', type: 'bool' }, { key: 'buttonLabel', label: 'Button label', type: 'text' }, { key: 'buttonUrl', label: 'Button link', type: 'text' }],
    defaults: () => ({ heading: "Let's Build Something Exceptional Together.", text: '', showForm: false, buttonLabel: 'Discuss Your Project', buttonUrl: '/contact' }),
  },
  contactForm: { label: 'Contact form', description: 'The enquiry form.', fields: [{ key: 'heading', label: 'Heading', type: 'text' }, { key: 'text', label: 'Text', type: 'textarea' }], defaults: () => ({ heading: 'Contact us', text: '' }) },
  html: { label: 'Custom HTML', description: 'Raw HTML (administrators only).', fields: [{ key: 'code', label: 'HTML', type: 'textarea', help: 'Only administrators can add or change this block.' }], defaults: () => ({ code: '' }) },
};

export const styleFields: Field[] = [
  { key: 'background', label: 'Background colour', type: 'color' },
  { key: 'color', label: 'Text colour', type: 'color' },
  { key: 'paddingTop', label: 'Space above (px)', type: 'number' },
  { key: 'paddingBottom', label: 'Space below (px)', type: 'number' },
  { key: 'align', label: 'Text alignment', type: 'select', options: [{ value: '', label: 'Default' }, { value: 'left', label: 'Left' }, { value: 'center', label: 'Centre' }, { value: 'right', label: 'Right' }] },
];

export const seoFields: Field[] = [
  { key: 'metaTitle', label: 'Meta title', type: 'text', help: 'Aim for under 60 characters.' },
  { key: 'metaDescription', label: 'Meta description', type: 'textarea', help: 'Aim for 120 to 160 characters.' },
  { key: 'ogImage', label: 'Social sharing image', type: 'image' },
  { key: 'canonicalUrl', label: 'Canonical URL (optional)', type: 'text' },
  { key: 'noIndex', label: 'Hide from search engines', type: 'bool' },
];

export function emptyFrom(fields: Field[]): Record<string, any> {
  const o: Record<string, any> = {};
  for (const f of fields) {
    o[f.key] = f.type === 'bool' ? false : ['list', 'lines', 'paras', 'tags', 'multiref'].includes(f.type) ? [] : f.type === 'group' ? emptyFrom(f.fields || []) : f.type === 'number' ? null : '';
  }
  return o;
}
