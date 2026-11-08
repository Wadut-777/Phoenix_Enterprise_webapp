// Starter content. Everything here is placeholder copy derived from the project brief:
// no client names, certifications, project counts or years of experience are invented.
// Replace all of it from the CMS (or edit this file and re-run `npm run seed`).

const methodology = [
  { title: 'Consultation', text: 'We start by understanding your requirements, site conditions, budget and timeline.' },
  { title: 'Planning & design', text: 'Scope, drawings and a delivery plan are agreed before work begins.' },
  { title: 'Procurement', text: 'Materials, equipment and specialist teams are lined up against the programme.' },
  { title: 'Execution', text: 'Work is delivered on site with clear supervision and regular progress updates.' },
  { title: 'Inspection & handover', text: 'Quality checks are completed before handover, followed by ongoing support.' },
];

const S = (slug, title, icon, summary, scope, capabilities, related) => ({
  slug, title, icon, summary,
  intro: [summary, 'This page is starter copy. Edit it from the CMS to describe exactly what Phoenix Enterprise delivers in this area.'],
  scope, capabilities, methodology, relatedServices: related,
});

export const services = [
  S('civil-construction-infrastructure', 'Civil Construction & Infrastructure Development', 'building',
    'Civil works and infrastructure development delivered from groundwork through to completion.',
    ['Site preparation and earthworks', 'Foundations and structural works', 'Roads, drainage and external development', 'Utility and infrastructure packages'],
    ['Site management', 'Structural execution', 'Quantity and cost control', 'Safety supervision'],
    ['industrial-commercial-construction', 'pre-engineered-buildings-warehousing']),
  S('industrial-commercial-construction', 'Industrial & Commercial Construction', 'factory',
    'Construction of industrial facilities, commercial buildings and supporting infrastructure.',
    ['Factory and plant buildings', 'Commercial and office buildings', 'Civil, structural and finishing works', 'Coordination of MEP and specialist trades'],
    ['Turnkey coordination', 'Programme management', 'Multi-trade integration', 'Handover documentation'],
    ['civil-construction-infrastructure', 'electrical-mechanical-plumbing']),
  S('interior-design-turnkey-interiors', 'Interior Design & Turnkey Interior Solutions', 'ruler',
    'Interior design and fit-out for offices, retail, hospitality and institutional spaces.',
    ['Space planning and concept design', 'Detailed design and material selection', 'Joinery, partitions, ceilings and flooring', 'Furniture, lighting and finishing'],
    ['Design development', 'Fit-out execution', 'Vendor coordination', 'Snagging and handover'],
    ['electrical-mechanical-plumbing', 'elv-cctv-networking-security']),
  S('pre-engineered-buildings-warehousing', 'Pre-Engineered Buildings (PEB) & Warehousing', 'warehouse',
    'Pre-engineered steel buildings and warehousing facilities built for speed and flexibility.',
    ['PEB structures and roofing', 'Warehouses and logistics facilities', 'Industrial sheds', 'Associated civil and flooring works'],
    ['Structural coordination', 'Fast-track delivery', 'Erection supervision', 'Quality inspection'],
    ['civil-construction-infrastructure', 'industrial-commercial-construction']),
  S('electrical-mechanical-plumbing', 'Electrical, Mechanical & Plumbing (MEP)', 'bolt',
    'Integrated electrical, mechanical and plumbing installations for buildings and facilities.',
    ['Electrical distribution and lighting', 'HVAC and mechanical systems', 'Plumbing and drainage', 'Testing and commissioning'],
    ['Systems coordination', 'Installation supervision', 'Testing and commissioning', 'Maintenance support'],
    ['annual-maintenance-contracts', 'industrial-commercial-construction']),
  S('elv-cctv-networking-security', 'ELV, CCTV, Networking & Security Systems', 'shield',
    'Extra-low-voltage, surveillance, networking and security system installations.',
    ['CCTV and surveillance', 'Structured cabling and networking', 'Access control and alarms', 'Public address and other ELV systems'],
    ['System design', 'Installation', 'Integration', 'Support and maintenance'],
    ['telecom-infrastructure-fiber', 'annual-maintenance-contracts']),
  S('telecom-infrastructure-fiber', 'Telecom Infrastructure & Fiber Network Solutions', 'signal',
    'Telecom infrastructure and fiber network works for operators and enterprises.',
    ['Passive telecom infrastructure', 'Fiber laying, splicing and termination', 'Site civil and electrical works', 'Network rollout support'],
    ['Route and site coordination', 'Fiber installation', 'Testing and documentation', 'Rollout management'],
    ['elv-cctv-networking-security', 'smart-metering-utility-infrastructure']),
  S('smart-metering-utility-infrastructure', 'Smart Metering & Utility Infrastructure', 'gauge',
    'Smart metering and utility infrastructure installation and support.',
    ['Smart meter installation', 'Utility network works', 'Site surveys and data capture', 'Field support and reporting'],
    ['Field deployment', 'Workforce management', 'Data and reporting', 'Quality checks'],
    ['telecom-infrastructure-fiber', 'annual-maintenance-contracts']),
  S('annual-maintenance-contracts', 'Annual Maintenance Contracts (AMC)', 'wrench',
    'Planned and breakdown maintenance contracts that keep facilities and systems running.',
    ['Preventive maintenance schedules', 'Breakdown and emergency response', 'Electrical, mechanical, plumbing and ELV upkeep', 'Reporting and records'],
    ['Preventive maintenance', 'Rapid response', 'Technician deployment', 'Service reporting'],
    ['electrical-mechanical-plumbing', 'elv-cctv-networking-security']),
  S('manpower-technical-staffing-project-management', 'Manpower, Technical Staffing & Project Management', 'users',
    'Skilled manpower, technical staffing and project management support for project teams.',
    ['Technical and skilled manpower supply', 'Project management and supervision', 'Site coordination and reporting', 'Contractor and vendor management'],
    ['Resourcing', 'Project controls', 'Site supervision', 'Stakeholder coordination'],
    ['civil-construction-infrastructure', 'industrial-commercial-construction']),
];

export const projectCategories = [
  ['civil-infrastructure', 'Civil & Infrastructure'],
  ['interior-design', 'Interior Design'],
  ['industrial-projects', 'Industrial Projects'],
  ['peb-warehousing', 'PEB & Warehousing'],
  ['electrical-mep', 'Electrical & MEP'],
  ['telecom-infrastructure', 'Telecom Infrastructure'],
  ['elv-security', 'ELV & Security'],
].map(([slug, name], order) => ({ slug, name, order }));

// Clearly marked sample records so the portfolio layouts can be reviewed. Replace with real projects.
const sample = (slug, category, title, serviceSlugs, industrySlug, projectStatus, featured) => ({
  slug, category, title, serviceSlugs, industrySlug, projectStatus, featured,
  client: 'To be updated',
  location: 'To be updated',
  summary: 'Sample project entry. Replace with real project details from the CMS.',
  description: ['This is placeholder content used to preview the project layout. Add the real project description, scope and photography in the CMS.'],
  scope: ['Scope item to be updated'],
  isPlaceholder: true,
});

export const projects = [
  sample('sample-civil-project', 'civil-infrastructure', 'Sample Civil Project', ['civil-construction-infrastructure'], 'government-institutional', 'Completed', true),
  sample('sample-interior-project', 'interior-design', 'Sample Interior Fit-out', ['interior-design-turnkey-interiors'], 'corporate-commercial', 'Completed', true),
  sample('sample-industrial-project', 'industrial-projects', 'Sample Industrial Facility', ['industrial-commercial-construction'], 'industrial-manufacturing', 'Ongoing', true),
  sample('sample-peb-project', 'peb-warehousing', 'Sample Warehouse', ['pre-engineered-buildings-warehousing'], 'aviation-logistics', 'Completed', true),
  sample('sample-mep-project', 'electrical-mep', 'Sample MEP Installation', ['electrical-mechanical-plumbing'], 'corporate-commercial', 'Completed', false),
  sample('sample-telecom-project', 'telecom-infrastructure', 'Sample Fiber Rollout', ['telecom-infrastructure-fiber'], 'telecom-infrastructure', 'Ongoing', false),
];

export const industries = [
  ['corporate-commercial', 'Corporate & Commercial', 'Offices, business parks and commercial buildings.', ['interior-design-turnkey-interiors', 'electrical-mechanical-plumbing', 'elv-cctv-networking-security']],
  ['industrial-manufacturing', 'Industrial & Manufacturing', 'Factories, plants and production facilities.', ['industrial-commercial-construction', 'pre-engineered-buildings-warehousing', 'annual-maintenance-contracts']],
  ['government-institutional', 'Government & Institutional', 'Public sector and institutional facilities.', ['civil-construction-infrastructure', 'elv-cctv-networking-security', 'smart-metering-utility-infrastructure']],
  ['telecom-infrastructure', 'Telecom & Infrastructure', 'Telecom networks and supporting infrastructure.', ['telecom-infrastructure-fiber', 'civil-construction-infrastructure', 'smart-metering-utility-infrastructure']],
  ['aviation-logistics', 'Aviation & Logistics', 'Warehousing, logistics and aviation-related facilities.', ['pre-engineered-buildings-warehousing', 'civil-construction-infrastructure', 'elv-cctv-networking-security']],
  ['retail-hospitality', 'Retail & Hospitality', 'Stores, restaurants, hotels and hospitality spaces.', ['interior-design-turnkey-interiors', 'electrical-mechanical-plumbing', 'annual-maintenance-contracts']],
].map(([slug, name, summary, serviceSlugs], order) => ({
  slug, name, summary, serviceSlugs, order,
  intro: [summary, 'Starter copy. Describe the sector, typical requirements and relevant experience from the CMS.'],
  capabilities: ['Multidisciplinary project delivery', 'Coordinated design and execution', 'Quality and safety focus'],
}));

export const faqs = [
  { question: 'What services does Phoenix Enterprise offer?', answer: 'We cover civil and industrial construction, interiors, PEB and warehousing, MEP, ELV and security, telecom and fiber, smart metering, AMC and technical staffing.', group: 'General' },
  { question: 'How do I request a quotation?', answer: 'Use the contact form or enquiry button and tell us about your project. Our team will get back to you.', group: 'General' },
  { question: 'Do you offer maintenance after handover?', answer: 'Yes. Annual Maintenance Contracts are one of our service lines.', group: 'General' },
];

export const jobs = [
  {
    slug: 'general-application', title: 'General Application', department: 'Open', location: 'To be updated', employmentType: 'Full-time',
    summary: 'No fixed vacancy right now? Send us your profile and resume and we will keep it on file.',
    responsibilities: ['Responsibilities depend on the role discussed'],
    requirements: ['Relevant experience or qualification in construction, engineering, interiors or project management'],
  },
];

const cta = (secondaryUrl = '/projects') => ({ label: 'Discuss Your Project', url: '/contact', secondary: { label: 'View Projects', url: secondaryUrl } });

export const homeBlocks = [
  { id: 'hero', type: 'hero', props: {
    eyebrow: 'Phoenix Enterprise',
    headline: 'Building Tomorrow. Designing Possibilities.',
    subheadline: 'Construction, infrastructure, interiors and engineering solutions, delivered by one multidisciplinary team.',
    primaryCta: { label: 'Explore Our Services', url: '/services' },
    secondaryCta: { label: 'Discuss Your Project', url: '/contact' },
    image: '', video: '', size: 'full' } },
  { id: 'intro', type: 'intro', props: {
    eyebrow: 'Who we are',
    heading: 'One team for build, fit-out, systems and support.',
    body: ['Phoenix Enterprise brings civil construction, interior design, engineering systems and maintenance together under single-point project management.',
      'Replace this paragraph with the company overview from the CMS.'],
    highlights: [
      { title: 'Multidisciplinary', text: 'Construction, interiors, MEP, ELV and telecom under one roof.' },
      { title: 'Execution-focused', text: 'Planned delivery with clear accountability on site.' },
      { title: 'Client-centric', text: 'Straightforward communication from enquiry to handover.' },
    ],
    link: { label: 'About Phoenix Enterprise', url: '/about' } } },
  { id: 'services', type: 'serviceGrid', props: { eyebrow: 'What we do', heading: 'Core services', intro: 'Ten service lines, coordinated as one delivery team.', limit: 10 } },
  { id: 'projects', type: 'projectGallery', props: { eyebrow: 'Portfolio', heading: 'Featured projects', intro: 'A selection of completed and ongoing work.', featuredOnly: true, limit: 6 } },
  { id: 'why', type: 'featureList', props: { eyebrow: 'Why Phoenix Enterprise', heading: 'Why choose us', items: [
    { title: 'Project execution', text: 'Structured planning and on-site supervision from start to finish.' },
    { title: 'Quality and safety', text: 'Inspection checkpoints and safe working practices on every site.' },
    { title: 'Multidisciplinary expertise', text: 'Civil, interiors, MEP, ELV and telecom handled by one coordinated team.' },
    { title: 'Professional project management', text: 'A single point of contact and transparent progress reporting.' },
    { title: 'Timely delivery', text: 'Programmes planned around your deadlines and communicated clearly.' },
    { title: 'Client coordination', text: 'Regular updates and quick decisions keep projects moving.' },
  ] } },
  { id: 'industries', type: 'industries', props: { eyebrow: 'Sectors', heading: 'Industries we serve' } },
  { id: 'process', type: 'process', props: { eyebrow: 'How we work', heading: 'Our work process', steps: [
    { title: 'Consultation', text: 'Understanding your needs, site and budget.' },
    { title: 'Planning & design', text: 'Agreeing scope, drawings and programme.' },
    { title: 'Engineering & procurement', text: 'Specifying and sourcing materials and systems.' },
    { title: 'Execution', text: 'Building and installing under close supervision.' },
    { title: 'Quality inspection', text: 'Checking work against specification before handover.' },
    { title: 'Handover & support', text: 'Delivering documentation and ongoing support.' },
  ] } },
  { id: 'stats', type: 'stats', props: { heading: 'At a glance', items: [
    { value: '10', label: 'Service lines' },
    { value: '7', label: 'Project categories' },
    { value: '6', label: 'Industries served' },
  ] } },
  { id: 'clients', type: 'clients', props: { heading: 'Clients & partners' } },
  { id: 'testimonials', type: 'testimonials', props: { heading: 'What clients say' } },
  { id: 'cta', type: 'cta', props: { heading: "Let's Build Something Exceptional Together.", text: 'Tell us about your project and we will respond with the next steps.', showForm: true } },
];

export const pages = [
  { slug: 'home', title: 'Home', blocks: homeBlocks, seo: { metaTitle: 'Phoenix Enterprise | Construction, Infrastructure & Interior Design', metaDescription: 'Phoenix Enterprise delivers construction, infrastructure, interior design, MEP, ELV and telecom solutions.' } },
  { slug: 'about', title: 'About Us', showInNav: true, seo: { metaTitle: 'About Phoenix Enterprise', metaDescription: 'Learn about Phoenix Enterprise, our approach and our commitment to quality, safety and execution.' }, blocks: [
    { id: 'h', type: 'hero', props: { size: 'compact', eyebrow: 'About us', headline: 'About Phoenix Enterprise', subheadline: 'A multidisciplinary construction, infrastructure and interior design company.' } },
    { id: 'i', type: 'richText', props: { heading: 'Company introduction', body: ['Phoenix Enterprise delivers construction, infrastructure, interiors and engineering solutions for corporate, industrial, institutional and commercial clients.', 'Replace this text with the full company introduction from the CMS.'] } },
    { id: 'v', type: 'featureList', props: { heading: 'Vision, mission & philosophy', items: [
      { title: 'Vision', text: 'Starter copy: describe the long-term vision of Phoenix Enterprise.' },
      { title: 'Mission', text: 'Starter copy: describe how the company serves its clients every day.' },
      { title: 'Philosophy', text: 'Starter copy: describe the principles that guide the way work is done.' },
    ] } },
    { id: 'p', type: 'people', props: { heading: 'Management & leadership', items: [] } },
    { id: 'c', type: 'featureList', props: { heading: 'Core competencies', items: [
      { title: 'Construction', text: 'Civil, industrial and commercial construction.' },
      { title: 'Interiors', text: 'Design and turnkey fit-out.' },
      { title: 'Engineering systems', text: 'MEP, ELV, telecom and smart metering.' },
      { title: 'Support', text: 'Maintenance contracts and technical staffing.' },
    ] } },
    { id: 'q', type: 'richText', props: { heading: 'Quality, safety & execution', body: ['Starter copy: describe the quality, safety and execution commitments of Phoenix Enterprise here.'] } },
    { id: 'cta', type: 'cta', props: { heading: "Let's Build Something Exceptional Together.", text: 'Talk to our team about your next project.', showForm: false } },
  ] },
  { slug: 'privacy-policy', title: 'Privacy Policy', seo: { metaTitle: 'Privacy Policy | Phoenix Enterprise' }, blocks: [
    { id: 'h', type: 'hero', props: { size: 'compact', headline: 'Privacy Policy' } },
    { id: 'b', type: 'richText', props: { body: ['This is a placeholder. Replace it with the Phoenix Enterprise privacy policy, reviewed by a qualified professional, from the CMS.'] } },
  ] },
  { slug: 'terms-and-conditions', title: 'Terms & Conditions', seo: { metaTitle: 'Terms & Conditions | Phoenix Enterprise' }, blocks: [
    { id: 'h', type: 'hero', props: { size: 'compact', headline: 'Terms & Conditions' } },
    { id: 'b', type: 'richText', props: { body: ['This is a placeholder. Replace it with the Phoenix Enterprise terms and conditions, reviewed by a qualified professional, from the CMS.'] } },
  ] },
];

export const settings = {
  key: 'main',
  company: { name: 'Phoenix Enterprise', tagline: 'Building Tomorrow. Designing Possibilities.', logo: '',
    about: 'Construction, infrastructure, interior design and engineering solutions.' },
  // Contact details are intentionally empty: enter the real ones in the CMS. Empty fields are hidden on the site.
  contact: { address: '', phones: [], emails: [], whatsapp: '', mapEmbedUrl: '', hours: '' },
  social: [],
  announcement: { enabled: false, text: '', link: '' },
  header: { ctaLabel: 'Discuss Your Project', ctaUrl: '/contact' },
  footer: { blurb: 'Construction, infrastructure, interiors and engineering solutions.', legal: '' },
  seoDefaults: { titleSuffix: 'Phoenix Enterprise', description: 'Construction, infrastructure and interior design company.', ogImage: '' },
};

export const menus = [
  { key: 'header', items: [
    { label: 'About', url: '/about' },
    { label: 'Services', url: '/services', children: services.slice(0, 10).map((s) => ({ label: s.title, url: `/services/${s.slug}` })) },
    { label: 'Projects', url: '/projects' },
    { label: 'Industries', url: '/industries' },
    { label: 'News', url: '/news' },
    { label: 'Careers', url: '/careers' },
    { label: 'Contact', url: '/contact' },
  ] },
  { key: 'footer', items: [
    { label: 'About', url: '/about' }, { label: 'Services', url: '/services' }, { label: 'Projects', url: '/projects' },
    { label: 'Insights', url: '/insights' }, { label: 'FAQs', url: '/faqs' }, { label: 'Careers', url: '/careers' },
    { label: 'Privacy Policy', url: '/privacy-policy' }, { label: 'Terms & Conditions', url: '/terms-and-conditions' },
  ] },
];
