import os from 'os';
import * as childProcess from 'child_process';

export interface SystemMetrics {
  cpuModel: string;
  cpuCores: number;
  totalMemoryBytes: number;
  freeMemoryBytes: number;
  freeDiskSpaceBytes?: number;
}

interface SystemMetricsDependencies {
  platform?: () => NodeJS.Platform;
  execFileSync?: typeof childProcess.execFileSync;
}

export function getSystemMetrics(deps: SystemMetricsDependencies = {}): SystemMetrics {
  const cpus = os.cpus();
  const platform = deps.platform ?? os.platform;
  const execFileSync = deps.execFileSync ?? childProcess.execFileSync;
  const cpuModel = cpus.length > 0 ? cpus[0].model : 'Unknown';
  const cpuCores = cpus.length;
  const totalMemoryBytes = os.totalmem();
  const freeMemoryBytes = os.freemem();

  let freeDiskSpaceBytes: number | undefined;
  try {
    if (platform() === 'win32') {
      const output = execFileSync('wmic', ['logicaldisk', 'get', 'size,freespace,deviceid'], {
        encoding: 'utf8',
        stdio: 'pipe',
        windowsHide: true,
      });
      // Parse wmic output for C:
      const lines = output.trim().split('\n');
      for (const line of lines) {
        if (line.includes('C:')) {
          const parts = line.trim().split(/\s+/);
          // Format is typically: DeviceID FreeSpace Size
          if (parts.length >= 2) {
            freeDiskSpaceBytes = parseInt(parts[1], 10);
          }
        }
      }
    } else {
      const output = execFileSync('df', ['-k', '.'], {
        encoding: 'utf8',
        stdio: 'pipe',
        windowsHide: true,
      });
      const lines = output.trim().split('\n');
      if (lines.length >= 2) {
        const parts = lines[1].trim().split(/\s+/);
        if (parts.length >= 4) {
          // Available block size is index 3 (blocks count) * 1024
          freeDiskSpaceBytes = parseInt(parts[3], 10) * 1024;
        }
      }
    }
  } catch (_e) {
    // Fallback safely if command queries fail
  }

  return {
    cpuModel,
    cpuCores,
    totalMemoryBytes,
    freeMemoryBytes,
    freeDiskSpaceBytes,
  };
}
