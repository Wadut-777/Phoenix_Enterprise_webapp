# Phoenix Enterprise: website and CMS

MERN stack: React + Vite + TypeScript + Tailwind, Express, MongoDB (Mongoose).

## What is in this repo

**Phase 1: public website.** Home, about, services, projects (grid/masonry, filters, search, detail with gallery and
before/after), industries, careers with resume upload, contact, news, insights, FAQs, legal pages, 404, sitemap.xml,
robots.txt, per-page SEO and JSON-LD. All content comes from MongoDB.

**Phase 2: CMS.**
- **Admin area at `/admin`:** overview dashboard, pages, navigation menus, header/footer/contact settings, SEO overview,
  services, projects and categories, industries, news and insights, testimonials, client logos, FAQs, media library,
  enquiries (with CSV export), job openings, career applications (resume download), users and roles, activity log.
- **Visual editor ("Edit Website"):** sign in, open any CMS page and press the orange *Edit Website* button (bottom left).
  Click text to edit it in place; use the block toolbar (drag handle, up/down, duplicate, delete); *Add block* bars appear
  between blocks; the side panel edits images, videos, links, lists, colours, spacing and alignment. Undo/redo, autosaved
  drafts, Preview mode with desktop/tablet/mobile widths, Publish (or schedule) and Normal view.
- **Blocks:** hero, company intro, text, text + image, two columns, full-width image, service grid, project gallery, feature
  list, industries, process, statistics, client logos, testimonials, leadership, FAQ, video, CTA banner, contact form,
  custom HTML (administrators only).
- **Draft / publish / revisions:** page edits are saved to a draft that visitors never see. Publishing stores the previous live
  version in Version history; restoring a page version puts it back into the draft for review. Services, projects, posts,
  industries and menus keep a version on every edit.
- **Media:** drag-and-drop upload, search, categories, alt text. Images are checked by their real file type, auto-rotated,
  stripped of EXIF, and converted to responsive WebP (480/960/1600 px) when `sharp` is available.

### Roles

| Role | Access |
|---|---|
| Super Administrator | everything, including users |
| Administrator | pages, content, media, projects, enquiries, applications, settings, menus, logs (not users) |
| Content Editor | pages, content, SEO, media |
| Project Manager | projects, categories, media |
| Enquiry Manager | enquiries, job openings, applications |

### Security model

bcrypt (cost 12) passwords; 15-minute access JWT and 7-day rotating refresh token in HTTP-only cookies (refresh cookie
limited to `/api/auth`); refresh-token reuse revokes every session; double-submit CSRF token on all state-changing admin
requests; account lock after 5 failed sign-ins for 15 minutes plus per-IP rate limits; role checks on every endpoint;
Mongo-operator stripping and `javascript:`/`data:` URL rejection on all saved content; uploads validated by magic bytes
(SVG is not accepted); resumes are never served publicly; custom HTML blocks need an Administrator; every admin action is
written to the activity log. In production the server refuses to start without 32+ character JWT secrets.

## Not built / known limits

- Nested rows and columns inside blocks (blocks are a flat, reorderable list; "Two columns" covers the common case).
- Page content for services, projects, posts etc. is edited in their admin forms, not in the visual editor.
- No server-side rendering: titles and meta tags are set in the browser. Add pre-rendering before relying on search traffic.
- Scheduled publication applies when a page is not yet live; changes to a live page publish immediately.
- Backups are the shell scripts below, not a button in the admin.
- Phase 2 was written without being able to install packages or run MongoDB here, so it has been syntax-checked and its
  pure logic unit-tested but not run end to end. Expect to fix small integration issues on first run.

## Content notes

The existing site (phoenixenterprise.co) could not be fetched when this was built, so no real logo, copy,
contact details or photos are included. Everything seeded is neutral starter copy taken from the project brief:
no client names, certifications, years of experience or project figures were invented. Sample projects are flagged
`isPlaceholder` and labelled on the site. The three statistics (10 service lines, 7 project categories,
6 industries) are counts taken from the brief. Empty contact fields are hidden until real values are entered.

## First sign-in

Create the first Super Administrator (any time, safe to re-run to reset a password):

```bash
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='a-long-password-1' ADMIN_NAME='Your Name' npm run create-admin -w backend
# on the server:
docker compose run --rm -e ADMIN_EMAIL=you@example.com -e ADMIN_PASSWORD='a-long-password-1' backend node src/scripts/create-admin.js
```

Then open `/admin/login`. Production cookies are `Secure`, so the site must be served over HTTPS.

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
5. `docker compose run --rm backend node src/seed/seed.js`, then create the first admin (see *First sign-in*)
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
