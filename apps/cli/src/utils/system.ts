import os from 'os';
import { execSync } from 'child_process';

export interface SystemMetrics {
  cpuModel: string;
  cpuCores: number;
  totalMemoryBytes: number;
  freeMemoryBytes: number;
  freeDiskSpaceBytes?: number;
}

export function getSystemMetrics(): SystemMetrics {
  const cpus = os.cpus();
  const cpuModel = cpus.length > 0 ? cpus[0].model : 'Unknown';
  const cpuCores = cpus.length;
  const totalMemoryBytes = os.totalmem();
  const freeMemoryBytes = os.freemem();

  let freeDiskSpaceBytes: number | undefined;
  try {
    if (os.platform() === 'win32') {
      const output = execSync('wmic logicaldisk get size,freespace,deviceid', {
        encoding: 'utf8',
        stdio: 'pipe',
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
      const output = execSync('df -k .', { encoding: 'utf8', stdio: 'pipe' });
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
