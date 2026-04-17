import test from 'node:test';
import assert from 'node:assert/strict';

import { buildCloneBrief } from '../lib/scrape/clone-brief.ts';

test('buildCloneBrief extracts marketing structure from html and markdown', () => {
  const brief = buildCloneBrief({
    url: 'https://example.com',
    html: `
      <html>
        <body>
          <header>
            <nav>
              <a href="/about">About</a>
              <a href="/pricing">Pricing</a>
              <a href="/contact">Contact</a>
            </nav>
          </header>
          <footer>
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
          </footer>
        </body>
      </html>
    `,
    markdown: `
# Example Site

Build faster with our platform.

[Get started](https://example.com/signup)

## Features

Launch quickly with modern tooling.
    `,
    metadata: {
      title: 'Example Site',
      description: 'Launch faster',
    },
  });

  assert.equal(brief.siteKind, 'marketing');
  assert.equal(brief.hero.headline, 'Example Site');
  assert.equal(brief.navLinks[0]?.label, 'About');
  assert.equal(brief.footerGroups[0]?.links[0]?.label, 'Privacy');
});

test('buildCloneBrief keeps dense sites as information-dense', () => {
  const brief = buildCloneBrief({
    url: 'https://docs.example.com',
    markdown: `
# Portal

## News
Latest updates and highlights.

## Events
Upcoming conferences and meetups.

## Docs
Read the documentation.

## Jobs
Community job board.

## Stories
Read customer stories.

[Docs](https://docs.example.com)
[Jobs](https://jobs.example.com)
[Events](https://events.example.com)
[Stories](https://stories.example.com)
[News](https://news.example.com)
    `,
    metadata: {
      title: 'Portal',
      description: 'A dense information portal',
    },
  });

  assert.equal(brief.siteKind, 'information-dense');
  assert.ok(brief.sections.length >= 5);
  assert.equal(brief.visualHints.layout, 'portal-grid');
});
