import { NextResponse } from 'next/server';
import { parseJavaScriptFile, buildComponentTree } from '@/lib/file-parser';
import { FileManifest, FileInfo, RouteInfo } from '@/types/file-manifest';
import { sandboxManager } from '@/lib/sandbox/sandbox-manager';
// SandboxState type used implicitly through global.activeSandbox

declare global {
  var activeSandbox: any;
  var activeSandboxProvider: any;
}

export async function GET() {
  try {
    const provider = sandboxManager.getActiveProvider() || global.activeSandboxProvider;
    const rawSandbox = global.activeSandbox;

    if (!provider && !rawSandbox) {
      return NextResponse.json({
        success: false,
        error: 'No active sandbox'
      }, { status: 404 });
    }

    console.log('[get-sandbox-files] Fetching and analyzing file structure...');

    if (provider) {
      const fileList = (await provider.listFiles()).filter(filePath =>
        filePath.match(/\.(jsx?|tsx?|css|json)$/) &&
        !filePath.includes('node_modules/') &&
        !filePath.includes('.git/') &&
        !filePath.startsWith('dist/') &&
        !filePath.startsWith('build/')
      );

      const filesContent: Record<string, string> = {};

      for (const filePath of fileList) {
        try {
          const content = await provider.readFile(filePath);
          if (Buffer.byteLength(content, 'utf8') < 10000) {
            filesContent[filePath] = content;
          }
        } catch (error) {
          console.debug('[get-sandbox-files] Skipping unreadable file:', filePath, error);
        }
      }

      const directorySet = new Set<string>(['.']);
      for (const filePath of Object.keys(filesContent)) {
        const segments = filePath.split('/').slice(0, -1);
        let currentPath = '.';
        for (const segment of segments) {
          currentPath = currentPath === '.' ? `./${segment}` : `${currentPath}/${segment}`;
          directorySet.add(currentPath);
        }
      }

      const structure = Array.from(directorySet).sort().slice(0, 50).join('\n');
      const fileManifest = buildFileManifest(filesContent);

      if (global.sandboxState?.fileCache) {
        global.sandboxState.fileCache.manifest = fileManifest;
      }

      return NextResponse.json({
        success: true,
        files: filesContent,
        structure,
        fileCount: Object.keys(filesContent).length,
        manifest: fileManifest,
      });
    }
    
    // Get list of all relevant files
    const findResult = await rawSandbox.runCommand({
      cmd: 'find',
      args: [
        '.',
        '-name', 'node_modules', '-prune', '-o',
        '-name', '.git', '-prune', '-o',
        '-name', 'dist', '-prune', '-o',
        '-name', 'build', '-prune', '-o',
        '-type', 'f',
        '(',
        '-name', '*.jsx',
        '-o', '-name', '*.js',
        '-o', '-name', '*.tsx',
        '-o', '-name', '*.ts',
        '-o', '-name', '*.css',
        '-o', '-name', '*.json',
        ')',
        '-print'
      ]
    });
    
    if (findResult.exitCode !== 0) {
      throw new Error('Failed to list files');
    }
    
    const fileList = (await findResult.stdout()).split('\n').filter((f: string) => f.trim());
    console.log('[get-sandbox-files] Found', fileList.length, 'files');
    
    // Read content of each file (limit to reasonable sizes)
    const filesContent: Record<string, string> = {};
    
    for (const filePath of fileList) {
      try {
        // Check file size first
        const statResult = await rawSandbox.runCommand({
          cmd: 'stat',
          args: ['-f', '%z', filePath]
        });
        
        if (statResult.exitCode === 0) {
          const fileSize = parseInt(await statResult.stdout());
          
          // Only read files smaller than 10KB
          if (fileSize < 10000) {
            const catResult = await rawSandbox.runCommand({
              cmd: 'cat',
              args: [filePath]
            });
            
            if (catResult.exitCode === 0) {
              const content = await catResult.stdout();
              // Remove leading './' from path
              const relativePath = filePath.replace(/^\.\//, '');
              filesContent[relativePath] = content;
            }
          }
        }
      } catch (parseError) {
        console.debug('Error parsing component info:', parseError);
        // Skip files that can't be read
        continue;
      }
    }
    
    // Get directory structure
    const treeResult = await rawSandbox.runCommand({
      cmd: 'find',
      args: ['.', '-type', 'd', '-not', '-path', '*/node_modules*', '-not', '-path', '*/.git*']
    });
    
    let structure = '';
    if (treeResult.exitCode === 0) {
      const dirs = (await treeResult.stdout()).split('\n').filter((d: string) => d.trim());
      structure = dirs.slice(0, 50).join('\n'); // Limit to 50 lines
    }
    
    // Build enhanced file manifest
    const fileManifest = buildFileManifest(filesContent);
    
    // Update global file cache with manifest
    if (global.sandboxState?.fileCache) {
      global.sandboxState.fileCache.manifest = fileManifest;
    }

    return NextResponse.json({
      success: true,
      files: filesContent,
      structure,
      fileCount: Object.keys(filesContent).length,
      manifest: fileManifest,
    });

  } catch (error) {
    console.error('[get-sandbox-files] Error:', error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 });
  }
}

function buildFileManifest(filesContent: Record<string, string>): FileManifest {
  const fileManifest: FileManifest = {
    files: {},
    routes: [],
    componentTree: {},
    entryPoint: '',
    styleFiles: [],
    timestamp: Date.now(),
  };

  for (const [relativePath, content] of Object.entries(filesContent)) {
    const fullPath = `/${relativePath}`;

    const fileInfo: FileInfo = {
      content,
      type: 'utility',
      path: fullPath,
      relativePath,
      lastModified: Date.now(),
    };

    if (relativePath.match(/\.(jsx?|tsx?)$/)) {
      const parseResult = parseJavaScriptFile(content, fullPath);
      Object.assign(fileInfo, parseResult);

      if (relativePath === 'src/main.jsx' || relativePath === 'src/index.jsx') {
        fileManifest.entryPoint = fullPath;
      }

      if (relativePath === 'src/App.jsx' || relativePath === 'App.jsx') {
        fileManifest.entryPoint = fileManifest.entryPoint || fullPath;
      }
    }

    if (relativePath.endsWith('.css')) {
      fileManifest.styleFiles.push(fullPath);
      fileInfo.type = 'style';
    }

    fileManifest.files[fullPath] = fileInfo;
  }

  fileManifest.componentTree = buildComponentTree(fileManifest.files);
  fileManifest.routes = extractRoutes(fileManifest.files);

  return fileManifest;
}

function extractRoutes(files: Record<string, FileInfo>): RouteInfo[] {
  const routes: RouteInfo[] = [];
  
  // Look for React Router usage
  for (const [path, fileInfo] of Object.entries(files)) {
    if (fileInfo.content.includes('<Route') || fileInfo.content.includes('createBrowserRouter')) {
      // Extract route definitions (simplified)
      const routeMatches = fileInfo.content.matchAll(/path=["']([^"']+)["'].*(?:element|component)={([^}]+)}/g);
      
      for (const match of routeMatches) {
        const [, routePath] = match;
        // componentRef available in match but not used currently
        routes.push({
          path: routePath,
          component: path,
        });
      }
    }
    
    // Check for Next.js style pages
    if (fileInfo.relativePath.startsWith('pages/') || fileInfo.relativePath.startsWith('src/pages/')) {
      const routePath = '/' + fileInfo.relativePath
        .replace(/^(src\/)?pages\//, '')
        .replace(/\.(jsx?|tsx?)$/, '')
        .replace(/index$/, '');
        
      routes.push({
        path: routePath,
        component: path,
      });
    }
  }
  
  return routes;
}
