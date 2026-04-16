import test from 'node:test';
import assert from 'node:assert/strict';

import { getAiModelCatalog } from '../lib/ai/model-runtime.ts';

test('gateway mode enables the curated model catalog', () => {
  const catalog = getAiModelCatalog({
    AI_GATEWAY_API_KEY: 'gateway-key',
  });

  assert.equal(catalog.mode, 'gateway');
  assert.equal(catalog.defaultModel, 'google/gemini-2.5-pro');
  assert.equal(catalog.models.length, 4);
  assert.ok(catalog.models.every(model => model.enabled));
});

test('direct mode picks the first available model when the preferred default is unavailable', () => {
  const catalog = getAiModelCatalog({
    OPENAI_API_KEY: 'openai-key',
  });

  assert.equal(catalog.mode, 'direct');
  assert.equal(catalog.defaultModel, 'openai/gpt-4.1');
  assert.equal(
    catalog.models.find(model => model.id === 'google/gemini-2.5-pro')?.enabled,
    false
  );
  assert.equal(
    catalog.models.find(model => model.id === 'openai/gpt-4.1')?.enabled,
    true
  );
});

test('direct mode reports no default model when no credentials are configured', () => {
  const catalog = getAiModelCatalog({});

  assert.equal(catalog.defaultModel, null);
  assert.ok(catalog.models.every(model => model.enabled === false));
});
