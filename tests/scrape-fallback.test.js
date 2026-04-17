import test from 'node:test';
import assert from 'node:assert/strict';

import { parseHtmlForClone } from '../lib/scrape/fallback.ts';

test('parseHtmlForClone extracts title, description, and readable content', () => {
  const result = parseHtmlForClone(`
    <html>
      <head>
        <title>Example Site</title>
        <meta name="description" content="Example description" />
      </head>
      <body>
        <main>
          <h1>Hello</h1>
          <p>World &amp; friends</p>
        </main>
      </body>
    </html>
  `);

  assert.equal(result.title, 'Example Site');
  assert.equal(result.description, 'Example description');
  assert.match(result.content, /Hello/);
  assert.match(result.content, /World & friends/);
});
