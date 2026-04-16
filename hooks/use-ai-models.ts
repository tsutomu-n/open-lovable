'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AiModelCatalogState } from '@/lib/ai/model-runtime';

const EMPTY_CATALOG: AiModelCatalogState = {
  mode: 'direct',
  defaultModel: null,
  models: [],
};

export function useAiModels() {
  const [catalog, setCatalog] = useState<AiModelCatalogState>(EMPTY_CATALOG);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadModels() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/ai-models', {
          cache: 'no-store',
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Failed to load AI models (${response.status})`);
        }

        const data = await response.json();
        setCatalog(data);
      } catch (fetchError) {
        if ((fetchError as Error).name === 'AbortError') {
          return;
        }

        setError((fetchError as Error).message);
        setCatalog(EMPTY_CATALOG);
      } finally {
        setLoading(false);
      }
    }

    loadModels();

    return () => controller.abort();
  }, []);

  const enabledModels = useMemo(
    () => catalog.models.filter(model => model.enabled),
    [catalog.models]
  );

  const enabledModelIds = useMemo(
    () => new Set(enabledModels.map(model => model.id)),
    [enabledModels]
  );

  const normalizeModel = useCallback((modelId?: string | null) => {
    if (modelId && enabledModelIds.has(modelId)) {
      return modelId;
    }

    return catalog.defaultModel;
  }, [catalog.defaultModel, enabledModelIds]);

  return {
    catalog,
    enabledModels,
    loading,
    error,
    hasAvailableModels: enabledModels.length > 0,
    normalizeModel,
  };
}
