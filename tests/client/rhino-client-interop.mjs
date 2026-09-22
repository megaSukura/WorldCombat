import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';

export function checkRhinoClientInterop(javaHome) {
  const launchPath = 'build/p2-input-launch/client.json';
  assert(fs.existsSync(launchPath), 'Export the locked client classpath with exportInputClient before the native interop check');
  const classpath = JSON.parse(fs.readFileSync(launchPath, 'utf8')).classpath;
  const out = path.resolve('build/client-interop'); fs.mkdirSync(out, { recursive: true });
  function source(file) { return ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true); }
  function namedFunction(file, name) {
    const tree = source(file); let found;
    function visit(node) { if (ts.isFunctionDeclaration(node) && node.name?.text === name) found = node; else ts.forEachChild(node, visit); }
    visit(tree); assert(found, `Production function missing: ${name}`); return found.getText(tree);
  }
  const script = `
    var Minecraft = { getInstance: function() { return { font: font }; } };
    var plain = function(value){return String(value);};
    var tr = function(key,a,b,c){var patterns={details_hint:'%1$s 详情 / 招式偏好',summary_heading:'%1$s · PP %2$s/%3$s',skill_details:'招式详情',choose_skill_details:'选择招式',open_details:'点击查看详情'};return (patterns[key]||key).replace('%1$s',a).replace('%2$s',b).replace('%3$s',c);};
    var text = function(value) { return Component.literal(String(value)); };
    var state = { settingsKey: 'P' };
    var summaries = { inspected: { skills: [{ id: 'vinewhip', name: '藤鞭', description: '藤蔓控制距离。' }] } };
    ${namedFunction('content/client/adapters/cobblemon-companion-ui.ts', 'summaryDraw')}
    var kind = 'learnset';
    var region = { graphics: function() { return graphics; }, x: function() { return 120; }, y: function() { return 60; },
      width: function() { return kind === 'learnset' ? 66 : 134; }, height: function() { return kind === 'learnset' ? 8 : 39; },
      mouseX: function() { return 121; }, mouseY: function() { return 61; }, kind: function() { return kind; },
      pokemon: function() { return 'inspected'; }, move: function() { return 'vinewhip'; }, pp: function() { return 3; }, maxPp: function() { return 10; } };
    summaryDraw(region); kind = 'details'; summaryDraw(region);
  `;
  const js = path.join(out, 'production-boundaries.js');
  fs.writeFileSync(js, ts.transpileModule(script, { compilerOptions: { target: ts.ScriptTarget.ES5, module: ts.ModuleKind.None } }).outputText);
  const executable = name => javaHome ? path.join(javaHome, 'bin', process.platform === 'win32' ? `${name}.exe` : name) : name;
  const options = { encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] };
  try {
    execFileSync(executable('javac'), ['-proc:none', '-encoding', 'UTF-8', '-cp', classpath, '-d', out, 'tests/client/RhinoClientInterop.java'], options);
    return execFileSync(executable('java'), ['-Djava.awt.headless=true', '-cp', `${out}${path.delimiter}${classpath}`, 'RhinoClientInterop', js], {...options,cwd:out});
  } catch (error) {
    throw new Error(`Native client interop regression failed:\n${error.stderr || error.message}`);
  }
}
