/** One damage composition for living combatants, enriched by their available native facts. */
namespace PokemonDamage {
    /** `amount` is the caster-side theoretical value; actual HP loss, criticals and position arrive on `damage_applied`. */
    export interface Resolution { amount: number; metadata: string; }
    export type Metadata = Partial<NativeEffects.Move> & {
        damage?: CombatantStats.DamageSpec; deferred?: string[]; action?: number; eligibilityMove?: string; damageType?: string; segment?: string;
        /** fixed() only: exclude the target's actual native armour; other native protection still settles normally. */
        ignoreArmor?: boolean;
        /** Signed additive armour contribution accounted by this hit; native equipment and multipliers remain active. */
        armorAddedExcluded?: number; toughnessAddedExcluded?: number;
        ignoreDefenceStages?: boolean;
        knockback?: boolean; bypassCooldown?: boolean;
        /** Explicit launch-time same-type contribution, paired with its already resolved type. A later type change uses live facts instead. */
        sameTypeMultiplier?: number; sameTypeType?: string;
        /** This native hurt invocation leaves at least this much existing HP after Pre modifiers; absorption may leave more. */
        minimumHealth?: number;
    };
    export type ResolvedMetadata = NativeEffects.Move & Metadata & { move: string; action: number; flags: { [name: string]: boolean } };
    export interface FeatureContext {
        world: CombatWorld | null; actor: CombatActor | null; sourceFacts: CombatantStats.Facts;
        target: CombatActor | null; targetFacts?: CombatantStats.Facts; move: CombatPokemonMove; preview: boolean;
        action?: CombatAction;
        invocation?: NativeLoadout.Invocation | null;
        moveFacts?: NativeLoadout.Metadata;
        /** Registered skill segments supply their formula scope, including inspected preferences and stored values. */
        facts?: Formula.Facts;
        /** Power assembled from the move and authored layers before `resolve`, so a resolver can scale it. */
        power?: number;
    }
    /** Pure metadata resolution shared by preview and impact. Missing inputs may retain declared defaults and list deferred fact ids. */
    export type Features = Metadata & {
        resolve?: (context: FeatureContext) => Metadata | undefined;
        /** Callback-scoped input for action-owned direct damage and previews; excluded from serialized metadata. */
        actionContext?: CombatAction;
    };
    export interface MetadataContext extends FeatureContext { readonly metadata: ResolvedMetadata; }
    /** Ignore the defender's ladder for this hit only; never mutate its persistent stages or equipment. */
    export function ignoreDefenceStages(context: MetadataContext): void {
        if (!context.targetFacts) return;
        var native = context.targetFacts.data.native, stat = context.metadata.category === "special" ? "spd" : "def";
        context.metadata.ignoreDefenceStages = true;
        if (native && native.state) {
            if (native.state.stages) native.state.stages[stat] = 0;
            if (native.state.layers && native.state.layers.stages) native.state.layers.stages[stat] = 0;
        } else if (context.world && context.target) {
            context.metadata.armorAddedExcluded = (context.metadata.armorAddedExcluded || 0)
                + CombatStages.stage(context.world, context.target, "def") * CombatStages.armorPerStage;
        }
    }
    /** Pure, ordered source modifiers for every actor domain, after segment resolution and before native source modifiers. */
    export var metadata = new WorldContributions.Registry<MetadataContext>();
    // Legacy feature names are views of the canonical native flag names, so either consumer sees the same value.
    const flagAliases: { [name: string]: string } = { contact: "contact", punch: "punch", bite: "bite", sound: "sound", slice: "slicing", pulse: "pulse" };
    function mergeFlags(target: { [name: string]: boolean }, flags: any): void {
        Object.keys(flags || {}).forEach(key => { if (flags[key] !== undefined) target[key] = !!flags[key]; });
    }
    /** Compose authored feature layers per flag; later property assignments retain the same merge/alias contract. */
    export function composeFeatures(...layers: Features[]): Features {
        const value: any = {}, flags: { [name: string]: boolean } = Object.create(null);
        Object.defineProperty(value, "flags", { enumerable: true, get: () => flags, set: patch => mergeFlags(flags, patch) });
        Object.keys(flagAliases).forEach(alias => Object.defineProperty(value, alias, { enumerable: true,
            get: () => flags[flagAliases[alias]], set: flag => { if (flag !== undefined) flags[flagAliases[alias]] = !!flag; } }));
        layers.forEach(layer => {
            Object.keys(layer).forEach(key => { if (key !== "flags" && (<any>layer)[key] !== undefined) value[key] = (<any>layer)[key]; });
            mergeFlags(flags, layer.flags);
        });
        return value;
    }
    /** Native/effective flags, then authored fields, then dynamic fields. Within one layer the flags map wins over legacy aliases. */
    function moveData(context: FeatureContext, features: Features | undefined, defaults: any): any {
        const move = context.move, data: any = { kind: "move", bypassCooldown: true, action: 0, move: String(move.id()), type: String(move.type()),
            category: String(move.category()), power: move.power(), accuracy: move.accuracy(), priority: move.priority(), targetScale: 1, flags: Object.create(null) };
        context.moveFacts = NativeLoadout.facts(move);
        mergeFlags(data.flags, context.moveFacts.flags);
        Object.keys(flagAliases).forEach(alias => Object.defineProperty(data, alias, { enumerable: true,
            get: () => !!data.flags[flagAliases[alias]], set: value => { data.flags[flagAliases[alias]] = !!value; } }));
        context.action = context.action || features && features.actionContext;
        context.invocation = context.action ? NativeLoadout.invocation(context.action) : null;
        function merge(value: any): void {
            Object.keys(value || {}).forEach(key => {
                if (key !== "resolve" && key !== "actionContext" && key !== "flags" && value[key] !== undefined)
                    data[key] = key === "damage" ? copySpec(value[key]) : key === "deferred" ? value[key].slice() : value[key];
            });
            mergeFlags(data.flags, value && value.flags);
        }
        merge(defaults); merge(features);
        context.power = data.power;
        if (features && features.resolve) merge(features.resolve(context));
        if (data.sureHit === undefined) data.sureHit = move.accuracy() <= 0;
        if (context.action) { data.action = context.action.id(); NativeLoadout.hitMetadata(context.action, data); }
        if (context.preview) { data.preview = true; data.critical = false; }
        else delete data.preview;
        return data;
    }
    function copySpec(spec: CombatantStats.DamageSpec | undefined): CombatantStats.DamageSpec | undefined {
        if (!spec) return spec;
        const copy: any = {}; Object.keys(spec).forEach(key => copy[key] = (<any>spec)[key]); return copy;
    }
    function settledAmount(value: number): number {
        if (!isFinite(value)) throw new Error("Damage calculation must produce a finite nonnegative amount");
        return Math.max(0, value);
    }
    function validateCategory(data: any): void {
        if (data.category !== "physical" && data.category !== "special") throw new Error("Choose physical or special damage");
    }
    export var multipliers = { sameType: 1.5, critical: 1.5, burn: .5 };
    export function sameType(facts: CombatantStats.Facts, type: string): number {
        if (facts.types.indexOf(type) < 0) return 1;
        const native = <NativeFacts | undefined>facts.data.native;
        const ability = native ? NativeEffects.ability(native.pokemon, native.state) : "";
        return NativeAbilities.property(ability, "sameTypeMultiplier", multipliers.sameType);
    }
    function sameTypeFor(data: any, facts: CombatantStats.Facts): number {
        if (data.sameTypeMultiplier !== undefined) {
            if (typeof data.sameTypeMultiplier !== "number" || !isFinite(data.sameTypeMultiplier) || data.sameTypeMultiplier < 0 || typeof data.sameTypeType !== "string")
                throw new Error("A same-type snapshot requires a finite nonnegative multiplier and its resolved type");
            if (data.sameTypeType === data.type) return data.sameTypeMultiplier;
        }
        return sameType(facts, data.type);
    }
    /** Ordered target-side matchup contributions; they run after the base type product, so grounding can rewrite it. */
    export interface EffectivenessContext extends FeatureContext {
        data: any; readonly moveType: string; readonly targetTypes: string[]; effectiveness: number;
    }
    export var effectiveness = new WorldContributions.Registry<EffectivenessContext>();
    var criticalChances = [1 / 24, 1 / 8, 1 / 2, 1];
    export interface CriticalProfile {
        baseChance: number; moveStage: number; abilityStage: number; itemStage: number; stage: number; chance: number; multiplier: number;
    }
    export function criticalChance(stage: number): number {
        if (!isFinite(stage)) throw new Error("A finite critical stage is required");
        return criticalChances[Math.max(0, Math.min(criticalChances.length - 1, Math.floor(stage)))];
    }
    export function criticalProfile(move: CombatPokemonMove | undefined, ability: string, item: string, species: string): CriticalProfile {
        var moveStage = Math.max(0, (move ? move.critRatio() : 1) - 1), abilityStage = NativeAbilities.property(ability, "criticalStages", 0);
        var itemStage = NativeItems.critical(item, species, move).itemStage;
        var stage = moveStage + abilityStage + itemStage;
        return { baseChance: criticalChance(0), moveStage: moveStage, abilityStage: abilityStage, itemStage: itemStage, stage: stage,
            chance: criticalChance(stage), multiplier: NativeAbilities.property(ability, "criticalMultiplier", multipliers.critical) };
    }
    interface NativeFacts { pokemon: CombatPokemon; state: NativeEffects.State; }
    export interface SourceAdjustment { label: string; value: number | string; description?: string; translationKey?: string; }
    export function sourceFacts(pokemon: CombatPokemon, world?: CombatWorld | null, actor?: CombatActor | null): CombatantStats.Facts {
        if (world && actor && world.valid(actor)) return combatants.read(world, actor);
        var state = NativeEffects.empty();
        return { level: pokemon.level(), stats: { atk: pokemon.stat("atk"), spa: pokemon.stat("spa"), def: pokemon.stat("def"), spd: pokemon.stat("spd"), spe: pokemon.stat("spe") },
            types: NativeEffects.types(pokemon, state), healthScale: pokemon.healthScale(), armorExcluded: 0, toughnessExcluded: 0,
            data: { native: { pokemon: pokemon, state: state } } };
    }
    function sourcePower(context: FeatureContext, data: any): void {
        const scope: MetadataContext = Object.create(context);
        Object.defineProperty(scope, "metadata", { value: data, enumerable: true });
        metadata.apply(scope);
        const world = context.world, actor = context.actor, facts = context.sourceFacts;
        var native = <NativeFacts | undefined>facts.data.native;
        if (!native) return;
        NativeAbilities.applyFacts(native.pokemon, native.state, "move", data, world, actor);
        if (native.state.flags.flashFire && data.type === "fire") data.power *= 1.5;
    }
    function sourceAttack(world: CombatWorld | null, actor: CombatActor | null, facts: CombatantStats.Facts,
        data: any, stage: number, defence: number, opponent: CombatActor | null): any {
        var native = <NativeFacts | undefined>facts.data.native, pokemon = native && native.pokemon;
        var state = native ? native.state : NativeEffects.empty(), held = pokemon ? NativeEffects.item(pokemon, state) : "";
        var species = pokemon ? String(pokemon.species()) : "", stat = data.attackStat || (data.category === "physical" ? "atk" : "spa");
        var sourceValue = facts.stats[stat] || 0, attack = sourceValue * NativeEffects.multiplier(stage);
        var adjustments: SourceAdjustment[] = [
            { label: "培养属性", value: pokemon ? pokemon.stat(stat) : sourceValue },
            { label: "当前可用属性（含世界修正）", value: sourceValue },
            { label: "当前能力等级", value: stage }, { label: "能力倍率", value: NativeEffects.multiplier(stage) }
        ];
        if (native) {
            var ability = NativeEffects.ability(native.pokemon, state);
            adjustments.push({ label: "当前有效特性", value: ability || "无", translationKey: ability ? "cobblemon.ability." + ability : undefined });
            adjustments.push({ label: "当前生效携带物", value: held || "无", translationKey: held ? String(native.pokemon.heldDescriptionId()) : undefined });
        }
        if (world && actor && data.category === "physical") {
            var attribute = world.attributeValue(actor, "minecraft:generic.attack_damage");
            if (attribute) {
                adjustments.push({ label: "MC攻击属性基础", value: attribute.base() });
                adjustments.push({ label: "MC攻击属性实际值", value: attribute.value(), description: "包含原版力量、虚弱及其他Mod的属性修饰。" });
            }
        }
        if (pokemon) attack = NativeItems.applyFacts(pokemon, state, "attack", { category: data.category, attack, move: data }, world, actor).attack;
        adjustments.push({ label: "携带物调整后攻击", value: attack });
        var stats = { category: data.category, attack: attack, defence: defence, move: data, opponent: opponent, adjustments: adjustments };
        if (native) NativeAbilities.applyFacts(native.pokemon, state, "attack", stats, world, actor);
        adjustments.push({ label: "特性与其他效果调整后攻击", value: stats.attack });
        return stats;
    }
    function outgoing(world: CombatWorld | null, actor: CombatActor | null, facts: CombatantStats.Facts, data: any, amount: number): number {
        var native = <NativeFacts | undefined>facts.data.native, pokemon = native && native.pokemon;
        var state = native ? native.state : NativeEffects.empty(), ability = pokemon ? NativeEffects.ability(pokemon, state) : "", held = pokemon ? NativeEffects.item(pokemon, state) : "";
        if (pokemon && String(pokemon.status()) === "cobblemon:burn" && data.category === "physical" && !NativeAbilities.flag(ability, "burnPenaltyImmune")) amount *= multipliers.burn;
        data.amount = amount; if (native) NativeAbilities.applyFacts(native.pokemon, state, "damage", data, world, actor); amount = data.amount;
        if (pokemon) { data.amount = amount; amount = NativeItems.applyFacts(pokemon, state, "damage", data, world, actor).amount; }
        return amount;
    }
    /** Uses the executing source-side rules without inventing any target facts or rolling a hit. */
    export interface PreviewInput { action?: CombatAction; power?: PowerInput; }
    /** Pure source-side declaration, using the same dynamic segment/metadata/ability rules as damage without rolling a hit. */
    export function sourceMetadata(world: CombatWorld, actor: CombatActor, move: CombatPokemonMove, features: Features = {}, action?: CombatAction): any {
        const target = action ? action.target() : null;
        const context: FeatureContext = { world: world, actor: actor, sourceFacts: combatants.read(world, actor),
            target: target, targetFacts: target && world.valid(target) ? combatants.read(world, target) : undefined,
            move: move, preview: true, action: action };
        const data = moveData(context, features, {});
        sourcePower(context, data);
        return data;
    }
    export function preview(world: CombatWorld | null, actor: CombatActor | null, facts: CombatantStats.Facts, move: CombatPokemonMove, features: Features, input: PreviewInput = {}): any {
        var native = <NativeFacts | undefined>facts.data.native, pokemon = native && native.pokemon, state = native ? native.state : NativeEffects.empty();
        var ability = pokemon ? NativeEffects.ability(pokemon, state) : "", held = pokemon ? NativeEffects.item(pokemon, state) : "";
        var context: FeatureContext = { world, actor, sourceFacts: facts, target: null, move, preview: true, action: input.action };
        var data = moveData(context, features, input.power ? { power: input.power.value } : {});
        data.ignoreAbility = NativeAbilities.flag(ability, "bypassAbility");
        var power = data.power; sourcePower(context, data); validateCategory(data);
        var unavailable = input.power && power === input.power.value && input.power.explanation && input.power.explanation.unavailable || [];
        if (unavailable.length && power === 0 && !CombatantStats.explicit(data.damage)) return {
            amount: 0, available: false, calculated: null, metadata: data, category: data.category, type: data.type,
            authoredPower: power, deferred: unavailable.concat(data.deferred || [])
        };
        data.attackStat = data.damage && data.damage.attackStat || (data.category === "physical" ? "atk" : "spa");
        data.defenceStat = data.damage && data.damage.defenceStat || (data.category === "physical" ? "def" : "spd");
        var stage = NativeEffects.stage(state, data.attackStat);
        var stats = sourceAttack(world, actor, facts, data, stage, 0, null);
        var contributions = combatants.previewContributions({ world, actor, sourceFacts: facts, move: data });
        var calculated = CombatantStats.calculate(power, stats.attack, 0, data.damage, contributions.values, power > 0 ? data.power / power : 1);
        data.calculation = calculated;
        var sameType = sameTypeFor(data, facts);
        var theoretical = calculated.amount * sameType, amount = settledAmount(outgoing(world, actor, facts, data, theoretical));
        return { calculated: calculated, adjustments: stats.adjustments, deferred: contributions.deferred.concat(data.deferred || [], unavailable), typeFactor: sameType, amount: amount,
            category: data.category, type: data.type, metadata: data, authoredPower: power, stage, available: !unavailable.length && !contributions.deferred.length && !(data.deferred || []).length,
            outgoingFactor: theoretical > 0 ? amount / theoretical : 1,
            outgoingFlat: theoretical === 0 ? amount : 0,
            powerFactor: power > 0 ? data.power / power : 1, live: !!world && !!actor,
            critical: criticalProfile(move, ability, held, pokemon ? String(pokemon.species()) : "") };
    }
    export var combatants = new CombatantStats.Registry();
    export interface PowerInput { value: number; explanation?: Formula.Explanation; }
    /**
     * The caster-side damage the hover shows: the settlement tree (`CombatantStats.damageFormula`) read with
     * this caster's numbers, times the same-type bonus and the caster's own outgoing modifiers. Defence, type
     * matchup and the critical roll belong to the target and are applied at impact by `resolve`.
     */
    export function explain(world: CombatWorld | null, actor: CombatActor | null, facts: CombatantStats.Facts, move: CombatPokemonMove,
        features: Features, power: PowerInput, action?: CombatAction): { amount: number; explanation: Formula.Explanation; deferred: string[]; category: string; type: string; available: boolean } {
        var F = Formula.F, native = <NativeFacts | undefined>facts.data.native, pokemon = native && native.pokemon, state = native ? native.state : NativeEffects.empty();
        var ability = pokemon ? NativeEffects.ability(pokemon, state) : "", held = pokemon ? NativeEffects.item(pokemon, state) : "";
        var result = preview(world, actor, facts, move, features, { power, action }), data = result.metadata, calculated: CombatantStats.DamageBreakdown | null = result.calculated;
        if (!calculated) return { amount: 0, available: false, category: data.category, type: data.type, deferred: result.deferred,
            explanation: { value: 0, formula: [{ key: "worldcombat.value.unknown" }], terms: power.explanation ? [power.explanation] : [],
                unavailable: result.deferred, note: { key: "worldcombat.value.atImpact" } } };
        var authored = result.authoredPower, stage = result.stage, extra = 0;
        calculated.contributions.forEach(function (value) { extra += value.amount; });
        var core = !CombatantStats.explicit(data.damage) && calculated.attack === 0 ? F.const(0) : CombatantStats.damageFormula(data.damage);
        var node = core
            .times(F.var("damage.sameType", { key: "worldcombat.value.sameType" }))
            .times(F.var("damage.outgoing", { key: "worldcombat.value.outgoing" }));
        if (result.outgoingFlat !== 0) node = node.plus(F.var("damage.outgoingFlat", { key: "worldcombat.value.outgoing" }));
        var values: { [id: string]: number } = { "damage.power": authored, "damage.attack": calculated.attack, "damage.extra": extra, "damage.potency": result.powerFactor,
            "damage.sameType": result.typeFactor, "damage.outgoing": result.outgoingFactor, "damage.outgoingFlat": result.outgoingFlat, "damage.custom": calculated.amount };
        var adjustment = function (label: string): number | undefined {
            var found = result.adjustments.filter(function (entry: SourceAdjustment) { return entry.label === label && typeof entry.value === "number"; })[0];
            return found ? <number>found.value : undefined;
        };
        var attackTerms: Formula.Explanation[] = [];
        var trained = adjustment("培养属性"), worldStat = adjustment("当前可用属性（含世界修正）"), afterItem = adjustment("携带物调整后攻击");
        var attackStat = data.attackStat || (data.category === "physical" ? "atk" : "spa");
        var statLabel: Formula.Text = { key: "worldcombat.value.stat." + (attackStat === "atk" ? "attack" : attackStat === "spa" ? "specialAttack" : attackStat === "def" ? "defence" : "specialDefence") };
        if (trained !== undefined) attackTerms.push({ label: { key: "worldcombat.value.trained", args: [statLabel] }, value: trained, terms: [] });
        if (worldStat !== undefined && worldStat !== trained) attackTerms.push({ label: { key: "worldcombat.value.worldStat" }, value: worldStat, terms: [] });
        if (stage !== 0) attackTerms.push({ label: { key: "worldcombat.value.stageMultiplier", args: [stage > 0 ? "+" + stage : String(stage)] }, value: NativeEffects.multiplier(stage), terms: [] });
        if (afterItem !== undefined && afterItem !== worldStat) attackTerms.push({ label: { key: "worldcombat.value.afterItem" }, value: afterItem, terms: [] });
        var notes: Formula.Text[] = [{ key: "worldcombat.ui.value_line",
            args: [{ key: "cobblemon.move.category." + data.category, fallback: data.category }, { key: "cobblemon.type." + data.type, fallback: data.type }] }];
        if (ability) notes.push({ key: "worldcombat.ui.value_line", args: [{ key: "worldcombat.value.ability" }, { key: "cobblemon.ability." + ability }] });
        if (held && pokemon) notes.push({ key: "worldcombat.ui.value_line", args: [{ key: "worldcombat.value.heldItem" }, { key: String(pokemon.heldDescriptionId()) }] });
        var extraTerms = calculated.contributions.map(function (value) { return <Formula.Explanation>{ label: value.labelKey ? { key: value.labelKey } : value.label, value: value.amount, terms: [] }; });
        var expansions: { [id: string]: Formula.Explanation | undefined } = {
            "damage.power": authored === power.value ? power.explanation : undefined,
            "damage.attack": { value: calculated.attack, terms: attackTerms },
            "damage.extra": { value: extra, terms: extraTerms, note: result.deferred.length ? { key: "worldcombat.value.atImpact" } : undefined }
        };
        var explanation = Formula.explain(node, { read: function (id) { return values[id]; }, expand: function (id) { return expansions[id]; } });
        if (result.deferred.length) notes.push({ key: "worldcombat.value.atImpact" });
        if (authored === power.value && power.explanation && power.explanation.unavailable && power.explanation.unavailable.length) {
            explanation.unavailable = power.explanation.unavailable; notes.push({ key: "worldcombat.value.unknown" });
        }
        if (notes.length) explanation.note = notes;
        return { amount: result.amount, explanation: explanation, deferred: result.deferred, category: data.category, type: data.type, available: result.available };
    }
    combatants.provide("world_combat:ordinary-special-stages", function(context,facts) {
        if(String(context.actor.domain())==="cobblemon")return;
        var stages=CombatStages.effective(context.world,context.actor);
        // The MC attack attribute already carries Attack stages; special attacks use their own ladder.
        facts.stats.spa=facts.stats.spa/CombatStages.multiplier(stages.atk||0)*CombatStages.multiplier(stages.spa||0);
    });
    combatants.provide("cobblemon:permanent-stats", function (context, facts) {
        if (String(context.actor.domain()) !== "cobblemon") return;
        var pokemon = CobblemonCombat.pokemon(context.actor), state = NativeEffects.read(context.world, context.actor);
        facts.level = pokemon.level();
        ["atk", "spa", "def", "spd", "spe"].forEach(function (id) { facts.stats[id] = NativeEffects.stat(pokemon, state, id); });
        facts.stats.atk *= NativeSemantics.physicalMultiplier(context.world, context.actor);
        facts.types = NativeEffects.types(pokemon, state); facts.healthScale = pokemon.healthScale();
        facts.armorExcluded = pokemon.projectedArmor(); facts.toughnessExcluded = pokemon.projectedToughness();
        facts.data.native = { pokemon: pokemon, state: state };
    });
    /** Inspection is explicit about which values need a live target and native armor settlement. */
    export function describe(attacker: CombatPokemon, move?: CombatPokemonMove): any {
        var ability = String(attacker.ability()), held = String(attacker.heldItem()).replace("cobblemon:", "");
        var critical = criticalProfile(move, ability, held, String(attacker.species()));
        var sameType = NativeAbilities.property(ability, "sameTypeMultiplier", multipliers.sameType);
        return { formula: "伤害 = (本段基础值 + 对应攻击 × 本招系数 + 附加贡献) ÷ (1 + 对应防御 × 防御系数)",
            level: attacker.level(), defenceCoefficient: CombatantStats.damageDefaults.defenceCoefficient,
            attack: attacker.stat("atk"), specialAttack: attacker.stat("spa"),
            critical: critical, sameTypeMultiplier: sameType, nativeCategory: move ? String(move.category()) : "", nativePower: move ? move.power() : null,
            rules: ["物理使用攻击/防御，特殊使用特攻/特防；没有防御属性时不增加这项减伤。等级通过培养属性参与。",
                "每段伤害由本招的基础值、攻击系数与对应防御共同决定。",
                "能力变化、特性和携带物先修正攻防或威力；当前原生快照本系×" + sameType + "，暴击×" + critical.multiplier + "，再计算属性关系与其他伤害修正。",
                "暴击等级共同决定概率；目标的防暴击特性、临时特性替换或抑制会继续影响实际结果。",
                "力量、虚弱及攻击属性修正影响物理攻击；灼伤通常使物理伤害×" + multipliers.burn + "。",
                "实际扣血还受目标的护甲、韧性、抗性、护盾与吸收影响；同一来源的防御只计算一次。"] };
    }
    var immunityObservers: { [id: string]: (world: CombatWorld, target: CombatActor, metadata: string) => void } = Object.create(null);
    export function onImmunity(id: string, observer: (world: CombatWorld, target: CombatActor, metadata: string) => void): void {
        if (immunityObservers[id]) throw new Error("Duplicate immunity observer");
        immunityObservers[id] = observer;
    }
    /** Only execution sites report an immunity; calculations and AI previews remain observational. */
    export function immune(world: CombatWorld, target: CombatActor, metadata: string): void {
        Object.keys(immunityObservers).forEach(function (id) { immunityObservers[id](world, target, metadata); });
    }
    /** One settled receipt: `actual` is the HP that was really lost, with the settled critical and hit position. */
    export interface DamageReceipt {
        world: CombatWorld; actor: CombatActor; target: CombatActor; move: string; action: number;
        segment?: string; amount: number; actual: number; critical: boolean; x?: number; y?: number; z?: number;
        data: any; event: CombatWorldEvent;
    }
    export interface DamageFilter { move?: string; segment?: string; action?: number; }
    interface DamageObserver { listener: (receipt: DamageReceipt) => void; filter?: DamageFilter; }
    var damageObservers: { [id: string]: DamageObserver } = Object.create(null);
    var damageObserverHooks: { [id: string]: boolean } = Object.create(null);
    function observerId(id: string): string { return id.indexOf(":") < 0 ? "world_combat:" + id : id; }
    /** Consume one native settlement; removing a listener stops delivery, including inside another listener. */
    export function onDamageApplied(id: string, listener: (receipt: DamageReceipt) => void, filter?: DamageFilter): void {
        id = observerId(id);
        if (damageObservers[id]) throw new Error("Duplicate damage observer: " + id);
        damageObservers[id] = { listener: listener, filter: filter };
        if (damageObserverHooks[id]) return;
        damageObserverHooks[id] = true;
        var colon = id.indexOf(":"), hook = id.slice(0, colon + 1) + "damage_observer/" + id.slice(colon + 1);
        WorldCombat.on(hook, "world_combat:damage_applied", "", function (event) {
            var observer = damageObservers[id], target = event.target(); if (!observer || target === null) return;
            var data = JSON.parse(String(event.data())), filter = observer.filter;
            if (typeof data.actual !== "number" || !isFinite(data.actual)) return;
            if (filter && (filter.move !== undefined && data.move !== filter.move || filter.segment !== undefined && data.segment !== filter.segment ||
                filter.action !== undefined && data.action !== filter.action)) return;
            observer.listener({ world: event.world(), actor: event.actor(), target: target, move: data.move, action: data.action,
                segment: data.segment, amount: data.amount, actual: data.actual,
                critical: !!data.critical, x: data.x, y: data.y, z: data.z, data: data, event: event });
        });
    }
    export function removeDamageApplied(id: string): boolean { id = observerId(id); var found = !!damageObservers[id]; delete damageObservers[id]; return found; }
    function zeroFeedback(world: CombatWorld, target: CombatActor, result: Resolution): void {
        if (JSON.parse(result.metadata).effectiveness === 0) immune(world, target, result.metadata);
    }
    export function apply(world: CombatWorld, target: CombatActor, move: CombatPokemonMove, features?: Features, action?: CombatAction): boolean {
        var result = resolve(world, world.source(), target, move, features, action ? action.id() : 0, action);
        if (result.amount <= 0) { zeroFeedback(world, target, result); return false; }
        return world.hurt(target, result.amount, result.metadata);
    }
    /** Authored residual world-HP damage, attributed to the current effect source. Native armor, guards,
     * immunity and damage events settle the result; callers display its damage_applied receipt. */
    export function residual(world: CombatWorld, target: CombatActor, move: string, amount: number, payload: any = {}): boolean {
        if (!isFinite(amount) || amount < 0) throw new Error("Residual damage requires a finite nonnegative amount");
        if (amount === 0 || !world.valid(target)) return false;
        if (String(target.domain()) === "cobblemon") {
            const state = NativeEffects.read(world, target), ability = NativeEffects.ability(CobblemonCombat.pokemon(target), state);
            if (NativeAbilities.flag(ability, "indirectImmune")) return false;
        }
        const data: any = {};
        Object.keys(payload).forEach(key => data[key] = payload[key]);
        data.kind = "residual"; data.move = move; data.segment = "residual";
        data.damageType = "world_combat_core:effect"; data.category = "status"; data.type = "";
        data.contact = false; data.knockback = false; data.critical = false; data.bypassAccuracy = true;
        data.indirect = true; data.calculation = { mode: "residual", amount: amount };
        return world.hurt(target, amount, JSON.stringify(data));
    }
    /** A caller-authored world-HP amount. No attack/defence/STAB/critical rescaling; native hurt, guards and attribution remain active. */
    export function fixed(world: CombatWorld, target: CombatActor, move: CombatPokemonMove, amount: number,
                          features: Features = {}, typePolicy: "immunity" | "effectiveness" | "none" = "immunity", action?: CombatAction): boolean {
        if (!isFinite(amount) || amount < 0) throw new Error("Fixed damage requires a finite nonnegative amount");
        if (amount === 0 || !world.valid(target)) return false;
        var actor = world.source(), sourceFacts = combatants.read(world, actor), targetFacts = combatants.read(world, target);
        var context: FeatureContext = { world: world, actor: actor, sourceFacts: sourceFacts, target: target, targetFacts: targetFacts,
            move: move, preview: false, action: action };
        var data = moveData(context, features, { action: action ? action.id() : 0,
            armorExcluded: targetFacts.armorExcluded, toughnessExcluded: targetFacts.toughnessExcluded });
        if (features.ignoreArmor) {
            var armor = world.attributeValue(target, "minecraft:generic.armor"), toughness = world.attributeValue(target, "minecraft:generic.armor_toughness");
            data.armorExcluded = armor ? armor.value() : 0; data.toughnessExcluded = toughness ? toughness.value() : 0;
        }
        sourcePower(context, data); validateCategory(data);
        data.critical = false;
        data.calculation = { mode: "fixed", amount: amount };
        var factor = 1;
        targetFacts.types.forEach(function (type) { factor *= CobblemonCombat.typeEffectiveness(data.type, type); });
        var match: EffectivenessContext = { world: world, actor: actor, sourceFacts: sourceFacts, target: target, targetFacts: targetFacts,
            move: move, preview: false, action: action, facts: context.facts, power: context.power, data: data,
            moveType: data.type, targetTypes: targetFacts.types.slice(), effectiveness: factor };
        effectiveness.apply(match);
        if (!isFinite(match.effectiveness) || match.effectiveness < 0) throw new Error("Invalid type effectiveness");
        data.effectiveness = typePolicy === "none" ? 1 : match.effectiveness;
        var applied = typePolicy === "effectiveness" ? amount * match.effectiveness : typePolicy === "immunity" && match.effectiveness === 0 ? 0 : amount;
        if (applied === 0) { immune(world, target, JSON.stringify(data)); return false; }
        return world.hurt(target, applied, JSON.stringify(data));
    }
    export function base(attacker: CombatPokemon, defender: CombatPokemon, type: string, category: string, power: number): number {
        if (!isFinite(power) || power <= 0) throw new Error("A positive finite base power is required");
        if (category !== "physical" && category !== "special") throw new Error("Choose physical or special damage");
        var attack = attacker.stat(category === "physical" ? "atk" : "spa");
        var defence = defender.stat(category === "physical" ? "def" : "spd");
        var value = CombatantStats.base(power, attack, defence);
        var stab = 1;
        for (var a = 0; a < attacker.typeCount(); a++) if (String(attacker.type(a)) === type) stab = multipliers.sameType;
        var effectiveness = 1;
        for (var d = 0; d < defender.typeCount(); d++) {
            effectiveness *= CobblemonCombat.typeEffectiveness(type, String(defender.type(d)));
        }
        return value * stab * effectiveness;
    }

    /** The action still owns trace validation, once-only settlement, native damage and cleanup. */
    export function hit(action: CombatAction, impact: CombatImpact, move: CombatPokemonMove, features?: Features, strike?: string): boolean {
        var target = impact.target();
        if (target === null) return false;
        var result = resolve(action.world(), action.actor(), target, move, features, action.id(), action);
        if (result.amount <= 0) { zeroFeedback(action.world(), target, result); return false; }
        return action.hit(impact, result.amount, strike || "primary", result.metadata);
    }
    /** Same script calculation for geometric hits and composed area/chain effects. */
    export function resolve(world: CombatWorld, source: CombatActor, target: CombatActor, move: CombatPokemonMove,
                            features?: Features, actionId: number = 0, action?: CombatAction): Resolution {
        var sourceFacts = combatants.read(world, source), targetFacts = combatants.read(world, target);
        var nativeSource = <NativeFacts | undefined>sourceFacts.data.native, nativeTarget = <NativeFacts | undefined>targetFacts.data.native;
        var attacker = nativeSource && nativeSource.pokemon, defender = nativeTarget && nativeTarget.pokemon;
        var own = nativeSource ? nativeSource.state : NativeEffects.empty(), other = nativeTarget ? nativeTarget.state : NativeEffects.empty();
        var ability = attacker ? NativeEffects.ability(attacker, own) : "", defending = defender ? NativeEffects.ability(defender, other) : "";
        var held = attacker ? NativeEffects.item(attacker, own) : "", defendingItem = defender ? NativeEffects.item(defender, other) : "";
        var species = attacker ? String(attacker.species()) : "";
        var context: FeatureContext = { world, actor: source, sourceFacts, target, targetFacts, move, preview: false, action };
        var data = moveData(context, features,
            { action: actionId, armorExcluded: targetFacts.armorExcluded, toughnessExcluded: targetFacts.toughnessExcluded });
        var authoredPower = data.power;
        data.ignoreAbility = NativeAbilities.flag(ability, "bypassAbility");
        var blockedCrit = !data.ignoreAbility && NativeAbilities.flag(defending, "criticalImmune");
        var critical = criticalProfile(move, ability, held, species);
        data.criticalChance = blockedCrit ? 0 : critical.chance;
        data.critical = !blockedCrit && (typeof data.critical === "boolean" ? data.critical : world.random() < critical.chance);
        sourcePower(context, data); validateCategory(data);
        var attackStat = data.damage && data.damage.attackStat || (data.category === "physical" ? "atk" : "spa");
        var defenceStat = data.damage && data.damage.defenceStat || (data.category === "physical" ? "def" : "spd");
        data.attackStat = attackStat; data.defenceStat = defenceStat;
        var aStage = NativeEffects.stage(own, attackStat), dStage = NativeEffects.stage(other, defenceStat);
        if (data.critical) { aStage = Math.max(0, aStage); dStage = Math.min(0, dStage); }
        if (NativeAbilities.flag(defending, "ignoreOpponentStages") && !data.ignoreAbility) aStage = 0;
        if (NativeAbilities.flag(ability, "ignoreOpponentStages")) dStage = 0;
        var defence = CombatantStats.defence(targetFacts, defenceStat) * NativeEffects.multiplier(dStage);
        if (defender) defence = NativeItems.applyFacts(defender, other, "defence", { category: data.category, defence, move: data }, world, target).defence;
        var stats = sourceAttack(world, source, sourceFacts, data, aStage, defence, target);
        if (nativeTarget && !data.ignoreAbility) NativeAbilities.apply(world, target, "defence", stats, other);
        var attack = stats.attack; defence = stats.defence;
        var contributions = combatants.damageContributions({ world: world, actor: source, target: target, sourceFacts: sourceFacts, targetFacts: targetFacts, move: data });
        var calculation = CombatantStats.calculate(authoredPower, attack, defence, data.damage, contributions, authoredPower > 0 ? data.power / authoredPower : 1);
        var amount = calculation.amount;
        data.calculation = calculation;
        data.calculation.defenceAvailable = targetFacts.stats[defenceStat] !== undefined;
        amount *= sameTypeFor(data, sourceFacts);
        var targetTypes = targetFacts.types.slice();
        data.effectiveness = 1;
        targetTypes.forEach(function (type) { data.effectiveness *= CobblemonCombat.typeEffectiveness(data.type, type); });
        var effectScope: EffectivenessContext = { world: world, actor: source, sourceFacts: sourceFacts, target: target, targetFacts: targetFacts,
            move: move, preview: false, action: action, facts: context.facts, power: context.power, data: data,
            moveType: data.type, targetTypes: targetTypes, effectiveness: data.effectiveness };
        effectiveness.apply(effectScope);
        data.effectiveness = effectScope.effectiveness;
        amount *= data.effectiveness;
        data.criticalMultiplier = data.critical ? critical.multiplier : 1;
        if (data.critical) amount *= data.criticalMultiplier;
        amount = outgoing(world, source, sourceFacts, data, amount);
        amount = settledAmount(amount);
        return { amount: amount, metadata: JSON.stringify(data) };
    }
}
