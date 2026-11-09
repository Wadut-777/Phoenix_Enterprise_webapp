import mongoose from 'mongoose';
import { ROLES } from '../lib/rbac.js';

const { Schema, model, models } = mongoose;
const Mixed = Schema.Types.Mixed;

const seo = new Schema(
  {
    metaTitle: String,
    metaDescription: String,
    ogImage: String,
    canonicalUrl: String,
    noIndex: { type: Boolean, default: false },
  },
  { _id: false },
);

const publishFields = {
  publishState: { type: String, enum: ['draft', 'published', 'scheduled'], default: 'published', index: true },
  publishAt: Date,
};

const image = new Schema({ url: String, alt: String }, { _id: false });

const def = (name, schema) => models[name] || model(name, schema);

/** Documents visible on the public site. */
export const liveFilter = () => ({
  $or: [{ publishState: 'published' }, { publishState: 'scheduled', publishAt: { $lte: new Date() } }],
});

export const Page = def(
  'Page',
  new Schema(
    {
      slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
      title: { type: String, required: true },
      template: { type: String, default: 'default' },
      // Block based layout. Each block: { id, type, props, style }
      blocks: { type: [Mixed], default: [] },
      // Unpublished working copy: { blocks, title, seo }. Never exposed by the public API.
      draft: { type: Mixed, default: null },
      seo,
      showInNav: { type: Boolean, default: false },
      ...publishFields,
    },
    { timestamps: true },
  ),
);

export const Service = def(
  'Service',
  new Schema(
    {
      slug: { type: String, required: true, unique: true, lowercase: true },
      title: { type: String, required: true },
      icon: String,
      summary: String,
      heroImage: String,
      intro: [String],
      scope: [String],
      capabilities: [String],
      methodology: [{ title: String, text: String, _id: false }],
      relatedServices: [String],
      order: { type: Number, default: 0, index: true },
      active: { type: Boolean, default: true, index: true },
      seo,
    },
    { timestamps: true },
  ),
);

export const ProjectCategory = def(
  'ProjectCategory',
  new Schema(
    {
      slug: { type: String, required: true, unique: true, lowercase: true },
      name: { type: String, required: true },
      order: { type: Number, default: 0 },
    },
    { timestamps: true },
  ),
);

export const Project = def(
  'Project',
  new Schema(
    {
      slug: { type: String, required: true, unique: true, lowercase: true },
      title: { type: String, required: true },
      category: { type: Schema.Types.ObjectId, ref: 'ProjectCategory', index: true },
      serviceSlugs: [String],
      industrySlug: String,
      client: String,
      location: String,
      projectStatus: { type: String, enum: ['Completed', 'Ongoing'], default: 'Completed', index: true },
      completionDate: Date,
      summary: String,
      description: [String],
      scope: [String],
      coverImage: String,
      gallery: [image],
      beforeAfter: [{ before: String, after: String, caption: String, _id: false }],
      featured: { type: Boolean, default: false, index: true },
      // True while a record is sample content that has not been replaced with real project data.
      isPlaceholder: { type: Boolean, default: false },
      order: { type: Number, default: 0 },
      seo,
      ...publishFields,
    },
    { timestamps: true },
  ),
);

export const Industry = def(
  'Industry',
  new Schema(
    {
      slug: { type: String, required: true, unique: true, lowercase: true },
      name: { type: String, required: true },
      icon: String,
      summary: String,
      intro: [String],
      capabilities: [String],
      serviceSlugs: [String],
      image: String,
      order: { type: Number, default: 0 },
      active: { type: Boolean, default: true },
      seo,
    },
    { timestamps: true },
  ),
);

export const Blog = def(
  'Blog',
  new Schema(
    {
      slug: { type: String, required: true, unique: true, lowercase: true },
      title: { type: String, required: true },
      type: { type: String, enum: ['news', 'insight'], default: 'news', index: true },
      excerpt: String,
      content: [String],
      coverImage: String,
      author: String,
      tags: [String],
      publishedAt: { type: Date, default: Date.now, index: true },
      seo,
      ...publishFields,
    },
    { timestamps: true },
  ),
);

export const Testimonial = def(
  'Testimonial',
  new Schema(
    {
      quote: { type: String, required: true },
      author: { type: String, required: true },
      role: String,
      company: String,
      order: { type: Number, default: 0 },
      active: { type: Boolean, default: true },
    },
    { timestamps: true },
  ),
);

export const Client = def(
  'Client',
  new Schema(
    {
      name: { type: String, required: true },
      logo: String,
      url: String,
      order: { type: Number, default: 0 },
      active: { type: Boolean, default: true },
    },
    { timestamps: true },
  ),
);

export const Faq = def(
  'Faq',
  new Schema(
    {
      question: { type: String, required: true },
      answer: { type: String, required: true },
      group: { type: String, default: 'General' },
      order: { type: Number, default: 0 },
      active: { type: Boolean, default: true },
    },
    { timestamps: true },
  ),
);

export const Job = def(
  'Job',
  new Schema(
    {
      slug: { type: String, required: true, unique: true, lowercase: true },
      title: { type: String, required: true },
      department: String,
      location: String,
      employmentType: String,
      summary: String,
      responsibilities: [String],
      requirements: [String],
      closingDate: Date,
      active: { type: Boolean, default: true, index: true },
    },
    { timestamps: true },
  ),
);

export const Enquiry = def(
  'Enquiry',
  new Schema(
    {
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: String,
      company: String,
      service: String,
      message: { type: String, required: true },
      source: String,
      status: { type: String, enum: ['new', 'read', 'replied', 'closed'], default: 'new', index: true },
      ip: String,
      userAgent: String,
    },
    { timestamps: true },
  ),
);

export const CareerApplication = def(
  'CareerApplication',
  new Schema(
    {
      job: { type: Schema.Types.ObjectId, ref: 'Job', index: true },
      jobTitle: String,
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: String,
      coverNote: String,
      resume: { filename: String, originalName: String, mimeType: String, size: Number },
      status: { type: String, enum: ['new', 'reviewed', 'shortlisted', 'rejected'], default: 'new', index: true },
      ip: String,
    },
    { timestamps: true },
  ),
);

export const WebsiteSettings = def(
  'WebsiteSettings',
  new Schema(
    {
      key: { type: String, default: 'main', unique: true },
      company: { name: String, tagline: String, logo: String, about: String },
      contact: {
        address: String,
        phones: [String],
        emails: [String],
        whatsapp: String,
        mapEmbedUrl: String,
        hours: String,
      },
      social: [{ label: String, url: String, _id: false }],
      announcement: { enabled: { type: Boolean, default: false }, text: String, link: String },
      header: { ctaLabel: String, ctaUrl: String },
      footer: { blurb: String, legal: String },
      seoDefaults: { titleSuffix: String, description: String, ogImage: String },
    },
    { timestamps: true },
  ),
);

export const Menu = def(
  'Menu',
  new Schema(
    {
      key: { type: String, required: true, unique: true },
      items: [
        {
          label: String,
          url: String,
          children: [{ label: String, url: String, _id: false }],
          _id: false,
        },
      ],
    },
    { timestamps: true },
  ),
);

const hideSecrets = {
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    delete ret.sessions;
    return ret;
  },
};

export const User = def(
  'User',
  new Schema(
    {
      name: { type: String, required: true, trim: true, maxlength: 120 },
      email: { type: String, required: true, unique: true, lowercase: true, trim: true },
      passwordHash: { type: String, required: true, select: false },
      role: { type: String, enum: ROLES, default: 'content_editor', index: true },
      active: { type: Boolean, default: true },
      failedAttempts: { type: Number, default: 0 },
      lockUntil: Date,
      lastLoginAt: Date,
      // Hashed refresh-token ids, one per signed-in device.
      sessions: { type: [{ jti: String, expiresAt: Date, _id: false }], select: false, default: [] },
    },
    { timestamps: true, toJSON: hideSecrets, toObject: hideSecrets },
  ),
);

export const ContentRevision = def(
  'ContentRevision',
  new Schema(
    {
      resource: { type: String, required: true },
      docId: { type: Schema.Types.ObjectId, required: true },
      label: String,
      snapshot: Mixed,
      author: { id: Schema.Types.ObjectId, name: String },
    },
    { timestamps: { createdAt: true, updatedAt: false } },
  ).index({ resource: 1, docId: 1, createdAt: -1 }),
);

export const ActivityLog = def(
  'ActivityLog',
  new Schema(
    {
      user: Schema.Types.ObjectId,
      userName: String,
      userEmail: String,
      action: { type: String, index: true },
      resource: String,
      docId: String,
      summary: String,
      ip: String,
    },
    { timestamps: { createdAt: true, updatedAt: false } },
  ).index({ createdAt: -1 }),
);

export const Media = def(
  'Media',
  new Schema(
    {
      originalName: String,
      kind: { type: String, enum: ['image', 'video'], index: true },
      mimeType: String,
      size: Number,
      width: Number,
      height: Number,
      url: { type: String, required: true },
      variants: [{ width: Number, url: String, _id: false }],
      dir: String,
      alt: { type: String, default: '' },
      category: { type: String, default: 'General', index: true },
      tags: [String],
      uploadedBy: Schema.Types.ObjectId,
    },
    { timestamps: true },
  ).index({ createdAt: -1 }),
);
