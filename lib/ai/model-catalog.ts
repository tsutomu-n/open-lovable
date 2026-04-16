export type AiDirectProvider = 'openai' | 'anthropic' | 'google' | 'groq';

export interface AiModelDescriptor {
  id: string;
  label: string;
  gatewayModelId?: string;
  directProvider: AiDirectProvider;
  directModelId: string;
  requiredEnvVar: string;
  legacyIds?: string[];
}

export const DEFAULT_AI_MODEL_ID = 'google/gemini-2.5-pro';

export const AI_MODEL_CATALOG: AiModelDescriptor[] = [
  {
    id: 'google/gemini-2.5-pro',
    label: 'Gemini 2.5 Pro',
    gatewayModelId: 'google/gemini-2.5-pro',
    directProvider: 'google',
    directModelId: 'gemini-2.5-pro',
    requiredEnvVar: 'GEMINI_API_KEY',
    legacyIds: ['google/gemini-3-pro-preview', 'gemini-2.5-pro'],
  },
  {
    id: 'openai/gpt-4.1',
    label: 'GPT-4.1',
    gatewayModelId: 'openai/gpt-4.1',
    directProvider: 'openai',
    directModelId: 'gpt-4.1',
    requiredEnvVar: 'OPENAI_API_KEY',
    legacyIds: ['gpt-4.1'],
  },
  {
    id: 'anthropic/claude-4-sonnet',
    label: 'Claude 4 Sonnet',
    gatewayModelId: 'anthropic/claude-4-sonnet',
    directProvider: 'anthropic',
    directModelId: 'claude-sonnet-4-20250514',
    requiredEnvVar: 'ANTHROPIC_API_KEY',
    legacyIds: [
      'anthropic/claude-sonnet-4-20250514',
      'claude-sonnet-4-20250514',
    ],
  },
  {
    id: 'moonshotai/kimi-k2',
    label: 'Kimi K2',
    gatewayModelId: 'moonshotai/kimi-k2',
    directProvider: 'groq',
    directModelId: 'moonshotai/kimi-k2-instruct-0905',
    requiredEnvVar: 'GROQ_API_KEY',
    legacyIds: [
      'moonshotai/kimi-k2-instruct-0905',
    ],
  },
];

const descriptorById = new Map(
  AI_MODEL_CATALOG.map(descriptor => [descriptor.id, descriptor] as const)
);

const aliasToModelId = new Map<string, string>();

for (const descriptor of AI_MODEL_CATALOG) {
  aliasToModelId.set(descriptor.id, descriptor.id);

  for (const legacyId of descriptor.legacyIds ?? []) {
    aliasToModelId.set(legacyId, descriptor.id);
  }
}

export function getAiModelDescriptors(): AiModelDescriptor[] {
  return AI_MODEL_CATALOG;
}

export function getAiModelDescriptor(modelId?: string | null): AiModelDescriptor | undefined {
  const normalizedModelId = normalizeAiModelId(modelId);
  return normalizedModelId ? descriptorById.get(normalizedModelId) : undefined;
}

export function normalizeAiModelId(modelId?: string | null): string | null {
  const trimmed = modelId?.trim();
  if (!trimmed) {
    return null;
  }

  return aliasToModelId.get(trimmed) ?? null;
}

export function isKnownAiModelId(modelId?: string | null): boolean {
  return normalizeAiModelId(modelId) !== null;
}
