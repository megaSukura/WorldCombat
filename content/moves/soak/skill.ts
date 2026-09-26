/**
 * 浸水 / soak — 出手方式。
 *
 * 核心念头：把对象整个浇透——一道水柱从施法者手里沿视线冲到它身上，把属性冲掉、换成水。
 *   敌友都可以指：浇敌人是摘掉它的本系、打开雷与草的弱点；浇友方是给它一身水抗性（代价是怕雷怕草）。
 *   空点只把水泼在地上，没有属性目标。
 *
 * 幕：
 *   聚（windup，提交前）：手里聚起水，只观察与预告，可被打断且不花代价。
 *   浇（pour，提交后）：水沿视线冲到对象身上；命中的目标被写进共享 NativeModifiers types 层（单一水属性，
 *     到期自动还原原生属性），挂共享身份 `world_combat:status/soak` 的标记，并由一个独立的托管效果
 *     持有持续的水膜表现；漫流档只波及与主目标同敌我类别、显式配置才生效。
 *   落（splash）：水花只在真正被改类型的目标身上炸开——没浇进去的不冒泡。
 *   干（dry）：水属性身份到期时，从目标身上滴下水珠、水膜一起散去，告诉玩家这一浇已经过去。
 *
 * 反制：已经是纯水的目标浇不进去（预检直接拒绝，不浪费 20 发 PP）；非宝可梦没有属性可换，明确失败不冒充成功。
 *   瞄准是热键选择的：kind:aim 只放开选择，不改写属性层，伤害与权限仍由各自结算层控制。
 */

namespace PokemonSkills {
    export const soakId = "soak";
    export const soakScene = "world_combat:move_soak";
    export const soakEffect = "world_combat:soaked_through";
    export const soakFilmEffect = "world_combat:soak_film";
    export const soakDrenchText = "world_combat.move.soak.text.drench";
    export const soakDryText = "world_combat.move.soak.text.dry";
    export const soakFizzleText = "world_combat.move.soak.text.fizzle";
    export const soakEmptyText = "world_combat.move.soak.text.empty";

    function soakAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.25, 0)); }

    /** 顶点数组形式，给表现的 path 使用。 */
    function soakVertex(point: CombatPoint): number[] { return [point.x(), point.y(), point.z()]; }

    /** 目标当前生效的属性（含临时层）；非宝可梦返回空。 */
    function soakTypes(world: CombatWorld, target: CombatActor): string[] {
        if (String(target.domain()) !== "cobblemon" || !world.valid(target)) return [];
        return NativeEffects.types(CobblemonCombat.pokemon(target), NativeEffects.read(world, target));
    }

    /** 能不能浇：非宝可梦没有属性；已经是纯水也浇不进去。返回拒绝原因或空串。 */
    function soakRefusal(world: CombatWorld, target: CombatActor): string {
        const types = soakTypes(world, target);
        if (types.length === 0) return "no-types";
        if (NativeModifiers.typeLocked(world, target)) return "type-locked";
        return types.join(",") === "water" ? "already-water" : "";
    }

    // 水膜：一个与属性层同寿命的独立托管效果，自己持有贴身的湿身表现；
    // 属性层提前被驱散时由下面的移除事件一并收掉，不留一层干在皮肤上的水。
    WorldCombat.effect(soakFilmEffect, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (typeof value.target !== "string") throw new Error("Invalid soak film: target");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(soakFilmEffect, "start", function (effect) {
        const world = effect.world(), target = effect.target(), data = JSON.parse(effect.state());
        if (!world.valid(target)) { effect.end(); return; }
        const body = world.observe(target);
        if (body === null) { effect.end(); return; }
        WorldFeedback.onEffect(world, effect.id(), "film", soakScene, 1, body.position(),
            { moment: "film", target: String(target.ref()), drops: Math.max(6, Math.round(Number(data.drops) || 8)) });
    });
    WorldCombat.effectHandler(soakFilmEffect, "operation:world_combat:dispel", function (effect) { effect.end(); });

    function soakReleaseFilm(world: CombatWorld, target: CombatActor): void {
        const views = world.effects(target, soakFilmEffect);
        for (let index = 0; index < views.length; index++) world.operation(views[index].id(), "world_combat:dispel", "{}");
    }

    // 水属性身份到期：从目标身上滴下水珠、水膜散去。属性层随效果同寿命自动还原。
    WorldCombat.on("world_combat:move_soak/end", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== soakEffect) return;
        const world = event.world(), target = event.actor();
        soakReleaseFilm(world, target);
        if (String(data.cause) !== "expired") return;
        if (!world.valid(target)) return;
        const body = world.observe(target);
        if (body === null) return;
        WorldFeedback.emit(world, soakScene, 1, body.position(), { moment: "dry", target: String(target.ref()) }, 22);
        WorldFeedback.text(world, soakAbove(body.position()), soakDryText, [], 26);
    });

    define({
        id: soakId,
        cooldownParameter: "recharge",
        name: "浸水",
        description: "把大量水浇在选中的对象上，把它的属性整个冲成水属性；可浇敌人也可浇友方，漫流档只波及同一阵营的一圈人。",
        uses: ["把对手的属性和本系一起冲成水", "打开雷与草的弱点、封掉火与地的本系", "给友方披一身水抗性，或漫流一次浇透同一阵营的一圈人"],
        kind: "aim",
        range: 6,
        maxRange: 12,
        prepare: 9,
        active: 1,
        recover: 7,
        cooldown: 88,
        style: "drench",
        defaults: { flood: false },
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[soakId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(soakId, "tempo", context)),
                recover: Math.round(p(soakId, "aftercast", context)),
                cooldown: Math.round(p(soakId, "recharge", context)),
                active: 1,
                range: p(soakId, "reach", context)
            };
        },
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[soakId], detail: { values: config } };
            return { radius: p(soakId, "reach", context), geometry: "line", style: "drench", color: 0x4FA8E8,
                label: config && config.flood === true ? "浸水 · 漫流" : "浸水" };
        },
        ready: function (action, config) {
            const world = action.sense(), target = action.target();
            // 空点：只泼水，没有属性目标，直接允许。
            if (target === null) return action.targetPosition().minus(action.origin()).length() > action.range() ? "out-of-range" : "";
            if (!world.valid(target)) return "target-left";
            const body = world.observe(target);
            if (body === null) return "target-left";
            if (body.position().minus(action.origin()).length() > p(soakId, "reach", action)) return "out-of-range";
            if (!world.clear(action.origin(), body.position())) return "no-line";
            return soakRefusal(world, target);
        },
        windup: function (action, config, prepare) {
            const target = action.target();
            action.present("world_combat:move_soak:gather", soakScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", streaks: p(soakId, "streaks", action),
                    flood: config && config.flood === true ? 1 : 0,
                    target: target === null ? "" : String(target.ref()) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor(), target = action.target();
            const scenes = WorldFeedback.actionScenes(soakScene);
            const flood = !!(config && config.flood);
            const hold = Math.max(40, Math.round(p(soakId, "hold", action)));
            const splash = Math.max(1.2, p(soakId, "splash", action));
            const streaks = Math.max(8, Math.round(p(soakId, "streaks", action)));
            const ripples = Math.max(4, Math.round(p(soakId, "ripples", action)));
            const scale = Math.max(0.6, Math.min(2.4, splash / 1.6));
            const at = target === null ? null : world.observe(target);
            const point = at === null ? action.targetPosition() : at.position();
            const targetRef = target === null || at === null ? "" : String(target.ref());
            let hits = 0;

            function drench(other: CombatActor): void {
                if (!world.valid(other)) return;
                if (soakRefusal(world, other)) return;
                NativeModifiers.apply(world, other, { types: ["water"] }, hold);
                MobEffects.apply(world, other, soakEffect, hold, flood ? 1 : 0);
                soakReleaseFilm(world, other);
                world.effect(soakFilmEffect, other, JSON.stringify({ target: String(other.ref()) }), hold);
                hits++;
                const body = world.observe(other);
                if (body === null) return;
                scenes.show(action, "coat:" + String(other.ref()), body.position(),
                    { moment: "splash", target: String(other.ref()), splash: splash, ripples: ripples,
                        streaks: streaks, scale: scale });
                WorldFeedback.text(world, soakAbove(body.position()), soakDrenchText, [], 30);
            }

            // 空点：只泼水，没有属性目标。
            if (target === null || at === null) {
                scenes.show(action, "pour", point, { moment: "pour", target: "",
                    path: [String(actor.ref()), soakVertex(point)], streaks: streaks, ripples: ripples, splash: splash, scale: scale });
                scenes.show(action, "empty", point, { moment: "empty", ripples: ripples, splash: splash, scale: scale });
                WorldFeedback.text(world, soakAbove(point), soakEmptyText, [], 26);
                sound(action, "cobblemon:move.watergun.actor");
                world.sound("minecraft:entity.generic.splash", point, 14, "{}");
                scenes.finish(action, done);
                return;
            }

            const refusal = soakRefusal(world, target);
            if (refusal) {
                scenes.show(action, "fizzle", point, { moment: "fizzle", target: targetRef });
                WorldFeedback.text(world, soakAbove(point), soakFizzleText, [], 26);
                sound(action, "cobblemon:move.watergun.actor");
                scenes.finish(action, done);
                return;
            }

            drench(target);
            // 漫流只波及与主目标同一敌我类别的人：浇敌人不顺带浇伙伴，浇友军不顺带浇敌人。
            if (flood) {
                const sameSide = world.friendly(target);
                WorldGeometry.select(world, WorldGeometry.ring(point, 0, splash, { below: 2, above: 3 }),
                    function (other, facts) {
                        if (String(other.ref()) === targetRef) return;
                        if (facts.friendly() !== sameSide) return;
                        drench(other);
                    });
            }

            scenes.show(action, "pour", point, { moment: "pour", target: targetRef,
                path: [String(actor.ref()), targetRef], streaks: streaks, ripples: ripples, splash: splash, hits: hits, scale: scale });
            sound(action, "cobblemon:move.watergun.actor");
            world.sound("minecraft:entity.generic.splash", point, 14, "{}");
            scenes.finish(action, done);
        }
    });
}
