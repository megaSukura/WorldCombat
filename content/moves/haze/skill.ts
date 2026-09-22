/**
 * 黑雾 / haze —— 执行组织。
 *
 * 核心念头：憋一口气，把一片黑雾从身上漫出去。雾所过之处，每个人的能力等级都回到原点——抬起来的一起抹掉、
 *   压下去的也一起抹平。它是对等的：你自己攒的增益同样留不住，所以你放它的时机就是「对手攒得比你多」的那一刻；
 *   对手的余地也很清楚——站到半径之外，这口雾就碰不到你。
 *
 * 三幕：
 *   聚（windup，提交前）：低头把浊气拢在脚边，只播预告，可被打断且不花代价。
 *   漫（execute）：提交后雾从中心整圈铺开；圈里每个活体（尽抹式含自己与队友）的能力等级被清零，
 *     真正被抹掉过等级的个体挂上共享身份 world_combat:status/hazy 的可见标记，并浮出被抹平的级数。
 *   散（收势）：雾在中心慢慢淡去，只作画面，不再改动任何等级。
 *
 * 抹平走 NativeEffects.resetStages(..., ignoreAbility=true)：一次清零宝可梦的原生等级阶梯与其他活体的
 * 公共能力阶梯，并结束它们自己拥有的临时等级窗口；跳过「不可降级」一类特性，让黑雾对谁都是同一件事。
 */
namespace PokemonSkills {
    function hazeAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.2, 0)); }

    /** 把 actor 的能力等级全部清零（含自己拥有的临时窗口）；返回真正抹掉的等级数（绝对值之和）。 */
    export function hazeErase(world: CombatWorld, actor: CombatActor): number {
        if (!world.valid(actor)) return 0;
        return NativeEffects.resetStages(world, actor, true, "haze", "haze");
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
        return total;
    }

    define({
        id: hazeId,
        name: "黑雾",
        description: "升起一片黑雾，把范围内所有活体的能力等级全部变回原点——抬起来的一起抹掉，压下去的也一起抹平。对等：你自己的增益同样会被吞掉；站到半径之外就不受影响。",
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
