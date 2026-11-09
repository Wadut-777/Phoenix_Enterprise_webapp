import { useQuery } from '@tanstack/react-query';

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';

export class ApiError extends Error {
  status: number;
  fields?: Record<string, string[]>;
  constructor(message: string, status: number, fields?: Record<string, string[]>) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const isForm = typeof FormData !== 'undefined' && init.body instanceof FormData;
  const res = await fetch(BASE + path, {
    ...init,
    headers: isForm ? init.headers : { 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  if (!res.ok) {
    let message = 'Something went wrong. Please try again.';
    let fields: Record<string, string[]> | undefined;
    try {
      const body = await res.json();
      message = body.error || message;
      fields = body.fields;
    } catch { /* non-JSON error */ }
    throw new ApiError(message, res.status, fields);
  }
  return res.json() as Promise<T>;
}

function useGet<T>(key: unknown[], path: string, enabled = true) {
  return useQuery<T, ApiError>({
    queryKey: key,
    queryFn: () => api<T>(path),
    enabled,
    staleTime: 60_000,
    retry: (count, err) => err.status !== 404 && count < 2,
  });
}

export type Img = { url: string; alt?: string };
export type Seo = { metaTitle?: string; metaDescription?: string; ogImage?: string; canonicalUrl?: string; noIndex?: boolean };
export type Link = { label: string; url: string };
export type Block = { id: string; type: string; props: Record<string, any>; style?: Record<string, any> };
export type Page = { slug: string; title: string; blocks: Block[]; seo?: Seo };
export type Service = {
  slug: string; title: string; icon?: string; summary?: string; heroImage?: string; intro: string[];
  scope: string[]; capabilities: string[]; methodology: { title: string; text: string }[]; relatedServices: string[]; seo?: Seo;
};
export type Category = { _id: string; slug: string; name: string };
export type Project = {
  _id: string; slug: string; title: string; category?: Category; client?: string; location?: string;
  projectStatus: 'Completed' | 'Ongoing'; completionDate?: string; summary?: string; description: string[]; scope: string[];
  coverImage?: string; gallery: Img[]; beforeAfter: { before: string; after: string; caption?: string }[];
  featured: boolean; isPlaceholder?: boolean; seo?: Seo;
};
export type Industry = {
  slug: string; name: string; summary?: string; intro: string[]; capabilities: string[]; image?: string; serviceSlugs: string[]; seo?: Seo;
};
export type Blog = {
  slug: string; title: string; type: 'news' | 'insight'; excerpt?: string; content: string[]; coverImage?: string;
  author?: string; publishedAt: string; seo?: Seo;
};
export type Job = {
  slug: string; title: string; department?: string; location?: string; employmentType?: string; summary?: string;
  responsibilities: string[]; requirements: string[]; closingDate?: string;
};
export type MenuItem = { label: string; url: string; children?: { label: string; url: string }[] };
export type Settings = {
  company?: { name?: string; tagline?: string; logo?: string; about?: string };
  contact?: { address?: string; phones?: string[]; emails?: string[]; whatsapp?: string; mapEmbedUrl?: string; hours?: string };
  social?: { label: string; url: string }[];
  announcement?: { enabled?: boolean; text?: string; link?: string };
  header?: { ctaLabel?: string; ctaUrl?: string };
  footer?: { blurb?: string; legal?: string };
  seoDefaults?: { titleSuffix?: string; description?: string; ogImage?: string };
};

export const useSite = () => useGet<{ settings: Settings; menus: Record<string, MenuItem[]> }>(['site'], '/site');
export const usePage = (slug: string, enabled = true) => useGet<Page>(['page', slug], `/pages/${slug}`, enabled);
export const useServices = () => useGet<{ items: Service[] }>(['services'], '/services');
export const useService = (slug: string) =>
  useGet<{ service: Service; related: Service[]; projects: Project[] }>(['service', slug], `/services/${slug}`);
export const useCategories = () => useGet<{ items: Category[] }>(['categories'], '/project-categories');
export const useProjects = (params: Record<string, string | number | boolean | undefined> = {}) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => v !== undefined && v !== '' && qs.set(k, String(v)));
  const s = qs.toString();
  return useGet<{ items: Project[]; total: number }>(['projects', s], `/projects${s ? `?${s}` : ''}`);
};
export const useProject = (slug: string) =>
  useGet<{ project: Project; services: Service[]; related: Project[] }>(['project', slug], `/projects/${slug}`);
export const useIndustries = () => useGet<{ items: Industry[] }>(['industries'], '/industries');
export const useIndustry = (slug: string) =>
  useGet<{ industry: Industry; services: Service[]; projects: Project[] }>(['industry', slug], `/industries/${slug}`);
export const useBlogs = (type?: string) => useGet<{ items: Blog[] }>(['blogs', type], `/blogs${type ? `?type=${type}` : ''}`);
export const useBlog = (slug: string) => useGet<Blog>(['blog', slug], `/blogs/${slug}`);
export const useJobs = () => useGet<{ items: Job[] }>(['jobs'], '/jobs');
export const useJob = (slug: string) => useGet<Job>(['job', slug], `/jobs/${slug}`);
export const useTestimonials = () =>
  useGet<{ items: { _id: string; quote: string; author: string; role?: string; company?: string }[] }>(['testimonials'], '/testimonials');
export const useClients = () =>
  useGet<{ items: { _id: string; name: string; logo?: string; url?: string }[] }>(['clients'], '/clients');
export const useFaqs = () =>
  useGet<{ items: { _id: string; question: string; answer: string; group: string }[] }>(['faqs'], '/faqs');
