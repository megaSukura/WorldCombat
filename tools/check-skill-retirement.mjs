import assert from 'node:assert/strict';
import {loadContentManifest,resolvePackages} from './content-manifest.mjs';

const manifest = loadContentManifest();
for (const units of Object.values(manifest.profiles)) {
  for (const id of resolvePackages(manifest, units)) {
    const pkg = manifest.packages[id];
    for (const field of ['sources', 'clientSources', 'startupSources']) {
      for (const file of pkg[field] || []) assert(!file.replaceAll('\\', '/').startsWith('archive/'), `${id}: ${file}`);
    }
  }
}
console.log('PASS content separation: every production profile resolves outside archival sources');
