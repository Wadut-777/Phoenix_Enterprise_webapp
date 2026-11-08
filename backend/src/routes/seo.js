import { Router } from 'express';
import { Page, Service, Project, Industry, Blog, Job, liveFilter } from '../models/index.js';

const router = Router();
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

router.get('/robots.txt', (_req, res) => {
  const site = (process.env.SITE_URL || '').replace(/\/$/, '');
  res.type('text/plain').send(
    ['User-agent: *', 'Allow: /', 'Disallow: /admin', 'Disallow: /api/', site ? `Sitemap: ${site}/sitemap.xml` : ''].filter(Boolean).join('\n') + '\n',
  );
});

router.get('/sitemap.xml', async (_req, res, next) => {
  try {
    const site = (process.env.SITE_URL || `${_req.protocol}://${_req.get('host')}`).replace(/\/$/, '');
    const [pages, services, projects, industries, blogs, jobs] = await Promise.all([
      Page.find({ ...liveFilter(), 'seo.noIndex': { $ne: true } }).select('slug updatedAt').lean(),
      Service.find({ active: true }).select('slug updatedAt').lean(),
      Project.find(liveFilter()).select('slug updatedAt').lean(),
      Industry.find({ active: true }).select('slug updatedAt').lean(),
      Blog.find(liveFilter()).select('slug type updatedAt').lean(),
      Job.find({ active: true }).select('slug updatedAt').lean(),
    ]);
    const urls = [
      { loc: '/' },
      { loc: '/services' }, { loc: '/projects' }, { loc: '/industries' }, { loc: '/careers' },
      { loc: '/contact' }, { loc: '/news' }, { loc: '/insights' }, { loc: '/faqs' },
      ...pages.filter((p) => p.slug !== 'home').map((p) => ({ loc: `/${p.slug}`, at: p.updatedAt })),
      ...services.map((s) => ({ loc: `/services/${s.slug}`, at: s.updatedAt })),
      ...projects.map((p) => ({ loc: `/projects/${p.slug}`, at: p.updatedAt })),
      ...industries.map((i) => ({ loc: `/industries/${i.slug}`, at: i.updatedAt })),
      ...blogs.map((b) => ({ loc: `/${b.type === 'insight' ? 'insights' : 'news'}/${b.slug}`, at: b.updatedAt })),
      ...jobs.map((j) => ({ loc: `/careers/${j.slug}`, at: j.updatedAt })),
    ];
    const body = urls
      .map((u) => `  <url><loc>${esc(site + u.loc)}</loc>${u.at ? `<lastmod>${new Date(u.at).toISOString()}</lastmod>` : ''}</url>`)
      .join('\n');
    res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`);
  } catch (e) { next(e); }
});

export default router;
