/** Read-only facts for one damage calculation. Providers enrich actual attributes; absence stays absence. */
namespace CombatantStats {
    export interface Facts {
        stats: { [id: string]: number };
        level?: number;
        types: string[];
        healthScale: number;
        armorExcluded: number;
        toughnessExcluded: number;
        data: { [id: string]: any };
    }
    export interface Context { world: CombatWorld; actor: CombatActor; }
    interface Provider { id: string; read: (context: Context, facts: Facts) => void; }
    export interface DamageSpec { base?: number; coefficient?: number; defenceCoefficient?: number;
        /** Override which combatant stat drives the attack term, e.g. "def" for a defence-as-attack move. */
        attackStat?: string;
        /** Override which combatant stat drives the defence term, e.g. "def" for special damage vs physical defence. */
        defenceStat?: string;
        evaluate?: (terms: DamageBreakdown) => number; formulaLabel?: string; rationale?: string; }
    export interface DamageContribution { id: string; label: string; amount: number; labelKey?: string; }
    export interface DamageContext extends Context { target: CombatActor; sourceFacts: Facts; targetFacts: Facts; move: any; }
    export interface DamagePreviewContext { world: CombatWorld | null; actor: CombatActor | null; sourceFacts: Facts; move: any; }
    interface DamageProvider { id: string; read: (context: DamageContext) => DamageContribution[]; preview?: (context: DamagePreviewContext) => DamageContribution[]; }
    export interface DamageBreakdown {
        base: number; attack: number; coefficient: number; attribute: number; contributions: DamageContribution[];
        potency: number; beforeDefence: number; defence: number; defenceCoefficient: number; defenceFactor: number; amount: number;
    }
    export var damageDefaults = { powerUnit: 10, attackReference: 100, defenceCoefficient: .005 };
    export function explicit(spec?: DamageSpec): boolean {
        return !!spec && (spec.base !== undefined || spec.coefficient !== undefined || spec.evaluate !== undefined);
    }
    export class Registry {
        /** Ordered final composition after every native/provider contribution; temporary type filters can retain future provider facts. */
        readonly resolved = new WorldContributions.Registry<Context & { facts: Facts }>();
        private providers: Provider[] = [];
        private damageProviders: DamageProvider[] = [];
        contributeDamage(id: string, read: DamageProvider["read"], preview?: DamageProvider["preview"]): void {
            if (!id || this.damageProviders.some(function (entry) { return entry.id === id; })) throw new Error("Duplicate damage contributor: " + id);
            this.damageProviders.push({ id: id, read: read, preview });
        }
        removeDamageContributor(id: string): boolean {
            var before = this.damageProviders.length;
            this.damageProviders = this.damageProviders.filter(function (entry) { return entry.id !== id; });
            return before !== this.damageProviders.length;
        }
        damageContributions(context: DamageContext): DamageContribution[] {
            var values: DamageContribution[] = [];
            this.damageProviders.forEach(function (provider) { values = values.concat(provider.read(context)); });
            return values;
        }
        previewContributions(context: DamagePreviewContext): { values: DamageContribution[]; deferred: string[] } {
            const result: { values: DamageContribution[]; deferred: string[] } = { values: [], deferred: [] };
            this.damageProviders.forEach(provider => {
                if (provider.preview) result.values = result.values.concat(provider.preview(context));
                else result.deferred.push(provider.id);
            });
            return result;
        }
        provide(id: string, read: Provider["read"]): void {
            if (!id || this.providers.some(function (entry) { return entry.id === id; })) throw new Error("Duplicate combatant provider: " + id);
            this.providers.push({ id: id, read: read });
        }
        remove(id: string): boolean {
            var before = this.providers.length;
            this.providers = this.providers.filter(function (entry) { return entry.id !== id; });
            return before !== this.providers.length;
        }
        read(world: CombatWorld, actor: CombatActor): Facts {
            var attribute = world.attributeValue(actor, "minecraft:generic.attack_damage");
            var attack = attribute === null ? 0 : attribute.value();
            var facts: Facts = { stats: { atk: attack, spa: attack }, types: [], healthScale: 1,
                armorExcluded: 0, toughnessExcluded: 0, data: {} };
            this.providers.forEach(function (provider) { provider.read({ world: world, actor: actor }, facts); });
            this.resolved.apply({ world: world, actor: actor, facts: facts });
            Object.keys(facts.stats).forEach(function (id) {
                if (!isFinite(facts.stats[id])) throw new Error("Invalid combatant stat: " + id);
            });
            if (facts.level !== undefined && (!isFinite(facts.level) || facts.level < 0)) throw new Error("Invalid combatant level");
            if (!isFinite(facts.healthScale) || facts.healthScale <= 0) throw new Error("Invalid combatant health scale");
            return facts;
        }
    }
    /** An absent defence stat adds no resistance; Minecraft armor stays in its native chain. */
    export function defence(facts: Facts, id: string): number {
        return facts.stats[id] === undefined ? 0 : Math.max(0, facts.stats[id]);
    }
    export function spec(power: number, authored?: DamageSpec): { base: number; coefficient: number; defenceCoefficient: number } {
        var value = authored || {}, independent = explicit(authored);
        var base = value.base === undefined ? independent ? 0 : power / damageDefaults.powerUnit : value.base;
        return { base: base, coefficient: value.coefficient === undefined ? independent ? 0 : base / damageDefaults.attackReference : value.coefficient,
            defenceCoefficient: value.defenceCoefficient === undefined ? damageDefaults.defenceCoefficient : value.defenceCoefficient };
    }
    /**
     * The caster-side damage tree. Settlement (`calculate`) and the hover text evaluate this same tree, so the
     * formula a player reads is the arithmetic that ran. Variables: `damage.power` (the segment's power
     * parameter), `damage.attack` (attack after stages, items and abilities), `damage.extra` (contributions),
     * `damage.potency` (power modifiers such as Flash Fire). Target-side factors stay in `PokemonDamage.resolve`.
     */
    export function damageFormula(authored?: DamageSpec): Formula.Node {
        var F = Formula.F, value = authored || {}, independent = explicit(authored);
        var base = value.base !== undefined ? F.base(value.base, { key: "worldcombat.value.base" })
            : independent ? F.const(0) : F.var("damage.power", { key: "worldcombat.value.power" }).div(damageDefaults.powerUnit).as({ key: "worldcombat.value.base" });
        var coefficient = value.coefficient !== undefined ? F.base(value.coefficient, { key: "worldcombat.value.coefficient" })
            : independent ? F.const(0) : base.div(damageDefaults.attackReference).as({ key: "worldcombat.value.coefficient" });
        var attack = F.var("damage.attack", { key: "worldcombat.value.effectiveAttack" });
        var extra = F.var("damage.extra", { key: "worldcombat.value.additional" });
        var core = base.plus(attack.times(coefficient)).plus(extra).max(0).times(F.var("damage.potency", { key: "worldcombat.value.powerFactor" }));
        return value.evaluate ? F.custom(function (facts) { return facts.read("damage.custom") as number; }, value.formulaLabel || { key: "worldcombat.value.customDamage" }) : core;
    }
    var compiledFormulas: { [key: string]: (facts: Formula.Facts) => number } = Object.create(null);
    /** Specs are copied per call, so the compiled tree is keyed by the shape that decides it. */
    export function compiledFormula(authored?: DamageSpec): (facts: Formula.Facts) => number {
        var value = authored || {};
        var key = String(value.base) + "|" + String(value.coefficient) + "|" + explicit(authored) + "|" + !!value.evaluate + "|" + (value.formulaLabel || "");
        return compiledFormulas[key] || (compiledFormulas[key] = Formula.compile(damageFormula(authored)));
    }
    export function calculate(power: number, attack: number, defence: number, authored?: DamageSpec,
        contributions: DamageContribution[] = [], potency: number = 1): DamageBreakdown {
        var terms = spec(power, authored);
        if (!isFinite(power) || ![attack, defence, potency, terms.base, terms.coefficient, terms.defenceCoefficient].every(function (value) { return isFinite(value) && value >= 0; }) ||
            power < 0) throw new Error("Damage needs finite nonnegative facts; power must be positive");
        var extra = 0, copied: DamageContribution[] = [];
        contributions.forEach(function (value) {
            if (!value.id || !value.label || !isFinite(value.amount)) throw new Error("Invalid damage contribution");
            extra += value.amount; copied.push({ id: value.id, label: value.label, amount: value.amount, labelKey: value.labelKey });
        });
        var attribute = attack * terms.coefficient;
        var facts: Formula.Facts = { read: function (id) {
            switch (id) {
                case "damage.power": return power; case "damage.attack": return attack; case "damage.extra": return extra; case "damage.potency": return potency;
                default: return undefined;
            }
        } };
        var beforeDefence = !explicit(authored) && attack === 0 ? 0 : (authored && authored.evaluate ? Math.max(0, terms.base + attribute + extra) * potency : compiledFormula(authored)(facts));
        var defenceFactor = 1 / (1 + defence * terms.defenceCoefficient);
        var result: DamageBreakdown = { base: terms.base, attack: attack, coefficient: terms.coefficient, attribute: attribute, contributions: copied,
            potency: potency, beforeDefence: beforeDefence, defence: defence, defenceCoefficient: terms.defenceCoefficient, defenceFactor: defenceFactor, amount: beforeDefence * defenceFactor };
        if (authored && authored.evaluate) result.amount = authored.evaluate(result);
        if (!isFinite(result.amount) || result.amount < 0) throw new Error("Damage must remain finite and nonnegative");
        return result;
    }
    export function base(power: number, attack: number, defence: number, authored?: DamageSpec): number {
        return calculate(power, attack, defence, authored).amount;
    }
}
