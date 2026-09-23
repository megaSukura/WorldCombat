/** haze：行为、参数与目标条件以本单元实现为准。 */
namespace PokemonSkills {
    function hazeAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.2, 0)); }

    /** 把 actor 的能力等级全部清零（含自己拥有的临时窗口）；返回真正抹掉的等级数（绝对值之和）。 */
    export function hazeErase(world: CombatWorld, actor: CombatActor): number {
        if (!world.valid(actor)) return 0;
        return NativeEffects.resetStages(world, actor, true, "haze", "haze")
            + MobEffects.clear(world, actor, "beneficial");
    }

    /** 只统计正面等级的合计，供 AI 判断「这口雾值不值得放」。 */
    export function hazePositive(world: CombatWorld, actor: CombatActor): number {
        if (!world.valid(actor)) return 0;
        const stages = hazeStages(world, actor);
        let total = 0;
        for (let index = 0; index < hazeStats.length; index++) {
            const value = Number(stages[hazeStats[index]]) || 0;
            if (value > 0) total += value;
        }
        return total + MobEffects.levels(world, actor, "beneficial");
    }

    define({
        id: hazeId,
        cooldownParameter: "recharge",
        name: "黑雾",
        description: "释放黑雾，将范围内的正负能力等级归零，并清除药水、信标等增益。尽抹式也影响自己和队友，定向式只影响敌人。",
        uses: ["把对手攒起来的能力一波抹平", "在对方刚加满级时把局面拉回原点", "顺手清掉自己和队友身上被压低的等级"],
        kind: "self",
        range: 4,
        maxRange: 8,
        prepare: 14,
        active: 1,
        recover: 7,
        cooldown: 96,
        style: "haze",
        stationary: true,
        defaults: { focused: false, ai: { maxChase: 12, minStages: 2 } },
        fields: [flag("focused", "定向")],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[hazeId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(hazeId, "tempo", context)),
                recover: Math.round(p(hazeId, "aftercast", context)),
                cooldown: Math.round(p(hazeId, "recharge", context)),
                active: 1,
                range: p(hazeId, "fogRadius", context)
            };
        },
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[hazeId], detail: { values: config } };
            return { radius: p(hazeId, "fogRadius", context), geometry: "area", style: "haze", color: 0x2E2E38,
                label: config && config.focused === true ? "黑雾 · 定向" : "黑雾" };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_haze:gather", hazeScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", focused: config && config.focused === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const centre = body.position();
            const focused = !!(config && config.focused);
            const radius = Math.max(3, p(hazeId, "fogRadius", action));
            const density = Math.max(12, Math.round(p(hazeId, "density", action)));
            const scale = radius / 4;
            let swept = 0, erased = 0, marked = 0;

            WorldFeedback.emit(world, hazeScene, 1, centre,
                { moment: "bloom", radius: radius, density: density, scale: scale,
                    focused: focused ? 1 : 0, intensity: Math.max(0.7, Math.min(2, density / 26)) }, 34);

            WorldGeometry.select(world, WorldGeometry.ring(centre, 0, radius, { below: 3, above: 4 }), function (target, facts) {
                const self = String(target.ref()) === String(actor.ref());
                if (focused && (self || facts.friendly())) return;
                const removed = hazeErase(world, target);
                swept++;
                if (removed > 0) {
                    MobEffects.apply(world, target, hazeEffect, hazeMarkTicks, 0);
                    erased += removed; marked++;
                }
                WorldFeedback.emit(world, hazeScene, 1, facts.position(),
                    { moment: "swept", target: String(target.ref()), erased: removed,
                        motes: Math.max(6, Math.min(density, 6 + removed * 3)), scale: scale, intensity: removed > 0 ? 1 : 0.4 }, 24);
            });

            const at = hazeAbove(centre);
            if (marked > 0) WorldFeedback.text(world, at, hazeClearedText, [marked, erased], 30);
            else WorldFeedback.text(world, at, hazeEmptyText, [swept], 26);
            sound(action, "cobblemon:move.haze.actor");
            done(action);
        }
    });
}
