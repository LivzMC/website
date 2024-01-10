// random misc utility functions
import fs from 'fs';

/**
 * Checks if the provided file was created within a set amount of time
 */
export function isFileCacheExpired(path: string, seconds: number = 30): boolean {
  if (!path || !fs.existsSync(path)) return true;
  const stats = fs.statSync(path);
  const now = Date.now();
  const then = stats.mtime.setSeconds(stats.mtime.getSeconds() + seconds);

  return now > then;
}
