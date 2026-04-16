import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { registerHooks, stripTypeScriptTypes } from 'node:module';

registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      const isRelative = specifier.startsWith('./') || specifier.startsWith('../');
      const hasExtension = /\.[a-z0-9]+$/i.test(specifier);

      if (isRelative && !hasExtension) {
        return nextResolve(`${specifier}.ts`, context);
      }

      throw error;
    }
  },
  load(url, context, nextLoad) {
    if (url.endsWith('.ts') || url.endsWith('.tsx')) {
      const source = readFileSync(fileURLToPath(url), 'utf8');
      return {
        format: 'module',
        shortCircuit: true,
        source: stripTypeScriptTypes(source),
      };
    }

    return nextLoad(url, context);
  },
});
