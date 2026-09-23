namespace PokemonSkills {
    /** A fact scope can describe any actor; native-only facts require a native individual. */
    export interface FactContext {
        pokemon?: CombatPokemon | null;
        skill?: Skill;
        detail?: any;
        state?: (id: string) => any;
        world?: CombatWorld | null;
        actor?: CombatActor | null;
        attributes?: IndividualAttributes.Context;
        /** Explicit snapshots are authoritative; otherwise each evaluation reads the current source. */
        sourceFacts?: CombatantStats.Facts;
        action?: CombatAction | null;
        target?: FactContext | null;
        move?: CombatPokemonMove | null;
        /** The paying resource may belong to a different move. A reader can refresh it between callbacks. */
        resource?: CombatPokemonMove | null | (() => CombatPokemonMove | null);
        /** Own exact keys override providers, including undefined; a provider's undefined falls through. */
        variables?: { [key: string]: any };
        facts?: Formula.Facts;
    }
    /** The native catalogue's value/timing contributors require an actual individual. */
    export interface NumberContext extends FactContext { pokemon: CombatPokemon; skill: Skill; detail: any; }
    export type FactSource = FactContext | CombatAction | CombatWorld | CombatEffect | CombatPokemon;
    /** Public actor-formula input. Scope extraction performs no native individual or storage access. */
    export function factContext(source: FactSource): FactContext {
        const value: any = source;
        let context: FactContext;
        if (typeof value.sense === "function") context = { world: value.sense(), actor: value.actor(), action: value };
        else if (typeof value.observe === "function") context = { world: value, actor: value.source() };
        else if (typeof value.world === "function") {
            const world: CombatWorld = value.world();
            context = { world, actor: value.source(), target: { world, actor: value.target() } };
        } else if (typeof value.level === "function") context = { pokemon: value };
        else context = value;
        if (context.action && (context.world === undefined || context.actor === undefined)) {
            const scope: FactContext = Object.create(context);
            if (scope.world === undefined) scope.world = context.action.sense();
            if (scope.actor === undefined) scope.actor = context.action.actor();
            return scope;
        }
        return context;
    }
    /** Aim one fact scope at an explicit target so previews and each hit object evaluate the same skill facts. */
    export function withTarget(context: FactContext, target: CombatActor | FactContext | null): FactContext {
        const scope: FactContext = Object.create(context);
        if (target === null) scope.target = null;
        else scope.target = typeof (<any>target).ref === "function" ? { world: context.world, actor: <CombatActor>target } : <FactContext>target;
        return scope;
    }
    var factProviders: { [id: string]: (context: FactContext) => Formula.Facts } = Object.create(null);
    /** Pure skill-owned facts are available to execution, inspection and registered damage metadata alike. Undefined falls through to built-ins. */
    export function defineFacts(id: string, provider: (context: FactContext) => Formula.Facts): void {
        if (factProviders[id]) throw new Error("Duplicate fact provider: " + id);
        factProviders[id] = provider;
    }
    export var actionParameters = new ActionParameters.Registry<NumberContext>();
    /** The formula builder, so a move writes `F.stat("speed").times(0.2)` next to its other parameters. */
    export var F = Formula.F;
    export var timingValues = new RuleValues.Registry<NumberContext>();
    export function registerTiming(skill: Skill): void {
        ["prepare", "recover", "cooldown"].forEach(key => timingValues.define<number>(skill.id + "/" + key, {
            value: scope => {
                const base = (<any>skill)[key], level = scope.fact("source.level", text("worldcombat.value.level"), scope.context.pokemon.level());
                const value = stageValue(skill.id, key, level, base);
                if (value !== base) scope.term(skill.id + "/" + key, text("worldcombat.value.growth"), value - base);
                return value;
            }, valid: value => value >= 0
        }));
    }
    export type ParameterSource = NumberContext | FactContext | CombatAction | CombatWorld | CombatEffect | CombatPokemon;
    export interface GrowthStage { level: number; values: { [key: string]: number }; }
    var growthStages: { [id: string]: GrowthStage[] } = Object.create(null);
    export function readState(context: FactContext, id: string): any {
        return context.state ? context.state(id) : context.world && context.actor && context.world.valid(context.actor) && String(context.actor.domain()) === "cobblemon"
            ? state(context.world, context.actor, id) : {};
    }
    /**
     * 原生招式目录的上下文：现场 actor 属于 Cobblemon；通用行为体公式使用 factsOf(source)。
     * 动作／世界／效果提供现场与当前偏好；只传 CombatPokemon 时使用该招默认偏好，现场事实缺省。
     * 部分 FactContext 按现场补齐原生个体、偏好与属性；显式提供的招式、配置与事实继续沿用。
     * resolve／indicator 已拿到配置时，可显式传 NumberContext（detail.values 放这份配置）；
     * world、actor 只在有现场时提供。配置与世界输入在每次求值时读取，公式只缓存结构。
     */
    export function parameterContext(id: string, source: ParameterSource): NumberContext {
        const scope = factContext(source);
        requirePokemon(scope);
        const world = scope.world || null, actor = scope.actor || null;
        // Casting reads a handful of numbers per tick; the individual storage and the preference config are
        // only materialised when a rule actually asks for them.
        const context: FactContext = Object.create(scope);
        if (!scope.skill) Object.defineProperty(context, "skill", { enumerable: true, value: skills[id] });
        Object.defineProperty(context, "pokemon", { enumerable: true, get: () => scope.pokemon || requirePokemon(scope) });
        Object.defineProperty(context, "attributes", { enumerable: true, get: () => {
            const supplied = scope.attributes;
            if (supplied !== undefined) return supplied;
            return world && actor && world.valid(actor) && String(actor.domain()) === "cobblemon" ? IndividualAttributes.live(world, actor) : undefined;
        } });
        Object.defineProperty(context, "detail", { enumerable: true, get: () => {
            const supplied = scope.detail;
            if (supplied !== undefined) return supplied;
            return { values: world && actor && world.valid(actor) && String(actor.domain()) === "cobblemon" ? config(world, actor, id) : context.skill!.defaults };
        } });
        return <NumberContext>context;
    }
    /** The same public input and explanation are used in the action and the recalled party detail page. */
    export function attribute<T>(scope: RuleValues.Scope<NumberContext>, id: string): T {
        const context = scope.context;
        const attributes = context.attributes || (context.world && context.actor ? IndividualAttributes.live(context.world, context.actor) : null);
        if (!attributes) throw new Error("Public attribute evaluation requires an individual storage scope: " + id);
        return PokemonAttributes.value<T, NumberContext>(scope, attributes, id);
    }
    /**
     * 在 actionParameters.define 之后登记。每级 values 写设计值：实际公式加上（该级设计值 − entry.value），
     * 因而保留个体数据贡献；这一加项在原公式之后、其 clamp 之外执行。
     * formula 的 options.base 决定 entry.value；未提供时它是所有事实缺省时的求值结果（读等级／状态的公式
     * 此时接近 0，整段设计值会叠上去）。要让台阶相对中性设计值，请在 formula 里给出显式 base，见 formula()。
     * prepare／recover／cooldown 由 registerTiming 读取台阶；其他键需已有对应参数声明，否则报错。
     */
    export function stages(id: string, entries: GrowthStage[]): void {
        if (growthStages[id]) throw new Error("Duplicate growth design: " + id);
        entries.forEach((stage, index) => {
            if (!isFinite(stage.level) || stage.level < 1 || index > 0 && entries[index - 1].level >= stage.level)
                throw new Error("Growth levels must increase: " + id);
            Object.keys(stage.values).forEach(key => { if (!isFinite(stage.values[key])) throw new Error("Invalid growth result: " + id + "/" + key); });
        });
        growthStages[id] = entries;
        const keys: { [id: string]: boolean } = Object.create(null);
        entries.forEach(stage => Object.keys(stage.values).forEach(key => keys[key] = true));
        Object.keys(keys).forEach(key => {
            const entry = actionParameters.entries(id)[key];
            if (!entry) {
                // prepare/recover/cooldown growth is read by registerTiming; any other unknown key is a typo.
                if (["prepare", "recover", "cooldown"].indexOf(key) < 0)
                    throw new Error("Growth stage has no action parameter: " + id + "/" + key);
                return;
            }
            // A formula entry adds the growth ladder as one term: the shift each level step brings over the design value.
            if (entry.formula) {
                const pairs: number[][] = [[0, 0]];
                entries.forEach(stage => { if (stage.values[key] !== undefined) pairs.push([stage.level, stage.values[key] - entry.value]); });
                actionParameters.rules.modify(id + "/" + key, id + ":growth", "+", Formula.F.growth(pairs, { key: "worldcombat.value.growth" }));
                return;
            }
            // Growth shifts the design value; a data-driven `evaluate` keeps its inputs and receives the same shift.
            actionParameters.rules.contribute(id + "/" + key, id + ":growth", (scope, base) => {
                const level = scope.fact("source.level", { key: "worldcombat.value.level" }, scope.context.pokemon.level());
                const shift = stageValue(id, key, level, entry.value) - entry.value;
                if (shift !== 0) scope.term(id + "/" + key, { key: "worldcombat.value.growth" }, shift);
                return base + shift;
            });
        });
    }
    export function stageValue(id: string, key: string, level: number, base: number): number {
        let value = base;
        (growthStages[id] || []).forEach(stage => { if (level >= stage.level && stage.values[key] !== undefined) value = stage.values[key]; });
        return value;
    }
    var damageDesigns: {
        [id: string]: {
            [segment: string]: CombatantStats.DamageSpec;
        };
    } = Object.create(null);
    var damageTags: {
        [id: string]: {
            [segment: string]: PokemonDamage.Features;
        };
    } = Object.create(null);
    export function copyDamage(spec: CombatantStats.DamageSpec): CombatantStats.DamageSpec {
        const value: any = {};
        Object.keys(spec).forEach(key => value[key] = (<any>spec)[key]);
        return value;
    }
    /**
     * 登记段名与伤害规格；describe 的同名绑定显示我方理论伤害，并展开该参数的公式。
     * impact／hurt 默认选 power 段；自定义段通过 features.damage = damageSpec(id, segment) 传入。
     * damageFeatures(id, segment) 同时带上本段 tags 和声明类别。类别取原生或 defineCategory 的覆写。
     * tags.resolve 的 facts 读取同一公式上下文；动态元数据在预览和命中时由同一读取器生成。
     */
    export function defineDamage(id: string, segment: string, spec: CombatantStats.DamageSpec, tags: PokemonDamage.Features = {}): void {
        const values = damageDesigns[id] || (damageDesigns[id] = Object.create(null));
        if (values[segment])
            throw new Error("Duplicate damage design: " + id + "/" + segment);
        values[segment] = copyDamage(spec);
        (damageTags[id] || (damageTags[id] = Object.create(null)))[segment] = tags;
    }
    export function damageSpec(id: string, segment = "power"): CombatantStats.DamageSpec | undefined {
        const values = damageDesigns[String(id)], value = values && values[segment];
        return value ? copyDamage(value) : undefined;
    }
    /** Registered segment names, so a unique segment can be selected without repeating damageFeatures at the call site. */
    export function damageSegments(id: string): string[] {
        const values = damageDesigns[String(id)];
        return values ? Object.keys(values) : [];
    }
    /** Registered damage uses any actor fact scope; native catalogue preferences are read only for native sources. */
    export function damageFeatures(id: string, segment = "power", context?: FactContext): PokemonDamage.Features {
        const tags = damageTags[id] && damageTags[id][segment];
        const value = PokemonDamage.composeFeatures({ damage: damageSpec(id, segment), category: damageCategory(id), segment: segment }, tags || {});
        if (context && context.action) value.actionContext = context.action;
        value.resolve = (damage: PokemonDamage.FeatureContext) => {
            const scope: FactContext = context ? Object.create(context) : { skill: skills[id] };
            if (!scope.skill) scope.skill = skills[id];
            scope.world = damage.world; scope.actor = damage.actor; scope.sourceFacts = damage.sourceFacts;
            scope.action = damage.action || scope.action;
            scope.target = damage.target ? { world: damage.world, actor: damage.target, sourceFacts: damage.targetFacts } : null;
            Object.defineProperty(scope, "pokemon", { value: damage.sourceFacts.data.native ? damage.sourceFacts.data.native.pokemon : null, enumerable: true });
            if (!scope.detail) scope.detail = { values: damage.world && damage.actor && scope.pokemon ? config(damage.world, damage.actor, id) : skills[id].defaults };
            damage.facts = Formula.snapshot(factsOf(scope));
            return tags && tags.resolve ? tags.resolve(damage) : undefined;
        };
        return value;
    }
    export function sourceSnapshot(context: NumberContext): CombatantStats.Facts {
        return context.sourceFacts || PokemonDamage.sourceFacts(pokemonOf(context) || context.pokemon, context.world, context.actor);
    }
    var nativeStatisticIds: { [name: string]: string } = { attack: "atk", defence: "def", specialAttack: "spa", specialDefence: "spd", speed: "spe", atk: "atk", def: "def", spa: "spa", spd: "spd", spe: "spe", hp: "hp" };
    function nativeStatisticId(name: string, pokemon?: CombatPokemon): string | undefined {
        if (Object.prototype.hasOwnProperty.call(nativeStatisticIds, name)) return nativeStatisticIds[name];
        return pokemon && typeof pokemon.statIds === "function" && JSON.parse(String(pokemon.statIds())).indexOf(name) >= 0 ? name : undefined;
    }
    function observed(context: FactContext): CombatObservation | null {
        return context.world && context.actor && context.world.valid(context.actor) ? context.world.observe(context.actor) : null;
    }
    function pokemonOf(context: FactContext): CombatPokemon | null {
        if (context.world && context.actor) return context.world.valid(context.actor) && String(context.actor.domain()) === "cobblemon" ? CobblemonCombat.pokemon(context.actor) : null;
        return context.pokemon || context.attributes && context.attributes.pokemon || null;
    }
    function requirePokemon(context: FactContext): CombatPokemon {
        const pokemon = pokemonOf(context);
        if (!pokemon) throw new Error("Native skill parameters require an available Pokemon source");
        return pokemon;
    }
    function availableSource(context: FactContext): CombatantStats.Facts | undefined {
        if (context.sourceFacts) return context.sourceFacts;
        if (context.world && context.actor && context.world.valid(context.actor)) return PokemonDamage.combatants.read(context.world, context.actor);
        const pokemon = pokemonOf(context);
        return pokemon ? PokemonDamage.sourceFacts(pokemon) : undefined;
    }
    function worldFact(context: FactContext, id: string): Formula.Fact {
        if (!context.world || !context.actor) return undefined;
        var body = observed(context);
        if (body === null) return undefined;
        if (id === "sunlight") return WorldEnvironment.sunlight(context.world, body.position());
        var environment: any = WorldEnvironment.read(context.world, body.position()), value = environment[id];
        return Formula.fact(value);
    }
    function statusFact(context: FactContext, id: string): Formula.Fact {
        return observed(context) ? CombatStatus.has(context.world!, context.actor!, id) : undefined;
    }
    function stateFact(context: FactContext, id: string): Formula.Fact {
        if (id === "wet" || id === "burn" || id === "burning") {
            var body = observed(context);
            if (body === null) return undefined;
            return id === "wet" ? body.wet() : statusFact(context, "burn");
        }
        var split = id.indexOf("#"), stored: any = readState(context, split < 0 ? id : id.slice(0, split));
        return Formula.fact(split < 0 ? stored : read(stored, id.slice(split + 1).split(".")));
    }
    function ratioOf(value: number | undefined, maximum: number | undefined): number | undefined {
        return value !== undefined && maximum !== undefined && isFinite(value) && isFinite(maximum) && maximum > 0 ? Math.max(0, Math.min(1, value / maximum)) : undefined;
    }
    /** Actor health uses world units; stat.hp and individual.health retain native HP for native individuals. */
    function actorFact(context: FactContext, id: string): Formula.Fact {
        const body = observed(context), pokemon = body ? null : pokemonOf(context);
        if (id === "health" || id === "maxHealth" || id === "healthRatio") {
            const health = body ? body.health() : pokemon ? pokemon.health() * pokemon.healthScale() : undefined;
            const maximum = body ? body.maxHealth() : pokemon ? pokemon.maxHealth() * pokemon.healthScale() : undefined;
            return id === "health" ? Formula.fact(health) : id === "maxHealth" ? Formula.fact(maximum) : ratioOf(health, maximum);
        }
        if (!body) return undefined;
        switch (id) {
            case "width": return body.width(); case "height": return body.height(); case "movementSpeed": return body.movementSpeed();
            case "wet": return body.wet(); case "grounded": return body.grounded(); case "hurtAgo": return body.hurtAgo();
            default: return undefined;
        }
    }
    function individualFact(context: FactContext, id: string): Formula.Fact {
        const pokemon = pokemonOf(context); if (!pokemon) return undefined;
        if (id.indexOf("aspect.") === 0) return typeof pokemon.aspect === "function" ? pokemon.aspect(id.slice(7)) : undefined;
        const dot = id.indexOf("."), group = id.slice(0, dot);
        const stat = dot < 0 || ["stat", "baseStat", "iv", "effectiveIv", "ev", "evYield"].indexOf(group) < 0 ? undefined : nativeStatisticId(id.slice(dot + 1), pokemon);
        if (stat) switch (group) {
            case "stat": return pokemon.stat(stat); case "iv": return pokemon.iv(stat); case "effectiveIv": return pokemon.effectiveIv(stat);
            case "ev": return pokemon.ev(stat); case "evYield": return pokemon.evYield(stat);
            case "baseStat": return typeof pokemon.baseStat === "function" ? Formula.fact(pokemon.baseStat(stat)) : undefined;
        }
        switch (id) {
            case "friendship": return pokemon.friendship(); case "experience": return pokemon.experience(); case "baseExperience": return pokemon.baseExperience();
            case "level": return pokemon.level(); case "health": return pokemon.health(); case "maxHealth": return pokemon.maxHealth();
            case "healthRatio": return ratioOf(pokemon.health(), pokemon.maxHealth()); case "healthScale": return pokemon.healthScale();
            case "weight": return pokemon.weight(); case "wild": return pokemon.wild(); case "canEvolve": return pokemon.canEvolve();
            case "shiny": return typeof pokemon.shiny === "function" ? pokemon.shiny() : undefined;
            case "scale": return typeof pokemon.scale === "function" ? pokemon.scale() : undefined;
            case "dynamaxLevel": return typeof pokemon.dynamaxLevel === "function" ? pokemon.dynamaxLevel() : undefined;
            case "gigantamaxFactor": return typeof pokemon.gigantamaxFactor === "function" ? pokemon.gigantamaxFactor() : undefined;
            default: return undefined;
        }
    }
    function publicAttributes(context: FactContext): IndividualAttributes.Context | undefined {
        return context.attributes || (context.world && context.actor && pokemonOf(context) ? IndividualAttributes.live(context.world, context.actor) : undefined);
    }
    function selectedMove(context: FactContext): CombatPokemonMove | null {
        if (context.move !== undefined) return context.move;
        if (context.action && NativeLoadout.invocation(context.action)) return NativeLoadout.executing(context.action);
        if (context.skill) return CobblemonCombat.moveTemplate(context.skill.id);
        const pokemon = pokemonOf(context), action = context.action;
        if (!action || !pokemon) return null;
        const argument = action.argument("native-slot"), slot = argument === null ? -1 : Number(argument);
        if (!isFinite(slot) || slot < 0 || slot % 1 || slot >= pokemon.moveSlots()) return null;
        const resource = pokemon.move(slot), key = action.argument("native-move");
        if (!resource || key !== null && String(resource.key()) !== String(key)) return null;
        const id = slotIdentity(context, slot, resource);
        return id === undefined ? null : id === String(resource.id()) ? resource : CobblemonCombat.moveTemplate(id);
    }
    function slotIdentity(context: FactContext, slot: number, value: CombatPokemonMove): string | undefined {
        if (!context.world || !context.actor) return String(value.id());
        if (!context.world.valid(context.actor) || String(context.world.source().ref()) !== String(context.actor.ref())) return undefined;
        return NativeLoadout.selection(context.world, slot, value).id;
    }
    function resourceMove(context: FactContext, ownMove: boolean): CombatPokemonMove | null {
        const design = selectedMove(context), pokemon = pokemonOf(context);
        if (context.resource !== undefined) {
            const supplied = typeof context.resource === "function" ? context.resource() : context.resource;
            return supplied && !templateMove(supplied) && (!ownMove || design && String(supplied.id()) === String(design.id())) ? supplied : null;
        }
        if (!pokemon) return null;
        const action = context.action, detail = context.detail, invocation = action ? NativeLoadout.invocation(action) : null;
        const argument = action ? action.argument("native-slot") : null;
        const slot = invocation ? invocation.slot : action ? argument === null ? -1 : Number(argument) : detail && typeof detail.slot === "number" ? detail.slot : undefined;
        if (slot !== undefined) {
            if (typeof slot !== "number" || !isFinite(slot) || slot < 0 || slot % 1 || slot >= pokemon.moveSlots()) return null;
            const value = pokemon.move(slot);
            if (!value || templateMove(value) || invocation && (String(value.key()) !== invocation.key || String(value.id()) !== invocation.source) ||
                !invocation && action && String(value.key()) !== String(action.argument("native-move"))) return null;
            return !ownMove || design && String(value.id()) === String(design.id()) &&
                (invocation || slotIdentity(context, slot, value) === String(design.id())) ? value : null;
        }
        // Bare individual inspection can identify a resource only when the equipped match is unique.
        let found: CombatPokemonMove | null = null;
        for (let index = 0; design && index < pokemon.moveSlots(); index++) {
            const value = pokemon.move(index);
            if (value && !templateMove(value) && slotIdentity(context, index, value) === String(design.id())) { if (found) return null; found = value; }
        }
        return !ownMove || found && design && String(found.id()) === String(design.id()) ? found : null;
    }
    function templateMove(value: CombatPokemonMove): boolean { return String(value.key()).indexOf("template:") === 0; }
    function moveFact(context: FactContext, id: string, resource: boolean): Formula.Fact {
        if (id === "pp" || id === "maxPp" || id === "ppRatio" || id === "raisedPpStages") {
            const value = resourceMove(context, !resource); if (!value) return undefined;
            if (id === "raisedPpStages") return typeof value.raisedPpStages === "function" ? value.raisedPpStages() : undefined;
            return id === "pp" ? value.pp() : id === "maxPp" ? value.maxPp() : ratioOf(value.pp(), value.maxPp());
        }
        if (resource) return undefined;
        const value = selectedMove(context); if (!value) return undefined;
        if (id.indexOf("flags.") === 0) {
            const info = NativeLoadout.facts(value), name = id.slice(6);
            return Object.prototype.hasOwnProperty.call(info.flags, name) ? info.flags[name] : Object.keys(info.data).length ? false : undefined;
        }
        if (id.indexOf("metadata.") === 0) return Formula.fact(read(NativeLoadout.facts(value).data, id.slice(9).split(".")));
        if (id.indexOf("effectChances.") === 0 && typeof value.effectChances === "function") {
            const index = Number(id.slice(14)), values = JSON.parse(String(value.effectChances()));
            return isFinite(index) && index >= 0 && index % 1 === 0 ? Formula.fact(values[index]) : undefined;
        }
        switch (id) {
            case "power": return value.power(); case "accuracy": return value.accuracy();
            case "basePp": return typeof value.basePp === "function" ? value.basePp() : undefined;
            case "number": return typeof value.number === "function" ? value.number() : undefined;
            case "priority": return value.priority(); case "critRatio": return value.critRatio(); default: return undefined;
        }
    }
    /**
     * 公式的事实入口；按需读取，缺失值保持 undefined（Formula 数值计算将其视作 0；需要区分未知时用 F.known）。
     * Formula.compile/explain 使用 factsOf(source)；通用参数注册表可绑定本函数为 Registry<FactSource>.factsOf。
     * 本招 defineFacts 的 provider 同时服务 source.* 与 target.*；target 作用域携带同一 skill，但不继承源事实、
     * 也不嵌套 target。预览与逐个命中对象用 withTarget(context, target) 得到显式目标上下文。
     * F.pref 读取配置中的数／布尔；具名字符串用 F.choice(path, 值) 做相等判断，choice 字段也可用数值 option.value
     * 搭配文本 label，见 NativeRepertoire.Field。现场不足的说明应保留计算时机。
     */
    export function factsOf(source: FactSource): Formula.Facts {
        const context = factContext(source);
        const provider = context.skill && factProviders[context.skill.id], declared = provider ? provider(context) : undefined;
        const origins: { [id: string]: Formula.Facts | undefined } = Object.create(null);
        function targetContext(): FactContext | null {
            let target: FactContext | null = null;
            if (context.target !== undefined) target = context.target;
            else {
                const actor = context.action && context.action.target();
                if (actor) target = { world: context.world, actor: actor };
            }
            if (!target) return null;
            // Base the scope on the target itself, then carry the skill so its defineFacts provider serves
            // target.* too. `target` is cleared so a switch of actor can never recurse, and the source's own
            // facts/detail are not on the prototype, so they cannot leak.
            const scope: FactContext = Object.create(target);
            if (scope.world === undefined) scope.world = context.world;
            if (scope.skill === undefined) scope.skill = context.skill;
            scope.target = null;
            return scope;
        }
        function builtin(id: string): Formula.Fact {
            if (id.indexOf("target.") === 0) { const target = targetContext(); return target ? factsOf(target).read(id.slice(7)) : undefined; }
            if (id.indexOf("stat.") === 0) {
                const name = id.slice(5), pokemon = pokemonOf(context);
                if (name === "hp" || name === "maxHp" || name === "hpRatio") return pokemon ? individualFact(context, name === "hp" ? "health" : name === "maxHp" ? "maxHealth" : "healthRatio")
                    : actorFact(context, name === "hp" ? "health" : name === "maxHp" ? "maxHealth" : "healthRatio");
                const native = nativeStatisticId(name); if (!native) return undefined;
                const source = context.sourceFacts || availableSource(context), stat = source && source.stats[native];
                if(stat!==undefined) {
                    const staged=source&&source.data.native;
                    return staged?stat*NativeEffects.multiplier(NativeEffects.stage(staged.state,native)):stat;
                }
                if(context.sourceFacts)return undefined;
                return pokemon ? pokemon.stat(native) : undefined;
            }
            if (id === "level") { const source = availableSource(context); return source && source.level; }
            if (id.indexOf("actor.") === 0) return actorFact(context, id.slice(6));
            if (id.indexOf("individual.") === 0) return individualFact(context, id.slice(11));
            if (id.indexOf("attribute.") === 0) {
                const attributes = publicAttributes(context), name = id.slice(10);
                return attributes && IndividualAttributes.has(name) ? Formula.fact(IndividualAttributes.read(attributes, name)) : undefined;
            }
            if (id.indexOf("body.") === 0) {
                var part = id.slice(5);
                return part === "weight" ? individualFact(context, "weight") : part === "height" || part === "width" ? actorFact(context, part) : undefined;
            }
            if (id.indexOf("pref.") === 0) {
                var value = read(context.detail ? context.detail.values : undefined, id.slice(5).split("."));
                return Formula.fact(value);
            }
            if (id.indexOf("world.") === 0) return worldFact(context, id.slice(6));
            if (id.indexOf("state.") === 0) return stateFact(context, id.slice(6));
            if (id.indexOf("status.") === 0) return statusFact(context, id.slice(7));
            if (id.indexOf("move.") === 0) return moveFact(context, id.slice(5), false);
            if (id.indexOf("resource.") === 0) return moveFact(context, id.slice(9), true);
            if (id.indexOf("action.") === 0 && context.action) {
                switch (id.slice(7)) {
                    case "id": return context.action.id(); case "range": return context.action.range();
                    case "hasTarget": return context.action.target() !== null;
                }
            }
            return undefined;
        }
        function readFact(id: string): Formula.Fact {
            origins[id] = undefined;
            if (context.variables && Object.prototype.hasOwnProperty.call(context.variables, id)) return Formula.fact(context.variables[id]);
            const supplied = context.facts && context.facts.read(id);
            if (supplied !== undefined) { origins[id] = context.facts; return Formula.fact(supplied); }
            const authored = declared && declared.read(id);
            if (authored !== undefined) { origins[id] = declared; return Formula.fact(authored); }
            return Formula.fact(builtin(id));
        }
        /** Named string choices read their raw preference text; formula numbers stay numeric. */
        function textFact(id: string): string | undefined {
            const path = id.indexOf("pref.") === 0 ? id.slice(5) : id;
            const value = read(context.detail ? context.detail.values : undefined, path.split("."));
            return typeof value === "string" ? value : undefined;
        }
        /** Preference terms show the move's own field name rather than the internal fact path. */
        function labelFact(id: string): Formula.Text | undefined {
            if (id.indexOf("pref.") !== 0 || !context.skill) return undefined;
            return { key: "worldcombat.skill." + context.skill.id + ".preference." + id.slice(5) };
        }
        return { read: readFact, text: textFact, label: labelFact, expand: function (id): Formula.Explanation | undefined {
            if (!Object.prototype.hasOwnProperty.call(origins, id)) readFact(id);
            if (context.variables && Object.prototype.hasOwnProperty.call(context.variables, id)) return undefined;
            const origin = origins[id];
            if (origin) return origin.expand ? origin.expand(id) : undefined;
            if (id.indexOf("target.") === 0) { const target = targetContext(), facts = target && factsOf(target); return facts && facts.expand ? facts.expand(id.slice(7)) : undefined; }
            if (id.indexOf("attribute.") !== 0) return undefined;
            const attributes = publicAttributes(context), name = id.slice(10);
            if (!attributes || !IndividualAttributes.has(name)) return undefined;
            const result = IndividualAttributes.inspect<any>(attributes, name);
            function term(source: RuleValues.Source): Formula.Explanation {
                return { label: source.label, value: Number(Formula.fact(source.value) || 0), terms: (source.sources || []).map(term) };
            }
            return { value: Number(Formula.fact(result.value) || 0), terms: result.sources.map(term), note: result.unknown.length ? result.unknown : undefined };
        } };
    }
    actionParameters.factsOf = factsOf;
    var damageCategories: {
        [id: string]: string;
    } = Object.create(null);
    export function damageCategory(id: string): string { return damageCategories[id] || String(CobblemonCombat.moveTemplate(id).category()); }
    /**
     * 原生目录参数传上下文时求公式；省略上下文时取登记的设计值。
     * range、prepare、recover、cooldown 是保留键：招式定义后分别读 Skill.range 或时序／成长值。
     * 最终施放时序／射程由 Skill.resolve 返回；需要参数公式驱动它们时，声明作用参数并把求值交给 resolve。
     */
    export function p(id: string, key: string, source?: ParameterSource): number {
        id = String(id);
        const context = source ? parameterContext(id, source) : undefined;
        if (key === "range" && skills[id]) return skills[id].range;
        if (["prepare", "recover", "cooldown"].indexOf(key) >= 0 && skills[id])
            return context ? timingValues.evaluate<number>(id + "/" + key, context).value : (<any>skills[id])[key];
        return actionParameters.value(id, key, context);
    }
    export interface Paragraph { key: string; values: string[]; when?: (context: NumberContext) => boolean; }
    var descriptions: { [id: string]: Paragraph[] } = Object.create(null);
    var derived: { [id: string]: { [key: string]: (context: NumberContext) => any } } = Object.create(null);
    export function describe(id: string, paragraphs: Paragraph[], bindings: { [key: string]: (context: NumberContext) => any } = {}): void {
        descriptions[id] = paragraphs; derived[id] = bindings;
    }
    export function text(key: string, args?: any[]): RuleValues.Text { return args ? { key, args } : { key }; }
    export function valueBinding(value: any, label: any, contributions: any[] = [], description?: any, formula?: any): any {
        const binding: any = { value, label, contributions, description };
        if (formula !== undefined) binding.formula = formula;
        return binding;
    }
    export function resultBinding(result: RuleValues.Result<number>, label: any, scale = 1, description?: any): any {
        if (result.explanation) {
            const source = result.explanation;
            const explanation: Formula.Explanation = scale === 1 ? source : { value: result.value * scale,
                formula: ["("].concat(<any>source.formula || [source.label || String(result.value)], [")", "×", String(scale)]),
                terms: source.terms, note: source.note, unavailable: source.unavailable };
            return explanationBinding(explanation, undefined, label, description);
        }
        function source(value: RuleValues.Source): any {
            return valueBinding(typeof value.value === "number" ? rounded(value.value) : value.value, value.label, (value.sources || []).map(source));
        }
        const notes = (description ? [description] : []).concat(result.unknown);
        return valueBinding(rounded(result.value * scale), label, result.sources.map(source), notes.length ? { paragraphs: notes } : undefined);
    }
    function prettyParameter(entry: ActionParameters.Entry<NumberContext> | undefined, value: number): string {
        return rounded(entry && entry.presentation === "seconds" ? value / 20 : entry && entry.presentation === "percent" ? value * 100 : entry && entry.presentation === "amplifier" ? value + 1 : value);
    }
    function parameterUnit(binding:any,entry:ActionParameters.Entry<NumberContext>|undefined,key=""):any {
        const kind=entry?.presentation || (["prepare","recover","cooldown"].indexOf(key)>=0?"seconds":"");
        if(kind==="seconds"||kind==="percent") { binding.unitKind=kind;binding.unit=text("worldcombat.value.unit."+kind); }
        return binding;
    }
    /** Final duration shares the commit policy; a recalled individual supplies its native attributes explicitly. */
    export function cooldownEvaluation(context: NumberContext, base?: number): ActionCooldowns.Context {
        if (base === undefined) {
            if (context.detail && typeof context.detail.authoredCooldown === "number") base = context.detail.authoredCooldown;
            else {
                const skill = context.skill, values = context.detail && context.detail.values || skill.defaults;
                const runtime = skill.resolve ? skill.resolve(context.pokemon, values, context.world || null, context.actor || null, context.attributes) : skill;
                base = runtime.cooldown || 0;
            }
        }
        const pokemon = context.pokemon;
        return ActionCooldowns.evaluate(context.world || null, context.actor || null, "world_combat:" + context.skill.id, base === undefined ? 0 : base,
            id => pokemon && typeof pokemon.attribute === "function" ? pokemon.attribute(id) : null);
    }
    function cooldownBinding(context: NumberContext): any {
        const id = context.skill.id, key = context.skill.cooldownParameter, label = text("worldcombat.value.cooldown");
        const evaluated = cooldownEvaluation(context);
        let base: any;
        if (key && key !== "cooldown") base = parameterBinding(context, key);
        else base = resultBinding(timingValues.evaluate<number>(id + "/cooldown", context), label, 1 / 20);
        const shown = Number(base.value), actual = evaluated.base / 20;
        if (isFinite(shown) && Math.abs(shown - actual) > .0001) {
            base = valueBinding(rounded(actual), label, [base,
                valueBinding(rounded(actual - shown), text("worldcombat.value.configuration"))]);
        }
        const terms = [base].concat(evaluated.contributions.map(term => valueBinding(rounded(term.value), term.label)));
        const binding = valueBinding(rounded(evaluated.ticks / 20), label, terms);
        return parameterUnit(binding, undefined, "cooldown");
    }
    export function parameterBinding(context: NumberContext, key: string): any {
        if (key === "cooldown") return cooldownBinding(context);
        const id = context.skill.id, entry = actionParameters.entries(id)[key];
        const label = text(entry ? "worldcombat.skill." + id + ".value." + key : "worldcombat.value." + key);
        if (entry && entry.formula) return explanationBinding(actionParameters.evaluate(id, key, context).explanation!, entry, label);
        const result = entry ? actionParameters.evaluate(id, key, context) : key === "range" ? null : timingValues.evaluate<number>(id + "/" + key, context);
        let raw = result ? result.value : p(id, key, context);
        const base = entry ? entry.value : (<any>context.skill)[key];
        const show = (n: number) => entry ? prettyParameter(entry, n) : rounded(["prepare", "recover", "cooldown"].indexOf(key) >= 0 ? n / 20 : n);
        const terms: any[] = [valueBinding(show(base), text("worldcombat.value.base"))];
        function sourceBinding(source: RuleValues.Source): any {
            return valueBinding(source.operation && typeof source.value === "number" ? show(source.value) : source.value,
                source.label, (source.sources || []).map(sourceBinding));
        }
        if (result) result.sources.filter(source => source.id !== "source.level").forEach(source => terms.push(sourceBinding(source)));
        // A skill's own `resolve` (configuration trade-offs) is the value the cast really uses; show it as the last term.
        const resolve: any = context.skill.resolve;
        if (!entry && ["prepare", "recover", "cooldown", "range"].indexOf(key) >= 0 && resolve && !resolve.shared) {
            const runtime = resolve(context.pokemon, context.detail && context.detail.values || context.skill.defaults, context.world || null, context.actor || null, context.attributes);
            const value = runtime ? runtime[key] : undefined;
            if (typeof value === "number" && isFinite(value) && value !== raw) { terms.push(valueBinding(show(value - raw), text("worldcombat.value.configuration"))); raw = value; }
        }
        return parameterUnit(valueBinding(show(raw), label, terms, result && result.unknown.length ? { paragraphs: result.unknown } : undefined),entry,key);
    }
    /** Converts one explained formula into the binding contract the client renders; terms recurse. */
    export function explanationBinding(explanation: Formula.Explanation, entry: ActionParameters.Entry<NumberContext> | undefined, label: any, description?: any): any {
        function notesOf(item: Formula.Explanation, first?: any): any {
            const notes: any[] = first === undefined ? [] : [first];
            if (item.note) (Array.isArray(item.note) ? item.note : [item.note]).forEach(note => notes.push(note));
            return notes.length === 0 ? undefined : notes.length === 1 ? notes[0] : notes;
        }
        function term(item: Formula.Explanation): any {
            const value = valueBinding(rounded(item.value), item.label, item.terms.map(term), notesOf(item), item.formula);
            if (item.unavailable && item.unavailable.length) value.unavailable = item.unavailable.slice();
            return value;
        }
        const value = valueBinding(prettyParameter(entry, explanation.value), label, explanation.terms.map(term), notesOf(explanation, description), explanation.formula);
        if (explanation.unavailable && explanation.unavailable.length) value.unavailable = explanation.unavailable.slice();
        return parameterUnit(value,entry);
    }
    /** The number a damage segment shows is the caster-side theoretical damage; its power parameter opens inside it. */
    function damageBinding(context: NumberContext, key: string): any {
        const id = context.skill.id, move = CobblemonCombat.moveTemplate(id), features = damageFeatures(id, key, context);
        const entry = actionParameters.entries(id)[key];
        const parameter = entry ? actionParameters.evaluate(id, key, context) : null;
        const label = text("worldcombat.skill." + id + ".value." + key);
        const power: PokemonDamage.PowerInput = { value: parameter ? parameter.value : p(id, key, context), explanation: parameter ? RuleValues.explanation(parameter, label) : undefined };
        const result = PokemonDamage.explain(context.world || null, context.actor || null, sourceSnapshot(context), move, features, power, context.action || undefined);
        const value = explanationBinding(result.explanation, undefined, text("worldcombat.value.estimatedDamage"),
            text(context.world && context.actor ? "worldcombat.value.damageTargetPending" : "worldcombat.value.damageWorldPending"));
        value.available = result.available; value.category = result.category; value.type = result.type; value.deferred = result.deferred;
        return value;
    }
    export function describeSkill(context: NumberContext): any {
        const id = context.skill.id, paragraphs = descriptions[id];
        if (!paragraphs) throw new Error("Missing authored description: " + id);
        const bindings: any = {}, used = paragraphs.filter(paragraph => !paragraph.when || paragraph.when(context));
        function bind(key: string): any {
            if (derived[id] && derived[id][key]) return derived[id][key](context);
            if (key === context.skill.cooldownParameter)
                return cooldownBinding(context);
            if (key === "pp") return valueBinding(context.detail.ppCost, text("worldcombat.value.pp"));
            if (key === "level") return valueBinding(context.pokemon.level(), text("worldcombat.value.level"));
            if (key.indexOf("pref.") === 0) {
                const path = key.slice(5).split("."), field = context.skill.fields.filter(field => field.path.join(".") === path.join("."))[0];
                const raw = read(context.detail.values, path);
                return valueBinding(typeof raw === "number" ? rounded(raw * (field && field.display && field.display.scale || 1)) : raw,
                    text("worldcombat.skill." + id + ".preference." + path.join(".")), [], field && field.help);
            }
            if (key.indexOf("tier.") === 0) {
                const parts = key.split("."), stage = growthStages[id][Number(parts[1])], name = parts.slice(2).join(".");
                return parameterUnit(valueBinding(name === "level" ? stage.level : ["prepare", "recover", "cooldown"].indexOf(name) >= 0 ? rounded(stage.values[name] / 20) : prettyParameter(actionParameters.entries(id)[name], stage.values[name]), text("worldcombat.value.growth")),actionParameters.entries(id)[name],name);
            }
            if (damageSpec(id, key)) return damageBinding(context, key);
            return parameterBinding(context, key);
        }
        used.forEach(paragraph => paragraph.values.forEach(key => { if (!bindings[key]) bindings[key] = bind(key); }));
        const document = used.map(paragraph => ({ key: "worldcombat.skill." + id + "." + paragraph.key, args: paragraph.values.map(key => ({ binding: key })) }));
        // The overview and authored details form one document in every full-detail entry point.
        if (!used.some(paragraph => paragraph.key === "summary"))
            document.unshift({ key: "worldcombat.skill." + id + ".summary", args: [] });
        return { paragraphs: document, bindings };
    }
    export function n(value: number, label: string, unit = "", description = ""): ActionParameters.Entry<NumberContext> { return { value, label, unit, description }; }
    /**
     * A parameter defined by its formula. Casting runs the compiled tree; the hover explains the same tree, so
     * what the player reads is what ran. `base` is the design value used where no combatant is at hand
     * (defaults to the tree with every fact unknown). Presentation helpers wrap it: `seconds(node, ...)` etc.
     */
    export interface FormulaOptions { base?: number; unit?: string; description?: string; presentation?: string; format?: (value: number) => string; visible?: boolean; }
    var noFacts: Formula.Facts = { read: () => undefined };
    export function formula(node: Formula.Node, label: string, options: FormulaOptions = {}): ActionParameters.Entry<NumberContext> {
        const entry: ActionParameters.Entry<NumberContext> = { value: options.base === undefined ? Formula.compile(node)(noFacts) : options.base, label, formula: node };
        if (options.unit !== undefined) entry.unit = options.unit;
        if (options.description !== undefined) entry.description = options.description;
        if (options.presentation !== undefined) entry.presentation = options.presentation;
        if (options.format) { const format = options.format; entry.format = v => format(v); }
        if (options.visible !== undefined) entry.visible = options.visible;
        return entry;
    }
    /** An explicit design base makes growth shifts independent of missing preview facts and default preference branches. */
    export function seconds(node: Formula.Node, label: string, description = "", options: { base?: number } = {}): ActionParameters.Entry<NumberContext> {
        return formula(node, label, { base: options.base, description, presentation: "seconds", format: v => String(v / 20) + " 秒" });
    }
    export function percent(node: Formula.Node, label: string, description = ""): ActionParameters.Entry<NumberContext> {
        return formula(node, label, { description, presentation: "percent", format: v => String(Math.round(v * 10000) / 100) + "%" });
    }
    export function ticks(value: number, label: string, description = ""): ActionParameters.Entry<NumberContext> { return { value, label, description, presentation: "seconds", format: v => String(v / 20) + " 秒" }; }
    export function ratio(value: number, label: string, description = ""): ActionParameters.Entry<NumberContext> { return { value, label, description, presentation: "percent", format: v => String(Math.round(v * 10000) / 100) + "%" }; }
    export function hidden(value: number): ActionParameters.Entry<NumberContext> { return { value, label: "", visible: false }; }
    export function power(value: number, label = "威力"): ActionParameters.Entry<NumberContext> { return n(value, label, "", "参与本段特性威力修正；基础伤害及成长系数见此数值的悬浮说明。"); }
    export function amplifier(value: number, label: string, description: string): ActionParameters.Entry<NumberContext> { return { value, label, description, presentation: "amplifier", format: v => String(v + 1) + " 级" }; }
    export function rounded(value: number): string { return String(Math.round(value * 1000) / 1000); }
    export function duration(value: number): string { return rounded(value / 20) + " 秒"; }
    export function fraction(value: number): string { return rounded(value * 100) + "%"; }
    export function read(value: any, path: string[]): any { path.forEach(key => { value = value == null ? undefined : value[key]; }); return value; }
    export function defineCategory(id: string, category: string): void { damageCategories[id] = category; }
}
