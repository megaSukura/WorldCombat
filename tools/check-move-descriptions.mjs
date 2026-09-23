import fs from 'node:fs';
import ts from 'typescript';

// Check the actual authored document, including constant skill ids and hidden gameplay values.
// This is structural validation; meaning is reviewed against each move's execution.
const read = file => fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
const property = (node, name) => node.properties?.find(p => p.name?.text === name);
const errors = [];
let moves = 0, paragraphs = 0;
for (const id of fs.readdirSync('content/moves')) {
    const directory = 'content/moves/' + id;
    if (!fs.existsSync(directory + '/unit.json')) continue;
    moves++;
    const source = ts.createSourceFile('parameters.ts', read(directory + '/parameters.ts'), ts.ScriptTarget.Latest, true);
    const calls = [], stages = [], parameters = new Set();
    const visit = node => {
        if (ts.isCallExpression(node) && node.expression.getText(source) === 'describe') calls.push(node);
        if (ts.isCallExpression(node) && node.expression.getText(source) === 'stages')
            stages.push(...(node.arguments[1]?.elements || []));
        if (ts.isCallExpression(node) && ['actionParameters.define', 'numbers'].includes(node.expression.getText(source)))
            for (const entry of node.arguments[1]?.properties || []) parameters.add(entry.name?.text);
        node.forEachChild(visit);
    };
    visit(source);
    if (calls.length !== 1 || !ts.isArrayLiteralExpression(calls[0].arguments[1])) {
        errors.push(id + ': expected one authored description array'); continue;
    }
    const tables = Object.fromEntries(['zh_cn', 'en_us'].map(locale => [locale, JSON.parse(read(directory + '/lang/' + locale + '.json'))]));
    const derived = new Set((calls[0].arguments[2]?.properties || []).map(p => p.name?.text));
    const seen = new Set();
    for (const row of calls[0].arguments[1].elements) {
        const key = property(row, 'key')?.initializer?.text;
        const values = property(row, 'values')?.initializer?.elements?.map(v => v.text);
        if (!key || !values || values.some(v => typeof v !== 'string')) { errors.push(id + ': dynamic paragraph requires review'); continue; }
        if (seen.has(key)) errors.push(id + ': duplicate paragraph ' + key);
        seen.add(key); paragraphs++;
        for (const value of values) {
            if (value.startsWith('tier.')) {
                const [, index, ...parts] = value.split('.'), name = parts.join('.'), stage = stages[Number(index)];
                if (!stage || (name !== 'level' && !property(property(stage, 'values')?.initializer || {}, name)))
                    errors.push(id + '/' + key + ': missing growth binding ' + value);
            } else if (!derived.has(value) && !value.startsWith('pref.') && !parameters.has(value)
                && !['pp', 'level', 'range', 'prepare', 'recover', 'cooldown'].includes(value))
                errors.push(id + '/' + key + ': unknown parameter ' + value);
        }
        for (const [locale, table] of Object.entries(tables)) {
            const text = table['worldcombat.skill.' + id + '.' + key];
            if (typeof text !== 'string' || !text.trim()) { errors.push(id + '/' + key + ': missing ' + locale); continue; }
            const used = new Set([...text.matchAll(/%(\d+)\$s/g)].map(m => Number(m[1])));
            for (const slot of used) if (slot < 1 || slot > values.length) errors.push(id + '/' + key + ': ' + locale + ' slot ' + slot + ' has no value');
            for (let i = 0; i < values.length; i++) if (!used.has(i + 1)) errors.push(id + '/' + key + ': ' + locale + ' omits ' + values[i] + ' (slot ' + (i + 1) + ')');
            const stripped = text.replace(/%\d+\$[sd]|%[sd]|%%/g, '');
            if (/%(?=[A-Za-z]|$)/.test(stripped)) errors.push(id + '/' + key + ': ' + locale + ' contains an unescaped format percent');
            for (const value of values) {
                if (derived.has(value) || ['pp', 'level', 'range', 'prepare', 'recover', 'cooldown'].includes(value)) continue;
                const name = value.startsWith('tier.') ? value.split('.').slice(2).join('.') : value;
                if (['level', 'prepare', 'recover', 'cooldown'].includes(name)) continue;
                const label = 'worldcombat.skill.' + id + (value.startsWith('pref.') ? '.preference.' + value.slice(5) : '.value.' + name);
                if (!table[label]) errors.push(id + '/' + key + ': ' + locale + ' missing label ' + label);
            }
        }
    }
}
if (errors.length) { console.error(errors.join('\n')); console.error(errors.length + ' description errors'); process.exitCode = 1; }
else console.log('PASS move descriptions: ' + moves + ' moves, ' + paragraphs + ' paragraphs; bilingual bindings and labels');
