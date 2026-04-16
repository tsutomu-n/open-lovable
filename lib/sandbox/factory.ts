import { SandboxProvider, SandboxProviderConfig } from './types';
import { E2BProvider } from './providers/e2b-provider';
import { VercelProvider } from './providers/vercel-provider';

export class SandboxFactory {
  static getAutoSelectedProvider(): 'e2b' | 'vercel' | null {
    if (this.isProviderAvailable('e2b')) {
      return 'e2b';
    }

    if (this.isProviderAvailable('vercel')) {
      return 'vercel';
    }

    return null;
  }

  static getProviderSetupHint(provider: string): string {
    switch (provider.toLowerCase()) {
      case 'e2b':
        return 'Set E2B_API_KEY to use the E2B sandbox provider.';
      case 'vercel':
        return 'Set VERCEL_OIDC_TOKEN, or set VERCEL_TOKEN + VERCEL_TEAM_ID + VERCEL_PROJECT_ID to use the Vercel sandbox provider.';
      default:
        return 'Supported providers: e2b, vercel.';
    }
  }

  static create(provider?: string, config?: SandboxProviderConfig): SandboxProvider {
    const configuredProvider = provider || process.env.SANDBOX_PROVIDER;
    const selectedProvider = configuredProvider || this.getAutoSelectedProvider();

    if (!selectedProvider) {
      throw new Error(
        'No sandbox provider credentials configured. Set E2B_API_KEY, or configure VERCEL_OIDC_TOKEN, or configure VERCEL_TOKEN + VERCEL_TEAM_ID + VERCEL_PROJECT_ID.'
      );
    }

    if (configuredProvider && !this.isProviderAvailable(configuredProvider)) {
      throw new Error(
        `Sandbox provider "${configuredProvider}" is configured but not ready. ${this.getProviderSetupHint(configuredProvider)}`
      );
    }

    switch (selectedProvider.toLowerCase()) {
      case 'e2b':
        return new E2BProvider(config || {});
      
      case 'vercel':
        return new VercelProvider(config || {});
      
      default:
        throw new Error(`Unknown sandbox provider: ${selectedProvider}. Supported providers: e2b, vercel`);
    }
  }
  
  static getAvailableProviders(): string[] {
    return ['e2b', 'vercel'];
  }
  
  static isProviderAvailable(provider: string): boolean {
    switch (provider.toLowerCase()) {
      case 'e2b':
        return !!process.env.E2B_API_KEY;
      
      case 'vercel':
        // Vercel can use OIDC (automatic) or PAT
        return !!process.env.VERCEL_OIDC_TOKEN || 
               (!!process.env.VERCEL_TOKEN && !!process.env.VERCEL_TEAM_ID && !!process.env.VERCEL_PROJECT_ID);
      
      default:
        return false;
    }
  }
}
