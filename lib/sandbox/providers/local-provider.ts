import { exec as execCallback, spawn, type ChildProcess } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import {
  mkdtemp,
  mkdir,
  readFile as readFileFromFs,
  readdir,
  writeFile as writeFileToFs,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { promisify } from 'node:util';
import { appConfig } from '@/config/app.config';
import { SandboxInfo, SandboxProvider, CommandResult } from '../types';

const execAsync = promisify(execCallback);
const LOCAL_SANDBOX_PREFIX = 'open-lovable-local-';
const DEFAULT_LOG_NAME = '.vite.log';

async function getAvailablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (address && typeof address === 'object') {
        const { port } = address;
        server.close(() => resolve(port));
        return;
      }

      server.close();
      reject(new Error('Failed to allocate a local sandbox port'));
    });
    server.on('error', reject);
  });
}

export class LocalProvider extends SandboxProvider {
  private rootDir: string | null = null;
  private logFilePath: string | null = null;
  private vitePort: number | null = null;
  private viteProcess: ChildProcess | null = null;
  private existingFiles: Set<string> = new Set();

  private requireRootDir(): string {
    if (!this.rootDir) {
      throw new Error('Local sandbox has not been created yet');
    }

    return this.rootDir;
  }

  private requireLogFilePath(): string {
    if (!this.logFilePath) {
      throw new Error('Local sandbox log file is not initialized');
    }

    return this.logFilePath;
  }

  private requirePort(): number {
    if (!this.vitePort) {
      throw new Error('Local sandbox port is not initialized');
    }

    return this.vitePort;
  }

  private toSandboxPath(filePath: string): string {
    const rootDir = this.requireRootDir();

    if (filePath === '/tmp/vite.log') {
      return this.requireLogFilePath();
    }

    const knownRoots = ['/vercel/sandbox/', '/home/user/app/'];
    for (const knownRoot of knownRoots) {
      if (filePath.startsWith(knownRoot)) {
        return path.join(rootDir, filePath.slice(knownRoot.length));
      }
    }

    const relativePath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
    return path.join(rootDir, relativePath);
  }

  private async execShell(command: string): Promise<CommandResult> {
    const rootDir = this.requireRootDir();
    const shell = process.env.SHELL || '/bin/bash';
    const remappedCommand = command
      .replaceAll('/vercel/sandbox', rootDir)
      .replaceAll('/home/user/app', rootDir)
      .replaceAll('/tmp/vite.log', this.requireLogFilePath());

    try {
      const { stdout, stderr } = await execAsync(remappedCommand, {
        cwd: rootDir,
        env: {
          ...process.env,
          FORCE_COLOR: '0',
        },
        maxBuffer: 10 * 1024 * 1024,
        shell,
      });

      return {
        stdout: stdout ?? '',
        stderr: stderr ?? '',
        exitCode: 0,
        success: true,
      };
    } catch (error: any) {
      return {
        stdout: error?.stdout ?? '',
        stderr: error?.stderr ?? error?.message ?? 'Command failed',
        exitCode: typeof error?.code === 'number' ? error.code : 1,
        success: false,
      };
    }
  }

  private async readViteLog(): Promise<string> {
    try {
      return await readFileFromFs(this.requireLogFilePath(), 'utf8');
    } catch {
      return '';
    }
  }

  private async stopViteProcess(): Promise<void> {
    if (!this.viteProcess) {
      return;
    }

    const processToStop = this.viteProcess;
    this.viteProcess = null;

    if (!processToStop || processToStop.exitCode !== null || processToStop.killed) {
      return;
    }

    await new Promise<void>((resolve) => {
      let settled = false;
      const settle = () => {
        if (!settled) {
          settled = true;
          resolve();
        }
      };

      const timeout = setTimeout(() => {
        if (processToStop.exitCode === null) {
          processToStop.kill('SIGKILL');
        }
        settle();
      }, 3000);

      processToStop.once('exit', () => {
        clearTimeout(timeout);
        settle();
      });

      processToStop.kill('SIGTERM');
    });
  }

  private async waitForServerReady(timeoutMs: number = 30000): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    const sandboxUrl = this.getSandboxUrl();

    if (!sandboxUrl) {
      throw new Error('Local sandbox URL is not available');
    }

    while (Date.now() < deadline) {
      if (this.viteProcess && this.viteProcess.exitCode !== null) {
        const viteLog = await this.readViteLog();
        throw new Error(
          `Local sandbox Vite process exited early.${viteLog ? `\n${viteLog.slice(-4000)}` : ''}`
        );
      }

      try {
        const response = await fetch(sandboxUrl, { cache: 'no-store' });
        if (response.ok) {
          return;
        }
      } catch {
        // Ignore transient startup failures.
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const viteLog = await this.readViteLog();
    throw new Error(
      `Timed out waiting for the local sandbox dev server to start.${viteLog ? `\n${viteLog.slice(-4000)}` : ''}`
    );
  }

  private async startViteProcess(): Promise<void> {
    const rootDir = this.requireRootDir();
    const logFilePath = this.requireLogFilePath();
    const port = this.requirePort();

    await this.stopViteProcess();

    const logStream = createWriteStream(logFilePath, { flags: 'a' });
    this.viteProcess = spawn(
      'npm',
      ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
      {
        cwd: rootDir,
        env: {
          ...process.env,
          FORCE_COLOR: '0',
          BROWSER: 'none',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );

    this.viteProcess.stdout?.pipe(logStream);
    this.viteProcess.stderr?.pipe(logStream);
    this.viteProcess.once('exit', () => {
      logStream.end();
    });

    await this.waitForServerReady();
  }

  async createSandbox(): Promise<SandboxInfo> {
    await this.terminate();

    const rootDir = await mkdtemp(path.join(os.tmpdir(), LOCAL_SANDBOX_PREFIX));
    const sandboxId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const vitePort = await getAvailablePort();

    this.rootDir = rootDir;
    this.logFilePath = path.join(rootDir, DEFAULT_LOG_NAME);
    this.vitePort = vitePort;
    this.sandbox = {
      rootDir,
      vitePort,
    };
    this.sandboxInfo = {
      sandboxId,
      url: `http://127.0.0.1:${vitePort}`,
      provider: 'local',
      createdAt: new Date(),
    };
    this.existingFiles.clear();

    return this.sandboxInfo;
  }

  async runCommand(command: string): Promise<CommandResult> {
    const trimmed = command.trim();

    if (!trimmed) {
      return { stdout: '', stderr: '', exitCode: 0, success: true };
    }

    if (trimmed.includes('pkill -f vite')) {
      await this.stopViteProcess();
      return { stdout: '', stderr: '', exitCode: 0, success: true };
    }

    if (trimmed.includes('pgrep -f vite')) {
      if (this.viteProcess && this.viteProcess.exitCode === null) {
        return {
          stdout: `${this.viteProcess.pid ?? ''}\n`,
          stderr: '',
          exitCode: 0,
          success: true,
        };
      }

      return {
        stdout: '',
        stderr: '',
        exitCode: 1,
        success: false,
      };
    }

    if (trimmed.includes('nohup npm run dev') || trimmed === 'npm run dev') {
      await this.startViteProcess();
      return {
        stdout: `Vite started on ${this.getSandboxUrl()}\n`,
        stderr: '',
        exitCode: 0,
        success: true,
      };
    }

    if (trimmed === 'cat /tmp/vite.log') {
      return {
        stdout: await this.readViteLog(),
        stderr: '',
        exitCode: 0,
        success: true,
      };
    }

    if (trimmed.includes('find /tmp') && trimmed.includes('vite.log')) {
      return {
        stdout: `${this.requireLogFilePath()}\n`,
        stderr: '',
        exitCode: 0,
        success: true,
      };
    }

    return this.execShell(command);
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    const sandboxPath = this.toSandboxPath(filePath);
    await mkdir(path.dirname(sandboxPath), { recursive: true });
    await writeFileToFs(sandboxPath, content, 'utf8');
    const rootDir = this.requireRootDir();
    this.existingFiles.add(path.relative(rootDir, sandboxPath));
  }

  async readFile(filePath: string): Promise<string> {
    const sandboxPath = this.toSandboxPath(filePath);
    return readFileFromFs(sandboxPath, 'utf8');
  }

  async listFiles(directory?: string): Promise<string[]> {
    const rootDir = this.requireRootDir();
    const startDir = directory ? this.toSandboxPath(directory) : rootDir;
    const results: string[] = [];

    const walk = async (currentDir: string) => {
      const entries = await readdir(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        if (['node_modules', '.git', 'dist', 'build'].includes(entry.name)) {
          continue;
        }

        const entryPath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
          await walk(entryPath);
          continue;
        }

        results.push(path.relative(rootDir, entryPath));
      }
    };

    await walk(startDir);
    return results.sort();
  }

  async installPackages(packages: string[]): Promise<CommandResult> {
    const rootDir = this.requireRootDir();
    const args = ['install'];
    if (appConfig.packages.useLegacyPeerDeps) {
      args.push('--legacy-peer-deps');
    }
    args.push(...packages);

    try {
      const { stdout, stderr } = await execAsync(`npm ${args.join(' ')}`, {
        cwd: rootDir,
        env: {
          ...process.env,
          FORCE_COLOR: '0',
        },
        maxBuffer: 10 * 1024 * 1024,
      });

      return {
        stdout: stdout ?? '',
        stderr: stderr ?? '',
        exitCode: 0,
        success: true,
      };
    } catch (error: any) {
      return {
        stdout: error?.stdout ?? '',
        stderr: error?.stderr ?? error?.message ?? 'npm install failed',
        exitCode: typeof error?.code === 'number' ? error.code : 1,
        success: false,
      };
    }
  }

  async setupViteApp(): Promise<void> {
    const port = this.requirePort();

    const packageJson = {
      name: 'sandbox-app',
      version: '1.0.0',
      type: 'module',
      scripts: {
        dev: 'vite --host 127.0.0.1',
        build: 'vite build',
        preview: 'vite preview',
      },
      dependencies: {
        react: '^18.2.0',
        'react-dom': '^18.2.0',
      },
      devDependencies: {
        '@vitejs/plugin-react': '^4.0.0',
        vite: '^4.3.9',
        tailwindcss: '^3.3.0',
        postcss: '^8.4.31',
        autoprefixer: '^10.4.16',
      },
    };

    const viteConfig = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: ${port},
    strictPort: true,
    hmr: false,
    allowedHosts: ['127.0.0.1', 'localhost']
  }
})`;

    const tailwindConfig = `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}`;

    const postcssConfig = `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`;

    const indexHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Sandbox App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`;

    const mainJsx = `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`;

    const appJsx = `function App() {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
      <div className="text-center max-w-2xl">
        <p className="text-lg text-gray-400">
          Local Sandbox Ready<br/>
          Start building your React app with Vite and Tailwind CSS!
        </p>
      </div>
    </div>
  )
}

export default App`;

    const indexCss = `@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  background-color: rgb(17 24 39);
}`;

    await this.writeFile('package.json', JSON.stringify(packageJson, null, 2));
    await this.writeFile('vite.config.js', viteConfig);
    await this.writeFile('tailwind.config.js', tailwindConfig);
    await this.writeFile('postcss.config.js', postcssConfig);
    await this.writeFile('index.html', indexHtml);
    await this.writeFile('src/main.jsx', mainJsx);
    await this.writeFile('src/App.jsx', appJsx);
    await this.writeFile('src/index.css', indexCss);

    const installResult = await this.execShell('npm install');
    if (!installResult.success) {
      throw new Error(
        `Failed to install local sandbox dependencies.${installResult.stderr ? `\n${installResult.stderr}` : ''}`
      );
    }

    await this.startViteProcess();
  }

  async restartViteServer(): Promise<void> {
    await this.startViteProcess();
  }

  getSandboxUrl(): string | null {
    return this.sandboxInfo?.url || null;
  }

  getSandboxInfo(): SandboxInfo | null {
    return this.sandboxInfo;
  }

  async terminate(): Promise<void> {
    await this.stopViteProcess();

    this.sandbox = null;
    this.sandboxInfo = null;
    this.rootDir = null;
    this.logFilePath = null;
    this.vitePort = null;
    this.existingFiles.clear();
  }

  isAlive(): boolean {
    return !!this.sandboxInfo && !!this.rootDir;
  }
}
