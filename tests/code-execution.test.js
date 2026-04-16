import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeAiModelId } from '../lib/ai/model-catalog.ts';
import { resolveRuntimeModel } from '../lib/ai/model-runtime.ts';

test('legacy model ids normalize to current canonical ids', () => {
  assert.equal(
    normalizeAiModelId('google/gemini-3-pro-preview'),
    'google/gemini-2.5-pro'
  );
  assert.equal(
    normalizeAiModelId('anthropic/claude-sonnet-4-20250514'),
    'anthropic/claude-4-sonnet'
  );
  assert.equal(
    normalizeAiModelId('moonshotai/kimi-k2-instruct-0905'),
    'moonshotai/kimi-k2'
  );
});

test('direct mode resolves Kimi to the provider-specific model id', () => {
  const result = resolveRuntimeModel('moonshotai/kimi-k2', {
    GROQ_API_KEY: 'groq-key',
  });

  assert.equal(result.enabled, true);
  assert.equal(result.provider, 'groq');
  assert.equal(result.actualModel, 'moonshotai/kimi-k2-instruct-0905');
});

test('gateway mode keeps provider/model ids intact', () => {
  const result = resolveRuntimeModel('anthropic/claude-4-sonnet', {
    AI_GATEWAY_API_KEY: 'gateway-key',
  });

  assert.equal(result.enabled, true);
  assert.equal(result.provider, 'gateway');
  assert.equal(result.actualModel, 'anthropic/claude-4-sonnet');
});

test('unknown models are rejected instead of being remapped silently', () => {
  const result = resolveRuntimeModel('openai/gpt-5', {
    OPENAI_API_KEY: 'openai-key',
  });

  assert.equal(result.enabled, false);
  assert.equal(result.canonicalModel, null);
  assert.equal(result.disabledReason, 'Unknown AI model');
});
