import path from 'node:path';
import {execFileSync} from 'node:child_process';

/** Resolve nested JarJar archives without starting the game or loading graphical classes. */
export function nativeClasspath(classpath, options = {}) {
  const root = path.resolve(import.meta.dirname, '..');
  const report = JSON.parse(execFileSync(options.python || 'python', [path.join(root, 'tools/native_classpath.py'),
    '--cache', path.resolve(options.cache || path.join(root, 'build/native-classpath'))], {
    cwd: root, encoding: 'utf8', windowsHide: true, maxBuffer: 16 * 1024 * 1024,
    input: JSON.stringify({classpath}), stdio: ['pipe', 'pipe', 'pipe'],
  }));
  return report.classpath;
}
