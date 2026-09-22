// Author-side unit check: type-checks a unit against its declared dependencies and the SDK, and
// verifies the assets it references. Read-only and self-contained, so any number of authors can run
// it at the same time. No build, no emission, no game process.
//
//   node tools/check-unit.mjs content/abilities/<id> [more unit directories]
//
// Static facts are checked where they can be read from the source; a dynamic expression is left to
// the runtime instead of being reported as missing. Errors stop a move from loading; notes are hints.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import ts from 'typescript';

const root = fileURLToPath(new URL('../', import.meta.url));
const inputs = process.argv.slice(2).filter(value => !value.startsWith('--'));
if (!inputs.length) throw Error('Pass the unit directories owned by this task');

function read(file) { return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '')); }
function relative(file) { return path.relative(root, file).replaceAll('\\', '/'); }
const identity = /^[a-z0-9_.-]+:[a-z0-9_./-]+$/;
const sides = [['sources', 'server'], ['clientSources', 'client'], ['startupSources', 'startup']];
const reservedTiming = ['prepare', 'recover', 'cooldown'];
const reservedParameters = ['range', 'prepare', 'recover', 'cooldown'];

// Shared packages only: other units may be mid-edit by their own authors and are never needed here.
const sharedPackages = read(path.join(root, 'content/packs.json')).packages || {};
const shared = sharedPackages;
const config = ts.readConfigFile(path.join(root, 'tsconfig.json'), ts.sys.readFile);
if (config.error) throw Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
const options = { ...ts.convertCompilerOptionsFromJson(config.config.compilerOptions, root).options, noEmit: true };
const particleTypes = new Set(fs.readFileSync(path.join(root, 'mods/world-combat-core/src/main/resources/assets/world_combat_core/particle_types.txt'), 'utf8')
  .split(/\r?\n/).map(line => line.trim().split(/\s+/)[0]).filter(Boolean));
// Sound events the loaded jars define in assets/<namespace>/sounds.json (tools/data/sound-ids.txt). The host
// sends a native direct SoundEvent, so a defined event plays even without a server registry entry; only an id
// absent from this list is rejected. Every namespace family in the list (move/impact/animation/...) is checked.
const soundIds = new Set(fs.readFileSync(path.join(root, 'tools/data/sound-ids.txt'), 'utf8').split(/\r?\n/).map(line => line.trim()).filter(Boolean));
const soundFamilies = [...new Set([...soundIds].map(id => { const dot = id.indexOf('.'); return dot < 0 ? id : id.slice(0, dot); }))];
const soundPattern = new RegExp('"((?:' + soundFamilies.map(escapeRegExp).join('|') + ')\\.[a-z0-9_.]+)"', 'g');
function escapeRegExp(text) { return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function closureOf(unit, errors) {
  const chosen = [], visiting = new Set();
  function include(id) {
    if (chosen.includes(id)) return;
    if (visiting.has(id)) { errors.push('dependency cycle at ' + id); return; }
    const pkg = shared[id];
    if (!pkg) { errors.push(`requires ${id}, which is not a shared package in content/packs.json (units depend on shared packages)`); return; }
    if (unit.requires[id] && pkg.version !== unit.requires[id] && chosen.length === 0) errors.push(`requires ${id}@${unit.requires[id]} but the shared package is ${pkg.version}`);
    visiting.add(id);
    for (const dependency of Object.keys(pkg.requires || {})) include(dependency);
    visiting.delete(id); chosen.push(id);
  }
  for (const id of Object.keys(unit.requires || {})) include(id);
  return chosen;
}

function typeCheck(unit, directory, closure, scenarioFile, errors) {
  const native = closure.includes('world_combat:native');
  const sdk = {
    server: ['sdk/core/index.d.ts', 'sdk/core/world.d.ts', ...(native ? ['sdk/cobblemon/index.d.ts'] : []), ...(scenarioFile ? ['sdk/smoke/index.d.ts'] : [])],
    client: ['sdk/client/index.d.ts'], startup: ['sdk/startup/index.d.ts']
  };
  for (const [field, side] of sides) {
    const own = (unit[field] || []).map(local => path.resolve(directory, local));
    if (field === 'sources' && scenarioFile) own.push(scenarioFile);
    if (!own.length) continue;
    const files = [...sdk[side].map(file => path.join(root, file)), ...closure.flatMap(id => (shared[id][field] || []).map(file => path.join(root, file))), ...own];
    const program = ts.createProgram(files, options);
    for (const diagnostic of ts.getPreEmitDiagnostics(program)) {
      const file = diagnostic.file ? relative(diagnostic.file.fileName) : '';
      // Only this unit's files are reported; shared code is verified by its own build.
      if (file && !own.some(f => relative(f) === file)) continue;
      const where = diagnostic.file ? `${file}:${diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start || 0).line + 1}` : side;
      errors.push(`${where}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ')}`);
    }
  }
}

function text(files) { return files.map(file => fs.readFileSync(file, 'utf8')).join('\n'); }
function matches(source, pattern) { return [...source.matchAll(pattern)].map(match => match[1]); }
function nodeLine(source, node) { return source.getLineAndCharacterOfPosition(node.getStart()).line + 1; }

// ---- Static read of literals -------------------------------------------------
// The runtime loader rejects a whole server script on a bad skill definition. Anything whose shape can be
// read from the source is checked here; a dynamic expression stays silent.
function literalValue(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return { known: true, value: node.text };
  if (ts.isNumericLiteral(node)) return { known: true, value: Number(node.text) };
  if (ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.MinusToken) {
    const inner = literalValue(node.operand);
    return inner.known && typeof inner.value === 'number' ? { known: true, value: -inner.value } : { known: false };
  }
  if (node.kind === ts.SyntaxKind.TrueKeyword) return { known: true, value: true };
  if (node.kind === ts.SyntaxKind.FalseKeyword) return { known: true, value: false };
  if (node.kind === ts.SyntaxKind.NullKeyword) return { known: true, value: null };
  if (ts.isArrayLiteralExpression(node)) {
    const value = [];
    for (const element of node.elements) { const item = literalValue(element); if (!item.known) return { known: false }; value.push(item.value); }
    return { known: true, value };
  }
  if (ts.isObjectLiteralExpression(node)) {
    const value = {};
    for (const property of node.properties) {
      if (!ts.isPropertyAssignment(property) || !(ts.isIdentifier(property.name) || ts.isStringLiteral(property.name))) return { known: false };
      const item = literalValue(property.initializer); if (!item.known) return { known: false };
      value[property.name.text] = item.value;
    }
    return { known: true, value };
  }
  return { known: false };
}
function propertyNode(object, name) {
  if (!ts.isObjectLiteralExpression(object)) return null;
  for (const property of object.properties) if (ts.isPropertyAssignment(property) && (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)) && property.name.text === name) return property;
  return null;
}
function pathArg(node) {
  if (ts.isArrayLiteralExpression(node)) {
    const parts = [];
    for (const element of node.elements) { if (!ts.isStringLiteral(element) && !ts.isNoSubstitutionTemplateLiteral(element)) return null; parts.push(element.text); }
    return parts;
  }
  if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'pathOf' && node.arguments.length === 1 && ts.isStringLiteral(node.arguments[0]))
    return node.arguments[0].text.split('.').filter(part => part.length > 0);
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text.split('.').filter(part => part.length > 0);
  return null;
}
function pathText(path) { return path.join('.'); }
function resolvePath(value, path) { for (const key of path) { if (value === null || typeof value !== 'object' || !Object.prototype.hasOwnProperty.call(value, key)) return { found: false }; value = value[key]; } return { found: true, value }; }
function overlay(base, patch) {
  if (!base || typeof base !== 'object' || Array.isArray(base) || !patch || typeof patch !== 'object' || Array.isArray(patch)) return patch;
  const result = { ...base };
  for (const key of Object.keys(patch)) result[key] = base[key] && typeof base[key] === 'object' && !Array.isArray(base[key]) ? overlay(base[key], patch[key]) : patch[key];
  return result;
}

// Skill definitions carry `defaults` and `fields`; addPreferences adds a section later. A missing leaf or a
// type mismatch becomes `invalid-preference` at load and aborts the whole assembled server script.
function checkPreferences(scenarios, prefix, errors) {
  const skills = new Map();
  function skill(id) { if (!skills.has(id)) skills.set(id, { define: null, merged: null, known: true, fields: [] }); return skills.get(id); }
  for (const file of scenarios.serverFiles) {
    const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.ES2017, true);
    const visit = node => {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
        if (node.expression.text === 'define' && node.arguments.length && ts.isObjectLiteralExpression(node.arguments[0])) {
          const definition = node.arguments[0], idNode = propertyNode(definition, 'id'), defaultsNode = propertyNode(definition, 'defaults');
          if (idNode && ts.isStringLiteral(idNode.initializer)) {
            const entry = skill(idNode.initializer.text), parsed = defaultsNode ? literalValue(defaultsNode.initializer) : { known: false };
            entry.known = parsed.known; entry.define = parsed.known ? parsed.value : null; entry.merged = parsed.known ? parsed.value : null;
            collectFields(propertyNode(definition, 'fields'), entry);
          }
        } else if (node.expression.text === 'addPreferences' && node.arguments.length >= 2 && ts.isStringLiteral(node.arguments[0])) {
          const entry = skill(node.arguments[0].text), parsed = literalValue(node.arguments[1]);
          if (parsed.known && entry.merged) entry.merged = overlay(entry.merged, parsed.value); else entry.known = false;
          const fieldsNode = node.arguments[2];
          if (fieldsNode && ts.isArrayLiteralExpression(fieldsNode)) for (const element of fieldsNode.elements) collectField(element, entry);
        }
      }
      ts.forEachChild(node, visit);
    };
    function collectFields(fieldsProperty, entry) { if (fieldsProperty && ts.isArrayLiteralExpression(fieldsProperty.initializer)) for (const element of fieldsProperty.initializer.elements) collectField(element, entry); }
    function collectField(node, entry) {
      if (!ts.isCallExpression(node) || !ts.isIdentifier(node.expression) || node.expression.text !== 'field' || node.arguments.length < 3) return;
      const path = pathArg(node.arguments[0]);
      if (!path) return;
      const kindNode = node.arguments[2], extra = node.arguments.length > 3 ? literalValue(node.arguments[3]) : { known: true, value: {} };
      entry.fields.push({ path, kind: kindNode && ts.isStringLiteral(kindNode) ? kindNode.text : null, options: extra.known ? extra.value.options : undefined, min: extra.known ? extra.value.min : undefined, max: extra.known ? extra.value.max : undefined, hasHelp: extra.known ? Object.prototype.hasOwnProperty.call(extra.value, 'help') : false, hasValidate: extra.known ? typeof extra.value.validate === 'function' : true });
    }
    visit(source);
  }
  for (const [id, entry] of skills) {
    if (!entry.known || !entry.merged) continue;
    for (const field of entry.fields) {
      const resolved = resolvePath(entry.merged, field.path), where = `${prefix} skill ${id} field ${pathText(field.path)}`;
      if (!resolved.found) { errors.push(`${where} has no default value in the merged defaults; the loader throws invalid-preference and the whole server script set fails to load`); continue; }
      if (field.kind === 'boolean' && typeof resolved.value !== 'boolean') errors.push(`${where} default must be a boolean (got ${JSON.stringify(resolved.value)})`);
      else if (field.kind === 'number') {
        if (typeof resolved.value !== 'number' || !isFinite(resolved.value)) errors.push(`${where} default must be a finite number (got ${JSON.stringify(resolved.value)})`);
        else if (typeof field.min === 'number' && resolved.value < field.min) errors.push(`${where} default ${resolved.value} is below min ${field.min}`);
        else if (typeof field.max === 'number' && resolved.value > field.max) errors.push(`${where} default ${resolved.value} is above max ${field.max}`);
      } else if (field.kind === 'choice') {
        const options = Array.isArray(field.options) ? field.options.map(option => option && option.value) : null;
        if (options && !options.some(option => Object.is(option, resolved.value))) errors.push(`${where} default ${JSON.stringify(resolved.value)} is not one of the declared choice values`);
      } else if (field.kind === null || (field.kind !== 'boolean' && field.kind !== 'number' && field.kind !== 'choice' && !field.hasValidate))
        errors.push(`${where} kind ${field.kind === null ? '(dynamic)' : field.kind} needs a validator; the loader rejects the field`);
    }
  }
}

// `p(id, key)` reads an action parameter or a reserved timing/range key; `stages` growth values must name an
// action parameter or a reserved timing key, or the ladder silently disappears.
function checkParameters(scenarios, errors) {
  const parameters = new Map(), skills = new Set();
  const sources = scenarios.serverFiles.map(file => ({ file, source: ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.ES2017, true) }));
  for (const { source } of sources) {
    const collect = node => {
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'define'
        && ts.isIdentifier(node.expression.expression) && node.expression.expression.text === 'actionParameters'
        && node.arguments.length >= 2 && ts.isStringLiteral(node.arguments[0]) && ts.isObjectLiteralExpression(node.arguments[1])) {
        const id = node.arguments[0].text, keys = parameters.get(id) || new Set();
        for (const property of node.arguments[1].properties) if (ts.isPropertyAssignment(property) && (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name))) keys.add(property.name.text);
        parameters.set(id, keys);
      }
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'define' && node.arguments.length && ts.isObjectLiteralExpression(node.arguments[0])) {
        const idNode = propertyNode(node.arguments[0], 'id'); if (idNode && ts.isStringLiteral(idNode.initializer)) skills.add(idNode.initializer.text);
      }
      ts.forEachChild(node, collect);
    };
    collect(source);
  }
  for (const { file, source } of sources) {
    const visit = node => {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
        if (node.expression.text === 'p' && node.arguments.length >= 2 && ts.isStringLiteral(node.arguments[0]) && ts.isStringLiteral(node.arguments[1])) {
          const id = node.arguments[0].text, key = node.arguments[1].text;
          if ((!skills.has(id) && !parameters.has(id)) || reservedParameters.includes(key)) { ts.forEachChild(node, visit); return; }
          const keys = parameters.get(id);
          if (keys && !keys.has(key)) errors.push(`${relative(file)}:${nodeLine(source, node)}: p("${id}", "${key}") reads a key with no actionParameters.define entry; the value is undefined at cast time`);
        } else if (node.expression.text === 'stages' && node.arguments.length >= 2 && ts.isStringLiteral(node.arguments[0]) && ts.isArrayLiteralExpression(node.arguments[1])) {
          const id = node.arguments[0].text;
          for (const stage of node.arguments[1].elements) {
            if (!ts.isObjectLiteralExpression(stage)) continue;
            const values = propertyNode(stage, 'values'); if (!values || !ts.isObjectLiteralExpression(values.initializer)) continue;
            for (const property of values.initializer.properties) {
              if (!ts.isPropertyAssignment(property) || !ts.isIdentifier(property.name)) continue;
              const key = property.name.text;
              if (reservedParameters.includes(key)) continue;
              const keys = parameters.get(id);
              if (keys && !keys.has(key)) errors.push(`${relative(file)}:${nodeLine(source, node)}: stages("${id}") has no action parameter ${key}; the loader throws "Growth stage has no action parameter"`);
            }
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
}

// The merged dictionaries a profile would publish: shared localization fragments plus this unit's own lang.
// A generated key that lives in a shared fragment is not reported as missing from the unit.
function mergedLang(directory, closure) {
  const zh = {}, en = {};
  const dirs = [];
  const sharedLang = path.join(root, 'content/localization');
  if (fs.existsSync(sharedLang)) for (const item of fs.readdirSync(sharedLang, { withFileTypes: true })) if (item.isDirectory()) dirs.push(path.join(sharedLang, item.name));
  for (const id of closure) for (const resource of shared[id].resources || []) {
    const dir = path.join(root, resource);
    if (fs.existsSync(path.join(dir, 'lang'))) dirs.push(path.join(dir, 'lang'));
    else if (fs.existsSync(path.join(dir, 'zh_cn.json'))) dirs.push(dir);
  }
  dirs.push(path.join(directory, 'lang'));
  for (const dir of [...new Set(dirs)]) for (const [name, target] of [['zh_cn', zh], ['en_us', en]]) {
    const file = path.join(dir, name + '.json');
    if (!fs.existsSync(file)) continue;
    try { const table = read(file); for (const key of Object.keys(table)) target[key] = table[key]; } catch { /* a broken fragment is reported by checkAssets */ }
  }
  return { zh, en };
}

// The description/label keys are generated from parameter names and preference paths. A key missing from one
// language, or a registered parameter with no `value.<key>` label, shows a raw id in the hover. Only keys the
// source statically names are judged; dynamic text stays with the runtime.
function checkLanguage(scenarios, prefix, zh, en, errors, notes) {
  const missingZh = new Map(), missingEn = new Map();
  const need = (key, where) => { if (zh && !(key in zh)) missingZh.set(key, where); if (en && !(key in en)) missingEn.set(key, where); };
  const needEither = (specific, shared, where) => {
    if (zh && !(specific in zh) && !(shared in zh)) missingZh.set(specific, where);
    if (en && !(specific in en) && !(shared in en)) missingEn.set(specific, where);
  };
  const parameters = new Map();
  function parameterKeys(id) { if (!parameters.has(id)) parameters.set(id, { visible: new Set(), hidden: new Set() }); return parameters.get(id); }
  function inspectField(node, id, where) {
    if (!ts.isCallExpression(node) || !ts.isIdentifier(node.expression) || node.expression.text !== 'field' || node.arguments.length < 3) return;
    const path = pathArg(node.arguments[0]); if (!path) return;
    const prefix = `worldcombat.skill.${id}.preference.${pathText(path)}`;
    need(prefix, where);
    const extra = node.arguments.length > 3 && ts.isObjectLiteralExpression(node.arguments[3]) ? node.arguments[3] : null;
    const help = extra && propertyNode(extra, 'help');
    if (help && ts.isStringLiteral(help.initializer)) need(prefix + '.help', where);
    const options = extra && propertyNode(extra, 'options');
    if (options && ts.isArrayLiteralExpression(options.initializer)) for (const option of options.initializer.elements) {
      if (!ts.isObjectLiteralExpression(option)) continue;
      const value = propertyNode(option, 'value'), label = propertyNode(option, 'label');
      if (value && label && ts.isStringLiteral(label.initializer)) { const optionValue = literalValue(value.initializer); if (optionValue.known) need(prefix + '.' + String(optionValue.value), where); }
    }
  }
  for (const file of scenarios.serverFiles) {
    const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.ES2017, true);
    const visit = node => {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
        if (node.expression.text === 'describe' && node.arguments.length >= 2 && ts.isStringLiteral(node.arguments[0]) && ts.isArrayLiteralExpression(node.arguments[1])) {
          const id = node.arguments[0].text, where = `${prefix} skill ${id} describe`;
          const bindingKeys = new Set();
          if (node.arguments[2] && ts.isObjectLiteralExpression(node.arguments[2])) for (const property of node.arguments[2].properties)
            if (ts.isPropertyAssignment(property) && (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name))) bindingKeys.add(property.name.text);
          for (const paragraph of node.arguments[1].elements) {
            if (!ts.isObjectLiteralExpression(paragraph)) continue;
            const keyNode = propertyNode(paragraph, 'key');
            if (keyNode && ts.isStringLiteral(keyNode.initializer)) need(`worldcombat.skill.${id}.${keyNode.initializer.text}`, where);
            const valuesNode = propertyNode(paragraph, 'values');
            if (!valuesNode || !ts.isArrayLiteralExpression(valuesNode.initializer)) continue;
            for (const element of valuesNode.initializer.elements) {
              if (!ts.isStringLiteral(element) || bindingKeys.has(element.text)) continue;
              const value = element.text;
              if (value.indexOf('pref.') === 0) need(`worldcombat.skill.${id}.preference.${value.slice(5)}`, where);
              else if (value.indexOf('tier.') === 0) {
                const parts = value.split('.'), name = parts.slice(2).join('.');
                need('worldcombat.value.growth', where);
                if (name === 'level') need('worldcombat.value.level', where);
                else if (reservedTiming.includes(name)) need(`worldcombat.value.${name}`, where);
                else needEither(`worldcombat.skill.${id}.value.${name}`, `worldcombat.value.${name}`, where);
              } else if (['pp', 'level', 'range', 'prepare', 'recover', 'cooldown'].includes(value)) need(`worldcombat.value.${value}`, where);
              else needEither(`worldcombat.skill.${id}.value.${value}`, `worldcombat.value.${value}`, where);
            }
          }
        } else if (node.expression.text === 'addPreferences' && node.arguments.length >= 3 && ts.isStringLiteral(node.arguments[0]) && ts.isArrayLiteralExpression(node.arguments[2])) {
          const id = node.arguments[0].text, where = `${prefix} skill ${id} preferences`;
          for (const element of node.arguments[2].elements) inspectField(element, id, where);
        } else if (node.expression.text === 'define' && node.arguments.length && ts.isObjectLiteralExpression(node.arguments[0])) {
          const definition = node.arguments[0], idNode = propertyNode(definition, 'id');
          if (idNode && ts.isStringLiteral(idNode.initializer)) {
            const id = idNode.initializer.text, where = `${prefix} skill ${id} definition`;
            need(`worldcombat.skill.${id}.summary`, where);
            const uses = propertyNode(definition, 'uses');
            if (uses && ts.isArrayLiteralExpression(uses.initializer)) uses.initializer.elements.forEach((_, index) => need(`worldcombat.skill.${id}.use.${index}`, where));
            const fields = propertyNode(definition, 'fields');
            if (fields && ts.isArrayLiteralExpression(fields.initializer)) for (const element of fields.initializer.elements) inspectField(element, id, where);
          }
        }
      } else if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'define'
        && ts.isIdentifier(node.expression.expression) && node.expression.expression.text === 'actionParameters'
        && node.arguments.length >= 2 && ts.isStringLiteral(node.arguments[0]) && ts.isObjectLiteralExpression(node.arguments[1])) {
          const id = node.arguments[0].text, keys = parameterKeys(id);
          for (const property of node.arguments[1].properties) {
            if (!ts.isPropertyAssignment(property) || !(ts.isIdentifier(property.name) || ts.isStringLiteral(property.name))) continue;
            const visible = !(ts.isCallExpression(property.initializer) && ts.isIdentifier(property.initializer.expression) && property.initializer.expression.text === 'hidden')
              && !(ts.isObjectLiteralExpression(property.initializer) && propertyNode(property.initializer, 'visible') && propertyNode(property.initializer, 'visible').initializer.kind === ts.SyntaxKind.FalseKeyword);
            (visible ? keys.visible : keys.hidden).add(property.name.text);
          }
        }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  for (const [id, keys] of parameters) for (const key of keys.visible) needEither(`worldcombat.skill.${id}.value.${key}`, `worldcombat.value.${key}`, `${prefix} skill ${id} parameter ${key}`);
  for (const [key, where] of missingZh) errors.push(`${where}: missing zh_cn key ${key}`);
  for (const [key, where] of missingEn) errors.push(`${where}: missing en_us key ${key}`);
}

// A static timing member is a tick count; the loader rejects a fractional or negative value and disables the
// whole server script. Only numeric literals are judged; a resolved/formula timing stays dynamic.
function checkTiming(scenarios, errors) {
  for (const file of scenarios.serverFiles) {
    const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.ES2017, true);
    const visit = node => {
      if (ts.isPropertyAssignment(node) && (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name)) && ['prepare', 'active', 'recover', 'cooldown'].includes(node.name.text)) {
        const value = literalValue(node.initializer);
        if (value.known && typeof value.value === 'number' && (!isFinite(value.value) || value.value % 1 || value.value < 0))
          errors.push(`${relative(file)}:${nodeLine(source, node)}: ${node.name.text} must be a non-negative integer tick count (got ${value.value}); the loader rejects it and disables the whole server script`);
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
}

// `windup` and `ready` run before the action commits; `action.world()` throws there and the core disables the
// whole action definition for the session. Pre-commit code observes with `action.sense()` and telegraphs with
// `action.present(...)`. Only the action receiver is flagged, so `CompanionBehavior.world(context)` is fine.
// Rhino also parses more strictly than TypeScript: a `var` that redeclares one of the enclosing function's
// parameters is a load-time error for the whole server script, so it is reported here.
function checkPreCommit(files, errors) {
  for (const file of files) {
    const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.ES5, true);
    const visit = (node, parameters) => {
      if (ts.isFunctionLike(node) && node.parameters) parameters = new Set(node.parameters.map(parameter => parameter.name.getText(source)));
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && parameters.has(node.name.text)
        && node.parent && ts.isVariableDeclarationList(node.parent) && !(node.parent.flags & (ts.NodeFlags.Let | ts.NodeFlags.Const)))
        errors.push(`${relative(file)}:${source.getLineAndCharacterOfPosition(node.getStart()).line + 1}: var ${node.name.text} redeclares a parameter of the enclosing function; Rhino rejects the whole script at load. Rename the local.`);
      if ((ts.isPropertyAssignment(node) || ts.isMethodDeclaration(node)) && ['windup', 'ready'].includes(node.name.getText(source))) {
        const body = ts.isPropertyAssignment(node) ? node.initializer : node;
        const actionNames = new Set(ts.isFunctionLike(body) && body.parameters && body.parameters.length ? [body.parameters[0].name.getText(source)] : []);
        if (!actionNames.size) actionNames.add('action');
        const scan = inner => {
          if (ts.isCallExpression(inner) && ts.isPropertyAccessExpression(inner.expression) && inner.expression.name.text === 'world') {
            const receiver = inner.expression.expression;
            const isAction = ts.isIdentifier(receiver) ? actionNames.has(receiver.text) : ts.isPropertyAccessExpression(receiver) && receiver.name.text === 'action';
            if (isAction) errors.push(`${relative(file)}:${source.getLineAndCharacterOfPosition(inner.getStart()).line + 1}: ${node.name.getText(source)} runs before commit; action.world() throws there and disables the move. Observe with action.sense(), telegraph with action.present(key, scene, 1, point, JSON.stringify(data)).`);
          }
          ts.forEachChild(inner, scan);
        };
        scan(body);
      }
      ts.forEachChild(node, child => visit(child, parameters));
    };
    visit(source, new Set());
  }
}

function checkAssets(unit, directory, closure, errors, notes) {
  const server = text((unit.sources || []).map(local => path.resolve(directory, local)));
  const client = text((unit.clientSources || []).map(local => path.resolve(directory, local)));
  const startup = text((unit.startupSources || []).map(local => path.resolve(directory, local)));
  // actor_tick is a per-tick broadcast to every living entity; units express periodic work through pulse, mob_effect_tick or mob_effect_removed.
  if (/world_combat:actor_tick/.test(server)) errors.push('world_combat:actor_tick is a whole-world per-tick broadcast; use the pulse hook (every 20 ticks per holder), world_combat:mob_effect_tick or world_combat:mob_effect_removed');
  for (const id of new Set(matches(client, /particle:\s*"([^"]+)"/g))) {
    if (id.startsWith('minecraft:')) continue;
    if (!id.startsWith('world_combat_core:') || !particleTypes.has(id.slice('world_combat_core:'.length))) errors.push(`particle type not in particle_types.txt: ${id}`);
  }
  // Effect contracts: the host rejects the whole content load when a WorldCombat.effect(...) lacks a "start" handler.
  for (const token of new Set(matches(server, /WorldCombat\.effect\(\s*([A-Za-z_$][\w$]*|"[^"]+")\s*,/g))) {
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (!new RegExp('WorldCombat\\.effectHandler\\(\\s*' + escaped + '\\s*,\\s*"start"').test(server)) errors.push(`effect ${token} has no "start" handler (WorldCombat.effectHandler(${token}, "start", ...)); the server rejects all content without it`);
  }
  for (const id of new Set(matches(server + client, soundPattern))) {
    if (!soundIds.has(id)) errors.push(`sound id not in tools/data/sound-ids.txt: ${id}`);
  }
  if (fs.existsSync(path.join(directory, 'presentation.ts')) && !(unit.clientSources || []).includes('presentation.ts')) errors.push('presentation.ts exists but unit.json has no clientSources entry for it');
  if (fs.existsSync(path.join(directory, 'startup.ts')) && !(unit.startupSources || []).includes('startup.ts')) errors.push('startup.ts exists but unit.json has no startupSources entry for it');
  const zhFile = path.join(directory, 'lang/zh_cn.json'), enFile = path.join(directory, 'lang/en_us.json');
  let zh = null, en = null;
  for (const [file, name] of [[zhFile, 'zh_cn'], [enFile, 'en_us']]) {
    if (!fs.existsSync(file)) { errors.push(`lang/${name}.json missing`); continue; }
    try { const value = read(file); if (name === 'zh_cn') zh = value; else en = value; } catch (error) { errors.push(`lang/${name}.json: ${error.message}`); }
  }
  if (zh && en) {
    const zhKeys = Object.keys(zh), enKeys = Object.keys(en);
    for (const key of zhKeys) if (!(key in en)) errors.push(`lang key only in zh_cn: ${key}`);
    for (const key of enKeys) if (!(key in zh)) errors.push(`lang key only in en_us: ${key}`);
    for (const key of zhKeys) {
      const count = value => (String(value).match(/%\d+\$s/g) || []).sort().join(',');
      if (key in en && count(zh[key]) !== count(en[key])) errors.push(`lang argument placeholders differ for ${key}`);
    }
    // Minecraft formats text with String.format: a percent sign followed by a letter or ending the string is a
    // format directive, and an unknown one makes the whole string show raw with its placeholders unfilled
    // ("+%1$s%"). Write such a percent sign as %%.
    for (const [name, table] of [['zh_cn', zh], ['en_us', en]]) for (const key of Object.keys(table)) {
      const stripped = String(table[key]).replace(/%\d+\$[sd]|%[sd]|%%/g, '');
      if (/%(?=[A-Za-z]|$)/.test(stripped)) errors.push(`lang/${name}.json ${key}: this % is read as a format directive; write %% (in "${table[key]}")`);
    }
    for (const key of new Set(matches(server, /"((?:world_combat|cobblemon_world_combat)\.[a-z0-9_]+\.[a-z0-9_.]+)"/g))) {
      // A literal ending in "." is a concatenation prefix (e.g. "…text." + stat), not a complete key.
      if (key.endsWith('.')) continue;
      if (/\.(text|desc|name)\b/.test(key) && !(key in zh)) errors.push(`lang key used in code but missing: ${key}`);
    }
  }
  for (const effect of new Set(matches(startup, /\.create\("([a-z0-9_]+:[a-z0-9_/]+)"\)/g))) {
    const [namespace, name] = effect.split(':');
    const png = path.join(directory, 'resources/assets', namespace, 'textures/mob_effect', name + '.png');
    const mapped = unit.mobEffectIcons && unit.mobEffectIcons[effect];
    if (!fs.existsSync(png) && !mapped) errors.push(`mob effect ${effect} has no icon: add ${relative(png)} or a mobEffectIcons entry in unit.json`);
    if (fs.existsSync(png)) {
      const header = fs.readFileSync(png).subarray(16, 24);
      const width = header.readUInt32BE(0), height = header.readUInt32BE(4);
      if (width !== 18 || height !== 18) notes.push(`icon ${name}.png is ${width}x${height}; 18x18 matches the vanilla slot`);
    }
    const langKey = `effect.${namespace}.${name.replaceAll('/', '.')}`;
    if (zh && !(langKey in zh)) errors.push(`mob effect ${effect} has no lang entry ${langKey}`);
  }
  checkMobEffectIds(server, startup, closure, errors);
}

// MobEffects.read/apply/consume/react take the registry id of a real MobEffect: `minecraft:*` or an id this unit
// (or a shared package it requires) registers with `e.create("...")` in startup. The registry tag
// (`.tag("world_combat:status/...")`) names a shared identity for MobEffects.tagged/hasTag/consumeTagged and is never an id.
function checkMobEffectIds(server, startup, closure, errors) {
  const known = new Set(matches(startup, /\.create\("([a-z0-9_]+:[a-z0-9_/]+)"\)/g));
  for (const id of closure) for (const source of shared[id].startupSources || []) {
    for (const effect of matches(fs.readFileSync(path.join(root, source), 'utf8'), /\.create\("([a-z0-9_]+:[a-z0-9_/]+)"\)/g)) known.add(effect);
  }
  const constants = new Map();
  for (const match of server.matchAll(/(?:const|var|let)\s+([A-Za-z_$][\w$]*)\s*=\s*"([^"]+)"/g)) constants.set(match[1], match[2]);
  const resolve = token => token.startsWith('"') ? token.slice(1, -1) : constants.get(token.split('.').pop()) ?? null;
  const uses = [
    ...matches(server, /MobEffects\.(?:read|apply|consume)\(\s*[^,()]+,\s*[^,()]+,\s*([A-Za-z_$][\w$.]*|"[^"]+")/g),
    ...matches(server, /MobEffects\.react\(\s*[^,()]+,\s*([A-Za-z_$][\w$.]*|"[^"]+")/g),
  ];
  for (const token of new Set(uses)) {
    const id = resolve(token);
    if (id === null || id.startsWith('minecraft:') || known.has(id)) continue;
    const hint = /:status\//.test(id) ? ' (this is a registry tag; the id is the one passed to e.create(...) in startup.ts, tags are read with MobEffects.tagged/hasTag)' : '';
    errors.push(`MobEffects id ${id} is not a registered mob effect${hint}`);
  }
}

// Scene definitions are validated by the engine's own DefinitionParser (the same code the client runs), so shape
// fields, moment names and emitter budgets are checked here rather than at integration. The unit's client sources
// are evaluated with inert stand-ins for every other client global; only `WorldCombatParticles.scene(...)` is captured.
const classpathFile = path.join(root, 'build/particle-checks-classpath.txt');
function collectScenes(closure, own) {
  const shared = closure.flatMap(id => (sharedPackages[id].clientSources || []).map(file => path.join(root, file)));
  const source = [...shared, ...own].map(file => fs.readFileSync(file, 'utf8')).join('\n');
  const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES5, module: ts.ModuleKind.None } }).outputText;
  const scenes = {};
  const inert = new Proxy(function () {}, { get: (target, key) => key === Symbol.toPrimitive ? () => '' : inert, apply: () => inert, construct: () => inert });
  const sandbox = { WorldCombatParticles: { scene: (id, version, definition) => { scenes[String(id)] = definition; } }, console: { log() {}, warn() {}, error() {} } };
  for (const name of ['WorldCombatClient', 'UiSurfaces', 'Java', 'Platform', 'Client', 'ClientEvents', 'NetworkEvents', 'ItemEvents', 'WorldCombatUi']) sandbox[name] = inert;
  vm.createContext(sandbox);
  vm.runInContext(js, sandbox, { filename: relative(own[0]) });
  return scenes;
}
function checkScenes(unit, directory, closure, errors, notes) {
  const own = (unit.clientSources || []).map(local => path.resolve(directory, local));
  if (!own.length) return;
  const ownText = text(own);
  let scenes = {};
  try { scenes = collectScenes(closure, own); } catch (error) { errors.push(`client sources failed to evaluate: ${error.message}`); return; }
  const ownScenes = Object.entries(scenes).filter(([id]) => ownText.includes(`"${id}"`));
  // Declared-but-never-triggered moments are dead payloads; report them as a hint, not a load failure. A moment
  // chosen by a conditional is still referenced somewhere as the same literal, so a mention anywhere counts.
  const serverText = text((unit.sources || []).map(local => path.resolve(directory, local)));
  const explicit = new Set(matches(serverText, /moment:\s*"([a-z0-9_]+)"/g));
  for (const [id, definition] of ownScenes) for (const moment of Object.keys(definition && definition.moments || {}))
    if (!explicit.has(moment) && !serverText.includes('"' + moment + '"')) notes.push(`scene ${id} declares moment "${moment}" but no server moment data reaches it`);
  if (!ownScenes.length) { notes.push('no WorldCombatParticles.scene registration found in clientSources'); return; }
  if (!fs.existsSync(classpathFile)) { notes.push('scene validation skipped: build/particle-checks-classpath.txt missing (integrator runs gradle :world-combat-core:testClasses)'); return; }
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'check-unit-scenes-'));
  try {
    for (const [id, definition] of ownScenes) fs.writeFileSync(path.join(temp, id.replace(/[:/]/g, '_') + '.json'), JSON.stringify(definition, null, 1));
    const run = spawnSync('java', ['-cp', fs.readFileSync(classpathFile, 'utf8').trim(), 'dev.worldcombat.core.client.particles.DefinitionBatchChecks', temp, '60'], { encoding: 'utf8', timeout: 120000 });
    const output = (run.stdout || '') + (run.stderr || '');
    const problems = output.split(/\r?\n/).filter(line => line.includes('PROBLEM')).map(line => line.replace(/^.*PROBLEM\s+/, '').trim());
    if (run.status !== 0 && !problems.length) errors.push(`scene validation could not run (exit ${run.status}): ${output.trim().split(/\r?\n/).slice(-3).join(' | ')}`);
    for (const problem of problems) errors.push(`scene: ${problem}`);
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
}

const fieldRuleOwners = new Map();
let failed = false;
for (const input of inputs) {
  const directory = path.resolve(root, input);
  const errors = [], notes = [];
  const unitFile = path.join(directory, 'unit.json');
  if (!fs.existsSync(unitFile)) { console.error(`${input}: unit.json missing`); failed = true; continue; }
  let unit;
  try { unit = read(unitFile); } catch (error) { console.error(`${input}: unit.json: ${error.message}`); failed = true; continue; }
  if (unit.schema !== 1) errors.push('unit.json schema must be 1');
  if (!identity.test(String(unit.id))) errors.push('unit.json id must look like world_combat:<kind>/<id>, e.g. world_combat:ability/flamebody or world_combat:move/tackle');
  if (typeof unit.version !== 'string') errors.push('unit.json version must be a string');
  unit.requires = unit.requires || {};
  for (const [field] of sides) for (const local of unit[field] || []) {
    const file = path.resolve(directory, local);
    if (!file.startsWith(directory) || !local.endsWith('.ts') || !fs.existsSync(file)) errors.push(`${field}: ${local} is not a .ts file inside the unit`);
  }
  if (!errors.length) {
    const closure = closureOf(unit, errors);
    const scenarioFile = fs.existsSync(path.join(directory, 'scenario.ts')) ? path.join(directory, 'scenario.ts') : null;
    const serverFiles = (unit.sources || []).map(local => path.resolve(directory, local));
    const scenarios = { serverFiles, scenarioFile };
    if (!errors.length) typeCheck(unit, directory, closure, scenarioFile, errors);
    checkAssets(unit, directory, closure, errors, notes);
    checkPreCommit(serverFiles, errors);
    checkTiming(scenarios, errors);
    checkParameters(scenarios, errors);
    checkPreferences(scenarios, unit.id, errors);
    checkScenes(unit, directory, closure, errors, notes);
    // Duplicate fieldRule ids are a global singleton collision; fieldRule throws at load once both load.
    const serverText = text(serverFiles);
    for (const rule of matches(serverText, /fieldRule\(\s*"([^"]+)"/g)) {
      const owner = fieldRuleOwners.get(rule);
      if (owner) errors.push(`fieldRule ${rule} is already registered by ${owner}; the shared registry is a global singleton and throws on a duplicate`);
      else fieldRuleOwners.set(rule, unit.id);
    }
    // Language keys generated from describe/addPreferences resolve against the merged profile dictionaries.
    const lang = mergedLang(directory, closure);
    checkLanguage(scenarios, unit.id, lang.zh, lang.en, errors, notes);
  }
  for (const note of notes) console.log(`${input}: note: ${note}`);
  if (errors.length) { failed = true; console.error(`${input}: FAIL`); for (const error of errors) console.error('  ' + error); }
  else console.log(`${input}: PASS (types, scenario, particle ids, lang keys, effect icons, preferences, parameters, timing, scene definitions; no build or game)`);
}
if (failed) process.exitCode = 1;
