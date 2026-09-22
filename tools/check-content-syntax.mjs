import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

// Parse only: no evaluation, type checking, dependency traversal, emission or game process.
const inputs = process.argv.slice(2);
if (!inputs.length) throw Error('Pass the files or content directories owned by this task');
const files = new Set();
function visit(input) {
  const stat = fs.lstatSync(input);
  if (stat.isSymbolicLink()) throw Error('Choose the actual task directory rather than a link: ' + input);
  if (stat.isDirectory()) for (const name of fs.readdirSync(input)) visit(path.join(input, name));
  else if (/\.(?:ts|tsx|js|mjs|cjs|json)$/.test(input)) files.add(path.resolve(input));
}
inputs.forEach(visit);
if (!files.size) throw Error('No TypeScript, JavaScript or JSON files selected');
const errors = [];
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  if (file.endsWith('.json')) {
    try { JSON.parse(source); } catch (error) { errors.push(file + ': ' + error.message); }
  } else {
    const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
    for (const error of ast.parseDiagnostics) {
      const position = ast.getLineAndCharacterOfPosition(error.start || 0);
      errors.push(`${file}:${position.line + 1}:${position.character + 1}: ${ts.flattenDiagnosticMessageText(error.messageText, '\n')}`);
    }
  }
}
if (errors.length) { process.stderr.write(errors.join('\n') + '\n'); process.exitCode = 1; }
else console.log(`Syntax OK: ${files.size} files (parse only; no build or tests)`);
