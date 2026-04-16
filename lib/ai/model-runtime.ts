import {
  DEFAULT_AI_MODEL_ID,
  getAiModelDescriptor,
  getAiModelDescriptors,
  normalizeAiModelId,
  type AiDirectProvider,
} from './model-catalog';

export type AiRuntimeMode = 'gateway' | 'direct';

export interface AiModelOption {
  id: string;
  label: string;
  enabled: boolean;
  disabledReason?: string;
}

export interface AiModelCatalogState {
  mode: AiRuntimeMode;
  defaultModel: string | null;
  models: AiModelOption[];
}

export interface RuntimeModelResolution {
  requestedModel: string | null;
  canonicalModel: string | null;
  actualModel: string | null;
  provider: AiDirectProvider | 'gateway' | null;
  viaGateway: boolean;
  enabled: boolean;
  disabledReason?: string;
  label?: string;
}

export type EnvLike = Record<string, string | undefined>;

function hasEnvValue(env: EnvLike, key: string): boolean {
  const value = env[key];
  return typeof value === 'string' && value.trim().length > 0;
}

export function getAiRuntimeMode(env: EnvLike = process.env): AiRuntimeMode {
  return hasEnvValue(env, 'AI_GATEWAY_API_KEY') ? 'gateway' : 'direct';
}

export function getAiModelCatalog(env: EnvLike = process.env): AiModelCatalogState {
  const mode = getAiRuntimeMode(env);
  const models = getAiModelDescriptors().map(descriptor => {
    const enabled = mode === 'gateway' || hasEnvValue(env, descriptor.requiredEnvVar);

    return {
      id: descriptor.id,
      label: descriptor.label,
      enabled,
      disabledReason: enabled
        ? undefined
        : `Requires ${descriptor.requiredEnvVar}`,
    };
  });

  const defaultModel = models.find(model => model.id === DEFAULT_AI_MODEL_ID && model.enabled)?.id
    ?? models.find(model => model.enabled)?.id
    ?? null;

  return {
    mode,
    defaultModel,
    models,
  };
}

export function resolveRuntimeModel(
  modelId?: string | null,
  env: EnvLike = process.env
): RuntimeModelResolution {
  const requestedModel = modelId?.trim() || null;
  const canonicalModel = normalizeAiModelId(requestedModel);
  const mode = getAiRuntimeMode(env);

  if (!canonicalModel) {
    return {
      requestedModel,
      canonicalModel: null,
      actualModel: null,
      provider: null,
      viaGateway: mode === 'gateway',
      enabled: false,
      disabledReason: 'Unknown AI model',
    };
  }

  const descriptor = getAiModelDescriptor(canonicalModel);
  if (!descriptor) {
    return {
      requestedModel,
      canonicalModel,
      actualModel: null,
      provider: null,
      viaGateway: mode === 'gateway',
      enabled: false,
      disabledReason: 'Unknown AI model',
    };
  }

  if (mode === 'gateway') {
    if (!descriptor.gatewayModelId) {
      return {
        requestedModel,
        canonicalModel,
        actualModel: null,
        provider: 'gateway',
        viaGateway: true,
        enabled: false,
        disabledReason: 'Model is not available through AI Gateway',
        label: descriptor.label,
      };
    }

    return {
      requestedModel,
      canonicalModel,
      actualModel: descriptor.gatewayModelId,
      provider: 'gateway',
      viaGateway: true,
      enabled: true,
      label: descriptor.label,
    };
  }

  if (!hasEnvValue(env, descriptor.requiredEnvVar)) {
    return {
      requestedModel,
      canonicalModel,
      actualModel: null,
      provider: descriptor.directProvider,
      viaGateway: false,
      enabled: false,
      disabledReason: `Requires ${descriptor.requiredEnvVar}`,
      label: descriptor.label,
    };
  }

  return {
    requestedModel,
    canonicalModel,
    actualModel: descriptor.directModelId,
    provider: descriptor.directProvider,
    viaGateway: false,
    enabled: true,
    label: descriptor.label,
  };
}
