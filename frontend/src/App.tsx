import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { Contact, DynamicPage, Faqs, NotFound } from './pages/core';
import { ServiceDetail, ServicesPage } from './pages/services';
import { ProjectDetail, ProjectsPage } from './pages/projects';
import { IndustriesPage, IndustryDetail } from './pages/industries';
import { CareersPage, JobDetail } from './pages/careers';
import { BlogList, BlogPost } from './pages/blog';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DynamicPage slug="home" />} />
        <Route path="services" element={<ServicesPage />} />
        <Route path="services/:slug" element={<ServiceDetail />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/:slug" element={<ProjectDetail />} />
        <Route path="industries" element={<IndustriesPage />} />
        <Route path="industries/:slug" element={<IndustryDetail />} />
        <Route path="careers" element={<CareersPage />} />
        <Route path="careers/:slug" element={<JobDetail />} />
        <Route path="contact" element={<Contact />} />
        <Route path="faqs" element={<Faqs />} />
        <Route path="news" element={<BlogList type="news" />} />
        <Route path="news/:slug" element={<BlogPost type="news" />} />
        <Route path="insights" element={<BlogList type="insight" />} />
        <Route path="insights/:slug" element={<BlogPost type="insight" />} />
        {/* about, privacy-policy, terms-and-conditions and any CMS-created page */}
        <Route path=":slug" element={<DynamicPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
