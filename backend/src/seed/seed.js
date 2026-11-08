import 'dotenv/config';
import mongoose from 'mongoose';
import {
  Page, Service, Project, ProjectCategory, Industry, Faq, Job, WebsiteSettings, Menu,
} from '../models/index.js';
import * as d from './data.js';

// Seeds starter content. Existing documents are NOT overwritten unless --reset is passed,
// so re-running it never destroys edits made in the CMS.
const reset = process.argv.includes('--reset');
if (reset && process.env.NODE_ENV === 'production' && !process.argv.includes('--force')) {
  console.error('Refusing to --reset in production without --force.');
  process.exit(1);
}

await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/phoenix');

async function upsertAll(Model, docs, key = 'slug') {
  for (const doc of docs) {
    if (reset) await Model.findOneAndReplace({ [key]: doc[key] }, doc, { upsert: true });
    else await Model.updateOne({ [key]: doc[key] }, { $setOnInsert: doc }, { upsert: true });
  }
  console.log(`${Model.modelName}: ${docs.length} processed`);
}

if (reset) await Promise.all([Faq.deleteMany({})]);

await upsertAll(Service, d.services.map((s, order) => ({ ...s, order })));
await upsertAll(ProjectCategory, d.projectCategories);
const cats = Object.fromEntries((await ProjectCategory.find().lean()).map((c) => [c.slug, c._id]));
await upsertAll(Project, d.projects.map((p, order) => ({ ...p, order, category: cats[p.category] })));
await upsertAll(Industry, d.industries);
await upsertAll(Job, d.jobs);
await upsertAll(Page, d.pages);
await upsertAll(WebsiteSettings, [d.settings], 'key');
await upsertAll(Menu, d.menus, 'key');
if ((await Faq.countDocuments()) === 0) { await Faq.insertMany(d.faqs.map((f, order) => ({ ...f, order }))); console.log('Faq: seeded'); }

await mongoose.disconnect();
console.log('Seed complete.');
