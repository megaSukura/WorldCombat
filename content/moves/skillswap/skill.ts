/** Temporarily exchange Abilities, or exchange attack, movement and defensive attributes with a non-Pokémon. */
namespace PokemonSkills {
    const skillswapScene = "world_combat:move_skillswap";
    const skillswapShift = "world_combat:skillswap_shift";
    const skillswapMark = "world_combat:skillswap_mark";
    const skillswapGainText = "world_combat.move.skillswap.text.gain";
    const skillswapSameText = "world_combat.move.skillswap.text.same";
    const skillswapAbilityPattern = /^[a-z0-9]{1,64}$/;

    /** 一个战斗者当前生效的特性（含临时层与压制）；非宝可梦返回 ""。 */
    export function skillswapAbility(world: CombatWorld, actor: CombatActor): string {
        if (String(actor.domain()) !== "cobblemon" || !world.valid(actor)) return "";
        return NativeEffects.ability(CobblemonCombat.pokemon(actor), NativeEffects.read(world, actor));
    }
    /** 目标特性是否允许被交换（原生 failskillswap 标记）。 */
    function skillswapSwappable(ability: string): boolean {
        return !!ability && skillswapAbilityPattern.test(ability) && !NativeAbilities.flag(ability, "failskillswap");
    }

    interface SkillSwapPair {
        token: string; layer: number; paired: number; pair: string; got: string; glyphs: number;
        carrier: MobEffects.Anchor; partnerCarrier: MobEffects.Anchor;
    }
    WorldCombat.effect(skillswapMark, 2, 12600, "actor", json => {
        const value: SkillSwapPair = JSON.parse(json);
        if (!value.token || !value.pair || !(value.layer > 0) || !(value.paired > 0)
            || !MobEffects.validAnchor(value.carrier) || !MobEffects.validAnchor(value.partnerCarrier)) throw new Error("Invalid skill swap pair");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(skillswapMark, "start", effect => {
        const world = effect.world(), state: SkillSwapPair = JSON.parse(effect.state()), body = world.observe(effect.target());
        MobEffects.bind(world, effect.target(), state.carrier.id);
        if (body) world.present("world_combat:skillswap/hum", skillswapScene, 1, body.position(), JSON.stringify({
            moment: "hum", target: String(effect.target().ref()), glyphs: Math.max(4, state.glyphs / 2), remaining: effect.remaining()
        }));
        effect.schedule("pair", "pair", 1, "{}");
    });
    WorldCombat.effectHandler(skillswapMark, "pair", effect => {
        const world = effect.world(), state: SkillSwapPair = JSON.parse(effect.state()), other = world.actor(state.pair);
        if (!other || !world.valid(other) || !MobEffects.matches(world, effect.target(), state.carrier)
            || !MobEffects.matches(world, other, state.partnerCarrier)) { effect.end(); return; }
        effect.schedule("pair", "pair", 1, "{}");
    });
    WorldCombat.effectHandler(skillswapMark, "operation:world_combat:dispel", effect => effect.end());
    WorldCombat.effectHandler(skillswapMark, "end", effect => {
        const world = effect.world(), state: SkillSwapPair = JSON.parse(effect.state());
        world.operation(state.layer, "world_combat:dispel", "{}");
        const other = world.actor(state.pair);
        if (other && world.valid(other)) world.effects(other, skillswapMark).forEach(view => {
            const pair: SkillSwapPair = JSON.parse(view.data());
            if (pair.token === state.token && pair.layer === state.paired && pair.paired === state.layer)
                world.operation(view.id(), "world_combat:dispel", "{}");
        });
    });
    function skillswapOccupied(world: CombatWorld, actor: CombatActor): boolean {
        return world.effects(actor, skillswapMark).length > 0 || MobEffects.read(world, actor, skillswapShift) !== null;
    }
    function skillswapCurrent(action: CombatAction): boolean {
        const world = action.sense(), actor = action.actor(), target = action.target();
        if (!target || !world.valid(target) || String(actor.ref()) === String(target.ref())
            || skillswapOccupied(world, actor) || skillswapOccupied(world, target)) return false;
        const body = world.observe(target);
        return !!body && world.closestPoint(target, action.origin()).minus(action.origin()).length() <= p("skillswap", "reach", action)
            && world.clear(action.origin(), body.position());
    }
    /** Only this attempt's native keys and managed layer ids are removed if either side refuses. */
    function skillswapApply(action: CombatAction, window: number, glyphs: number): string[] | null {
        if (!skillswapCurrent(action)) return null;
        const world = action.world(), actor = action.actor(), target = action.target()!;
        const native = String(target.domain()) === "cobblemon", mine = skillswapAbility(world, actor), theirs = skillswapAbility(world, target);
        if (native && (!skillswapSwappable(mine) || !skillswapSwappable(theirs) || mine === theirs)) return null;
        const ownValues = CombatCopies.read(world, actor), otherValues = CombatCopies.read(world, target);
        const common = Object.keys(ownValues).filter(id => otherValues[id] !== undefined);
        if (!native && !common.some(id => Math.abs(ownValues[id] - otherValues[id]) > .0001)) return null;
        const a: CombatCopies.Values = {}, b: CombatCopies.Values = {};
        common.forEach(id => { a[id] = ownValues[id]; b[id] = otherValues[id]; });
        let ownCarrier: CombatMobEffect | null = null, otherCarrier: CombatMobEffect | null = null;
        const layers: number[] = [], marks: number[] = [];
        const token = String(action.id());
        let completed = false;
        try {
            ownCarrier = MobEffects.apply(world, actor, skillswapShift, window, 0);
            if (!ownCarrier) return null;
            otherCarrier = MobEffects.apply(world, target, skillswapShift, window, 0);
            if (!otherCarrier) return null;
            const anchorA = MobEffects.anchor(ownCarrier), anchorB = MobEffects.anchor(otherCarrier);
            layers.push(native ? NativeModifiers.apply(world, actor, { ability: theirs, carrier: anchorA }, window)
                : CombatCopies.apply(world, actor, b, window, "skillswap/" + token, anchorA));
            layers.push(native ? NativeModifiers.apply(world, target, { ability: mine, carrier: anchorB }, window)
                : CombatCopies.apply(world, target, a, window, "skillswap/" + token, anchorB));
            const definition = native ? "cobblemon_world_combat:modifier" : "world_combat:attribute_copy";
            if (!layers[0] || !layers[1] || !world.effects(actor, definition).some(view => view.id() === layers[0])
                || !world.effects(target, definition).some(view => view.id() === layers[1])
                || !MobEffects.matches(world, actor, anchorA) || !MobEffects.matches(world, target, anchorB)) return null;
            marks.push(world.effect(skillswapMark, actor, JSON.stringify({ token, layer: layers[0], paired: layers[1], pair: String(target.ref()),
                got: native ? theirs : "native", glyphs, carrier: anchorA, partnerCarrier: anchorB }), window));
            marks.push(world.effect(skillswapMark, target, JSON.stringify({ token, layer: layers[1], paired: layers[0], pair: String(actor.ref()),
                got: native ? mine : "native", glyphs, carrier: anchorB, partnerCarrier: anchorA }), window));
            completed = marks.every(id => id > 0) && world.effects(actor, skillswapMark).some(view => view.id() === marks[0])
                && world.effects(target, skillswapMark).some(view => view.id() === marks[1]);
            return completed ? [native ? theirs : "native", native ? mine : "native"] : null;
        } finally {
            if (!completed) {
                marks.concat(layers).forEach(id => { if (id > 0) world.operation(id, "world_combat:dispel", "{}"); });
                if (ownCarrier) world.removeMobEffect(actor, skillswapShift, ownCarrier.key());
                if (otherCarrier) world.removeMobEffect(target, skillswapShift, otherCarrier.key());
            }
        }
    }

    define({
        id: "skillswap",
        cooldownParameter: "recharge",
        name: "特性互换",
        description: "暂时双向交换特性；与普通生物交手时交换双方的攻击、移动和防护属性。",
        uses: ["把对手的强力特性取过来自己用", "把自己的负面特性甩给对手", "打乱对手依赖特性建立的打法"],
        kind: "aim",
        range: 6,
        maxRange: 12,
        prepare: 8,
        active: 1,
        recover: 7,
        cooldown: 90,
        style: "trade",
        defaults: { hold: false, ai: { maxChase: 14, requireActive: false, leaveStation: false } },
        fields: [],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills["skillswap"], detail: { values: config } };
            return { radius: p("skillswap", "reach", context), geometry: "line", style: "trade", color: 0xC24AE8,
                label: config && config.hold === true ? "特性互换 · 久换" : "特性互换" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["skillswap"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("skillswap", "tempo", context)),
                recover: Math.round(p("skillswap", "aftercast", context)),
                cooldown: Math.round(p("skillswap", "recharge", context)),
                active: 1,
                range: p("skillswap", "reach", context)
            };
        },
        ready: function (action, config) {
            const world = action.sense(), actor = action.actor(), target = action.target();
            if (target === null || !world.valid(target) || String(target.key()) === String(actor.key())) return "invalid-target";
            if (String(actor.domain()) !== "cobblemon") return "no-ability";
            if (skillswapOccupied(world, actor) || skillswapOccupied(world, target)) return "already-swapped";
            const body = world.observe(target);
            if (body === null) return "invalid-target";
            if (body.position().minus(action.origin()).length() > p("skillswap", "reach", action)) return "out-of-range";
            if (!world.clear(action.origin(), body.position())) return "no-line";
            if (String(target.domain()) !== "cobblemon") return CombatCopies.differs(world, actor, CombatCopies.read(world, target)) ? "" : "already-same";
            const mine = skillswapAbility(world, actor), theirs = skillswapAbility(world, target);
            if (!mine) return "self-suppressed";
            if (!theirs) return "target-suppressed";
            if (!skillswapSwappable(theirs)) return "uncopyable";
            if (!skillswapSwappable(mine)) return "self-locked";
            if (mine === theirs) return "already-same";
            return "";
        },
        windup: function (action, config, prepare) {
            const actor = action.actor(), target = action.target();
            const path = target === null ? [String(actor.ref())] : [String(actor.ref()), String(target.ref())];
            action.present("world_combat:skillswap:trace", skillswapScene, 1, action.origin(), JSON.stringify({
                moment: "trace", target: target === null ? "" : String(target.ref()), path: path,
                glyphs: p("skillswap", "glyphs", action)
            }));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            const world = action.world(), actor = action.actor(), target = action.target(), body = world.observe(actor);
            if (!target || !body) { done(action); return; }
            const glyphs = Math.max(6, Math.round(p("skillswap", "glyphs", action)));
            const result = skillswapApply(action, Math.max(60, Math.round(p("skillswap", "window", action))), glyphs);
            if (!result) {
                WorldFeedback.emit(world, skillswapScene, 1, body.position(), { moment: "fizzle", target: String(actor.ref()) }, 22);
                WorldFeedback.text(world, body.position(), skillswapSameText, [], 26); done(action); return;
            }
            WorldFeedback.emit(world, skillswapScene, 1, body.position(), { moment: "trade", target: String(target.ref()),
                path: [String(actor.ref()), String(target.ref())], glyphs, intensity: 1 }, 36);
            const targetBody = world.observe(target);
            [body, targetBody].forEach((at, index) => {
                if (!at) return;
                const ability = result[index];
                WorldFeedback.text(world, at.position().plus(WorldCombat.point(0, 1.3, 0)), skillswapGainText,
                    [{ key: ability === "native" ? "world_combat.move.skillswap.text.attributes" : "cobblemon.ability." + ability }], 36);
            });
            sound(action, "minecraft:entity.illusioner.cast_spell"); done(action);
        }
    });

}
