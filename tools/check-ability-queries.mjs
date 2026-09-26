import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Neutral recipe fixture: checking immunity must not trigger the actual absorption reward.
let healed = 0, boosted = 0;
const pokemon = { maxHealth: () => 100 }, state = { ability:'checks:absorb', suppressed:false };
const context = vm.createContext({
  NativeEffects: { ability: (_pokemon, value) => value.suppressed ? '' : value.ability, read: () => state,
    heal: (_world,_actor,_pokemon,amount) => healed += amount, boost: () => boosted++ },
  CobblemonCombat: { pokemon: () => pokemon },
});
for (const path of ['content/traits/composition.ts','content/mechanisms/native-abilities.ts','content/traits/ability-recipes.ts'])
  vm.runInContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES5,module:ts.ModuleKind.None}}).outputText,context);
const A = context.NativeAbilities;
context.NativeAbilityRecipes.absorption('checks:absorb','electric',.25,'spa',1);
assert(A.absorbsType(pokemon,state,'electric'));
assert(!A.absorbsType(pokemon,state,'water'));
assert.equal(healed,0); assert.equal(boosted,0);
state.suppressed = true; assert(!A.absorbsType(pokemon,state,'electric')); state.suppressed = false;
const hit = {type:'electric',amount:8}; A.apply({}, {}, 'incoming',hit,state);
assert.equal(hit.amount,0); assert.equal(healed,25); assert.equal(boosted,1);
assert(!A.absorbsType(pokemon,{ability:'checks:unknown'},'electric'));
console.log('PASS ability query: installed type facts, suppression, unknown traits and no query side effects');
