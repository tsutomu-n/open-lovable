import test from 'node:test';
import assert from 'node:assert/strict';

import { assessCloneFidelity } from '../lib/scrape/clone-quality.ts';

const baseBrief = {
  siteKind: 'information-dense',
  pageTitle: 'Python.org',
  description: 'The official home of the Python Programming Language',
  hero: {
    headline: 'Get Started',
    subheadline: 'Learn and use Python.',
    cta: {
      label: "Start with our Beginner's Guide",
      url: 'https://www.python.org/about/gettingstarted/',
      external: false,
    },
  },
  navLinks: [
    { label: 'Docs', url: 'https://docs.python.org/', external: true },
    { label: 'Jobs', url: 'https://jobs.python.org/', external: true },
    { label: 'Events', url: 'https://www.python.org/events/', external: false },
    { label: 'Community', url: 'https://www.python.org/community/', external: false },
  ],
  sections: [
    { title: 'Get Started', summary: 'Learn and use Python.', links: [], contentHints: [] },
    { title: 'Download', summary: 'Download Python.', links: [], contentHints: [] },
    { title: 'Docs', summary: 'Read documentation.', links: [], contentHints: [] },
    { title: 'Jobs', summary: 'Community jobs.', links: [], contentHints: [] },
    { title: 'Latest News', summary: 'Latest updates.', links: [], contentHints: [] },
  ],
  footerGroups: [
    {
      title: 'Footer',
      links: [
        { label: 'Privacy', url: 'https://www.python.org/privacy/', external: false },
        { label: 'Terms of Use', url: 'https://www.python.org/psf/terms-of-use/', external: false },
      ],
    },
  ],
  sourceLinks: [
    { label: 'Docs', url: 'https://docs.python.org/', external: true },
    { label: 'Privacy', url: 'https://www.python.org/privacy/', external: false },
  ],
  visualHints: {
    density: 'high',
    layout: 'portal-grid',
    tone: 'light',
    prominentAnnouncement: true,
    navLinkCount: 4,
    footerLinkCount: 2,
  },
  rawContentExcerpt: 'Get Started Download Docs Jobs Latest News',
  url: 'https://www.python.org/',
  screenshot: null,
};

test('assessCloneFidelity flags compressed dense clones and placeholder links', () => {
  const assessment = assessCloneFidelity(baseBrief, [
    { path: 'src/components/Hero.jsx', content: '<a href="#">Learn More</a><h1>Welcome</h1>' },
    { path: 'src/components/Footer.jsx', content: '<footer>Simple footer</footer>' },
  ]);

  assert.ok(assessment.issues.some(issue => issue.includes('placeholder links')));
  assert.ok(assessment.issues.some(issue => issue.includes('Get Started')));
  assert.ok(assessment.targetFiles.length > 0);
  assert.ok(assessment.correctionPrompt.includes('Improve clone fidelity'));
});

test('assessCloneFidelity stays quiet when key structure is present', () => {
  const assessment = assessCloneFidelity(baseBrief, [
    { path: 'src/components/Header.jsx', content: 'Docs Jobs Events Community' },
    { path: 'src/components/Hero.jsx', content: "Get Started Start with our Beginner's Guide" },
    { path: 'src/components/ContentSections.jsx', content: 'Download Docs Jobs Latest News' },
    { path: 'src/components/Footer.jsx', content: 'Privacy Terms of Use' },
    { path: 'src/App.jsx', content: 'Get Started Download Docs Jobs Latest News' },
  ]);

  assert.equal(assessment.issues.length, 0);
  assert.equal(assessment.targetFiles.length, 0);
});
