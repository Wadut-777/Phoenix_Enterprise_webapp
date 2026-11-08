# Phoenix Enterprise: website and CMS (Phase 1: public website)

MERN stack: React + Vite + TypeScript + Tailwind, Express, MongoDB (Mongoose).

## What is in this phase

- Public website, fully driven by MongoDB content (nothing is hardcoded in components):
  home, about, services (+ detail), projects (grid/masonry, category filter, search, status, detail with gallery
  and before/after), industries (+ detail), careers (+ apply with resume upload), contact, news, insights, FAQs,
  privacy, terms, custom 404.
- Pages are stored as **block layouts** (`pages.blocks`), the same format the Phase 2 page builder and visual editor
  will edit. Supported blocks: hero, intro, richText, textImage, serviceGrid, projectGallery, featureList,
  industries, process, stats, clients, testimonials, people, faq, video, cta, contactForm.
- Read API, enquiry and career-application endpoints, sitemap.xml, robots.txt, health check.
- Security: helmet, rate limiting, zod validation, Mongo-operator stripping, honeypot spam trap, resume upload
  restricted to PDF/DOC/DOCX up to 5 MB and stored outside any publicly served directory.
- SEO: per-page title/description/Open Graph/Twitter/canonical, JSON-LD (site-wide business schema, articles),
  breadcrumbs, lazy images.
- Docker Compose (mongo, backend, frontend, nginx, certbot), Let's Encrypt bootstrap, backup/restore scripts.

## Not built yet (Phase 2+)

Admin login/JWT/RBAC, dashboard and all admin modules, visual "Edit Website" editor and drag-and-drop builder,
media library with WebP/AVIF resizing, revisions, activity logs, SSR/pre-rendering. Until the admin exists, content
is edited by changing `backend/src/seed/data.js` and re-seeding, or directly in MongoDB.

## Content notes

The existing site (phoenixenterprise.co) could not be fetched when this was built, so no real logo, copy,
contact details or photos are included. Everything seeded is neutral starter copy taken from the project brief:
no client names, certifications, years of experience or project figures were invented. Sample projects are flagged
`isPlaceholder` and labelled on the site. The three statistics (10 service lines, 7 project categories,
6 industries) are counts taken from the brief. Empty contact fields are hidden until real values are entered.

## Local development

Requires Node 20+ and a running MongoDB.

```bash
cp .env.example .env          # for local use set MONGODB_URI=mongodb://127.0.0.1:27017/phoenix
npm install
npm run seed                  # inserts starter content; never overwrites existing documents
npm run dev:api               # http://localhost:5000
npm run dev:web               # http://localhost:5173 (proxies /api to the backend)
```

`npm run seed -w backend -- --reset` replaces seeded documents with the file contents (refused in production
unless `--force`). Type-check the frontend with `npm run typecheck -w frontend`.

## Production on a Linux VPS (e.g. Hetzner)

1. Point your domain's DNS A record at the server. Install Docker and the compose plugin.
2. `cp .env.example .env` and set `DOMAIN`, `SITE_URL`, `LETSENCRYPT_EMAIL`, strong Mongo and JWT secrets.
   Keep the password in `MONGODB_URI` identical to `MONGO_ROOT_PASSWORD`.
3. `docker compose build`
4. `docker compose up -d mongo backend frontend`
5. `docker compose run --rm backend node src/seed/seed.js`
6. `./scripts/init-letsencrypt.sh` (creates a temporary cert, starts nginx, obtains the real certificate).
   The `certbot` service then renews automatically.
7. `docker compose up -d`; check `https://<domain>/api/health`.

Open only ports 80 and 443 in the firewall. MongoDB is not published to the host.

## Backup and restore

```bash
./scripts/backup.sh                        # writes backups/<timestamp>/ (database + uploads), keeps 14
./scripts/restore.sh backups/<timestamp>   # asks for confirmation, then overwrites
```

Run `backup.sh` nightly from cron, and copy `backups/` off the server.

## API summary (public)

`GET /api/site`, `/pages/:slug`, `/services[/:slug]`, `/projects?category=&q=&status=&featured=`, `/projects/:slug`,
`/project-categories`, `/industries[/:slug]`, `/blogs?type=news|insight`, `/blogs/:slug`, `/testimonials`, `/clients`,
`/faqs`, `/jobs[/:slug]`, `POST /enquiries`, `POST /careers/apply` (multipart), `GET /health`.
