import type { LanguageModel } from 'ai';
import { createGroq } from '@ai-sdk/groq';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createGateway, type GatewayProvider } from '@ai-sdk/gateway';
import { resolveRuntimeModel } from './model-runtime';

type ProviderName = 'openai' | 'anthropic' | 'groq' | 'google';

type LocalProviderClient =
  | ReturnType<typeof createOpenAI>
  | ReturnType<typeof createAnthropic>
  | ReturnType<typeof createGroq>
  | ReturnType<typeof createGoogleGenerativeAI>;

export interface ModelResolution {
  model: LanguageModel;
  canonicalModel: string;
  actualModel: string;
  provider: ProviderName | 'gateway';
  viaGateway: boolean;
  label?: string;
}

// Cache provider clients by a stable key to avoid recreating them.
const clientCache = new Map<string, LocalProviderClient>();
let gatewayClient: GatewayProvider | null = null;

function getEnvDefaults(provider: ProviderName): { apiKey?: string; baseURL?: string } {
  switch (provider) {
    case 'openai':
      return { apiKey: process.env.OPENAI_API_KEY, baseURL: process.env.OPENAI_BASE_URL };
    case 'anthropic':
      return {
        apiKey: process.env.ANTHROPIC_API_KEY,
        baseURL: process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com/v1',
      };
    case 'groq':
      return { apiKey: process.env.GROQ_API_KEY, baseURL: process.env.GROQ_BASE_URL };
    case 'google':
      return { apiKey: process.env.GEMINI_API_KEY, baseURL: process.env.GEMINI_BASE_URL };
    default:
      return {};
  }
}

function getGatewayClient(): GatewayProvider {
  const apiKey = process.env.AI_GATEWAY_API_KEY;
  if (!apiKey) {
    throw new Error('AI_GATEWAY_API_KEY is not configured');
  }

  if (!gatewayClient) {
    gatewayClient = createGateway({ apiKey });
  }

  return gatewayClient;
}

function getOrCreateClient(
  provider: ProviderName,
  apiKey?: string,
  baseURL?: string
): LocalProviderClient {
  const defaults = getEnvDefaults(provider);
  const effective = {
    apiKey: apiKey || defaults.apiKey,
    baseURL: baseURL ?? defaults.baseURL,
  };

  const cacheKey = `${provider}:${effective.apiKey || ''}:${effective.baseURL || ''}`;
  const cached = clientCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  let client: LocalProviderClient;
  switch (provider) {
    case 'openai':
      client = createOpenAI(effective);
      break;
    case 'anthropic':
      client = createAnthropic(effective);
      break;
    case 'groq':
      client = createGroq(effective);
      break;
    case 'google':
      client = createGoogleGenerativeAI(effective);
      break;
    default:
      client = createGroq(effective);
  }

  clientCache.set(cacheKey, client);
  return client;
}

export function resolveLanguageModel(modelId: string): ModelResolution {
  return resolveLanguageModelWithOptions(modelId);
}

export function resolveLanguageModelWithOptions(
  modelId: string,
  options?: { preferDirect?: boolean }
): ModelResolution {
  const env = options?.preferDirect
    ? { ...process.env, AI_GATEWAY_API_KEY: undefined }
    : process.env;
  const runtimeModel = resolveRuntimeModel(modelId, env);

  if (!runtimeModel.enabled || !runtimeModel.canonicalModel || !runtimeModel.actualModel || !runtimeModel.provider) {
    throw new Error(runtimeModel.disabledReason || 'Unknown AI model');
  }

  if (runtimeModel.viaGateway) {
    return {
      model: getGatewayClient()(runtimeModel.actualModel),
      canonicalModel: runtimeModel.canonicalModel,
      actualModel: runtimeModel.actualModel,
      provider: 'gateway',
      viaGateway: true,
      label: runtimeModel.label,
    };
  }

  const provider = runtimeModel.provider;
  if (provider === 'gateway') {
    throw new Error('Gateway model should have been handled earlier');
  }

  const client = getOrCreateClient(provider);
  return {
    model: client(runtimeModel.actualModel),
    canonicalModel: runtimeModel.canonicalModel,
    actualModel: runtimeModel.actualModel,
    provider,
    viaGateway: false,
    label: runtimeModel.label,
  };
}

export default resolveLanguageModel;
