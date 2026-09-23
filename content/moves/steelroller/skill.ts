/**
 * 铁滚轮 / steelroller 的出手方式。
 *
 * 核心念头：把脚下的场地卷进身体、连根拔起，自己滚成一只钢轮沿地面碾出去——场地被压碎，路上的人被撞开，
 * 地面留下一条短命的钢辙。它是本族唯一「世界状态不对就完全使不出来」的一招：没有场地，钢轮根本卷不起来。
 *
 * 两幕：
 *   起（windup，提交前）：压低身体、把脚下场地的颜色收进轮缘；脚下没有场地就只是空转一下（present spin / falter）。
 *   滚（execute）：读出脚下正在生效的场地并逐条结束（场地被压碎），在地面压出一道钢辙，随后沿瞄准方向滚出去；
 *       撞上首个敌人即按 `roll` 结算接触伤害并顶开。脚下无场地则整招失败（PP 照扣，与原作一致）。
 *
 * 与同族分开：大地波动只是**读**场地；铁滚轮把场地**吃掉**。它也是本组唯一靠世界区域状态决定能不能出手的一招。
 */
namespace PokemonSkills {
    /** 滚过之处压出一道钢辙：沿地面租借若干格换成粗泥，到期原方块回来。 */
    function steelrollerFurrow(world: CombatWorld, from: CombatPoint, direction: CombatPoint, length: number, cells: number, ticks: number): number {
        var flat = WorldCombat.point(direction.x(), 0, direction.z());
        var step = flat.length() > 0.01 ? flat.unit() : WorldCombat.point(1, 0, 0);
        var count = Math.max(1, Math.round(cells));
        var spacing = Math.max(0.6, length / count);
        var pressed = 0;
        for (var i = 0; i < count; i++) {
            var probe = from.plus(step.scale(i * spacing)).plus(WorldCombat.point(0, -0.6, 0));
            var block = world.block(probe);
            if (block === null || String(block.id()) === "minecraft:air") continue;
            var cell = block.position();
            try {
                var lease = world.terrain(JSON.stringify({ cells: [{ x: cell.x(), y: cell.y(), z: cell.z(), block: "minecraft:coarse_dirt" }], replace: true, linger: true }), ticks);
                if (lease <= 0) continue;
            } catch (error) { continue; }
            pressed++;
            WorldFeedback.emit(world, steelrollerScene, 1, cell.plus(WorldCombat.point(0.5, 0.5, 0.5)), { moment: "tear" }, 18);
        }
        return pressed;
    }

    define({
        id: steelrollerId,
        cooldownParameter: "recharge",
        name: "Steel Roller",
        description: "把脚下正在生效的场地压碎，自己卷成钢轮碾出去；脚下没有场地时整招失败，PP 照常消耗。",
        uses: ["压碎对手依赖的场地并顺势碾过去", "把一片场地换成一次重击", "在场地里开出一条能走的钢辙"],
        kind: "enemy",
        range: 4,
        maxRange: 6.6,
        prepare: 12,
        active: 0,
        recover: 12,
        cooldown: 64,
        style: "charge",
        defaults: { grind: false, ai: { maxChase: 7 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(steelrollerId, "collisionRadius", pokemon) * 1.6, geometry: "line", style: "charge", color: 0xB8BEC8,
                label: config && config.grind === true ? "铁滚轮·碾磨" : "铁滚轮" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[steelrollerId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(steelrollerId, "tempo", context)),
                recover: Math.round(p(steelrollerId, "settle", context)),
                cooldown: Math.round(p(steelrollerId, "recharge", context)),
                active: 0,
                range: p(steelrollerId, "distance", context) + 0.4
            };
        },
        windup: function (action, config, prepare) {
            const world = action.sense(), self = action.actor();
            const charged = steelrollerCharged(world, self);
            action.present("steelroller:spin", steelrollerScene, 1, action.origin(),
                JSON.stringify({ moment: charged ? "spin" : "falter", windup: prepare,
                    grind: config && config.grind === true, scraper: Math.round(p(steelrollerId, "scraper", action)) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor();
            const body = world.observe(self);
            const origin = body === null ? action.origin() : body.position();
            const areas = body === null ? [] : steelrollerAreas(world, origin);
            const power = p(steelrollerId, "roll", action);
            const push = p(steelrollerId, "push", action);
            const count = Math.round(p(steelrollerId, "scraper", action));

            if (areas.length === 0) {
                WorldFeedback.emit(world, steelrollerScene, 1, origin, { moment: "falter", scale: p(steelrollerId, "collisionRadius", action) / 0.5 }, 22);
                WorldFeedback.text(world, origin.plus(WorldCombat.point(0, 1.2, 0)), steelrollerFalterText, [], 24);
                sound(action, "minecraft:block.anvil.step");
                done(action);
                return;
            }

            // 场地被压碎：逐条结束脚下的场地，它们的成员身份随 leave 一起被收回。
            var crushed = 0;
            for (var i = 0; i < areas.length; i++) if (world.operation(areas[i].id, "world_combat:dispel", "{}")) crushed++;
            WorldFeedback.emit(world, steelrollerScene, 1, origin,
                { moment: "tear", scale: p(steelrollerId, "collisionRadius", action) / 0.5, fields: crushed, scraper: count }, 26);
            WorldFeedback.text(world, origin.plus(WorldCombat.point(0, 1.2, 0)), steelrollerTearText, [], 24);
            sound(action, "minecraft:entity.iron_golem.damage");

            const direction = aim(action);
            const length = p(steelrollerId, "distance", action);
            const step = p(steelrollerId, "speed", action);
            const radius = p(steelrollerId, "collisionRadius", action);
            const travel = Math.ceil(length / Math.max(0.05, step)) + 8;
            steelrollerFurrow(world, origin, direction, length, p(steelrollerId, "scarCells", action), Math.round(p(steelrollerId, "scarTicks", action)));
            WorldFeedback.emit(world, steelrollerScene, 1, origin,
                { moment: "roll", scale: radius / 0.5, scraper: count, travel: travel, direction: [direction.x(), direction.y(), direction.z()] }, travel);
            sound(action, "minecraft:entity.ravager.attack");
            let travelled = 0;

            function whiff(current: CombatAction, at: CombatPoint): void {
                const scope = current.world();
                WorldFeedback.emit(scope, steelrollerScene, 1, at, { moment: "skid", scale: radius / 0.5 }, 22);
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.1, 0)), steelrollerFalterText, [], 22);
                scope.sound("minecraft:block.anvil.land", at, 14, "{}");
                done(current);
            }

            function advance(current: CombatAction): void {
                const scope = current.world(), here = current.origin();
                const delta = direction.scale(Math.min(step, length - travelled));
                const hit = current.trace(here, here.plus(delta.scale(p(steelrollerId, "traceAhead", current))), radius);
                if (hit.hitEntity()) {
                    const victim = hit.target();
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                        const landed = impact(current, hit, steelrollerId, power,
                            { damage: damageSpec(steelrollerId, "roll"), contact: true });
                        if (landed) {
                            const away = hit.position().minus(here);
                            if (scope.valid(victim) && away.length() > 0.05) scope.displace(victim, away.unit().scale(push));
                        }
                        WorldFeedback.emit(scope, steelrollerScene, 1, hit.position(),
                            { moment: "impact", target: String(victim.ref()), count: count, scale: radius / 0.5,
                                power: Math.round(power * 10) / 10 }, 30);
                        scope.sound("cobblemon:impact.steel", hit.position(), 16, "{}");
                        WorldFeedback.text(scope, hit.position().plus(WorldCombat.point(0, 1.1, 0)), steelrollerHitText,
                            [Math.round(power)], 26);
                    }
                    done(current);
                    return;
                }
                const moved = scope.displace(current.actor(), delta);
                travelled += moved;
                if (hit.blocked() || moved < p(steelrollerId, "minimumMove", current) || travelled >= length) {
                    whiff(current, here.plus(delta));
                    return;
                }
                current.after(1, advance);
            }
            advance(action);
        }
    });
}
