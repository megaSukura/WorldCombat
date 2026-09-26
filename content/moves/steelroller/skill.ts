/**
 * 铁滚轮 / steelroller 的出手方式。
 *
 * 核心念头：把脚下的场地整片卷进身体、连根拔起，自己滚成一只钢轮沿地面碾出去——轮身染上被吃掉的场地颜色，
 * 真实滚过的地面才留下短命钢屑，路上的人被撞开。它是本族唯一「世界状态不对就完全使不出来」的一招：没有场地，
 * 钢轮根本卷不起来。
 *
 * 两幕：
 *   起（windup，提交前）：压低身体、把脚下场地的颜色收进轮缘；脚下没有场地就只是空转一下（present spin / falter）。
 *   滚（execute）：读出脚下正在生效的场地并整片结束（场地被压碎，颜色卷进轮身），随后沿瞄准方向滚出去；
 *       撞到的敌人按 `roll` 结算接触伤害并顶开，可以碾过目标继续前滚；命中上限由压碎的场地数量决定（至少一、
 *       最多三），同一目标只结算一次；撞上实墙或滚到尽头即收势。脚下无场地则整招失败（PP 照扣，与原作一致）。
 *
 * 与同族分开：大地波动只是**读**场地；铁滚轮把场地**吃掉**，并靠吃掉的数量换取有限的连续穿行。
 * 选取是 `aim`：可以朝任意方向空滚清场，实体沿路径受击，实墙阻断。
 */
namespace PokemonSkills {
    define({
        freeMovement: true,
        id: steelrollerId,
        cooldownParameter: "recharge",
        name: "Steel Roller",
        description: "把脚下正在生效的场地整片压碎，颜色卷进轮身，自己卷成钢轮碾出去；滚过的地面留下短命钢屑，能碾过目标继续前滚（上限由压碎的场地数量决定，至少一、最多三）。脚下没有场地时整招失败，PP 照常消耗。",
        uses: ["压碎脚下的场地并顺势碾过去", "把一片场地换成一次连续穿行", "在战场里开出一条能走的通路"],
        kind: "aim",
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
            const body = world.observe(self);
            const color = body === null || !charged ? 0xB8BEC8 : steelrollerFieldColor(steelrollerAreas(world, body.position()));
            action.present("steelroller:spin", steelrollerScene, 1, action.origin(),
                JSON.stringify({ moment: charged ? "spin" : "falter", windup: prepare,
                    grind: config && config.grind === true, scraper: Math.round(p(steelrollerId, "scraper", action)),
                    fieldColor: color }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const movementScenes = WorldFeedback.actionScenes(steelrollerScene);
            const world = action.world(), self = action.actor();
            const body = world.observe(self);
            const origin = body === null ? action.origin() : body.position();
            const areas = body === null ? [] : steelrollerAreas(world, origin);
            const power = p(steelrollerId, "roll", action);
            const push = p(steelrollerId, "push", action);
            const count = Math.round(p(steelrollerId, "scraper", action));
            const radius = p(steelrollerId, "collisionRadius", action);

            if (areas.length === 0) {
                WorldFeedback.emit(world, steelrollerScene, 1, origin, { moment: "falter", scale: radius / 0.5 }, 22);
                WorldFeedback.text(world, origin.plus(WorldCombat.point(0, 1.2, 0)), steelrollerFalterText, [], 24);
                sound(action, "minecraft:block.anvil.step");
                movementScenes.finish(action, done);
                return;
            }

            // 场地被整片压碎：先把被吃掉场地的颜色读出来，再逐条结束它们，成员身份随 leave 一起被收回。
            const fieldColor = steelrollerFieldColor(areas);
            var crushed = 0;
            for (var i = 0; i < areas.length; i++) if (world.operation(areas[i].id, "world_combat:dispel", "{}")) crushed++;
            WorldFeedback.emit(world, steelrollerScene, 1, origin,
                { moment: "tear", scale: radius / 0.5, fields: crushed, scraper: count, fieldColor: fieldColor }, 26);
            WorldFeedback.text(world, origin.plus(WorldCombat.point(0, 1.2, 0)), steelrollerTearText, [crushed], 24);
            sound(action, "minecraft:entity.iron_golem.damage");

            const direction3 = aim(action);
            let direction = WorldCombat.point(direction3.x(), 0, direction3.z());
            direction = direction.length() < 0.05 ? WorldCombat.point(1, 0, 0) : direction.unit();
            const length = p(steelrollerId, "distance", action);
            const step = p(steelrollerId, "speed", action);
            // 命中上限由压碎的场地数量决定：至少一、最多三；同一目标只结算一次。
            const maxHits = Math.max(1, Math.min(3, crushed));
            const travel = Math.ceil(length / Math.max(0.05, step)) + 4;
            const hitRefs: { [ref: string]: boolean } = {};
            let travelled = 0, hits = 0;

            movementScenes.show(action, "roll", origin, { moment: "roll", scale: radius / 0.5, scraper: count,
                fieldColor: fieldColor, travel: travel, direction: [direction.x(), direction.y(), direction.z()] });
            sound(action, "minecraft:entity.ravager.attack");

            // 真实滚过的地面才落钢屑：每段位置单独发射，不与预测路径绑定。
            function shards(current: CombatAction, at: CombatPoint): void {
                WorldFeedback.emit(current.world(), steelrollerScene, 1, at, { moment: "chips", scale: radius / 0.5,
                    scraper: Math.max(2, Math.round(count / Math.max(2, travel))), fieldColor: fieldColor }, 30);
            }

            function settle(current: CombatAction, at: CombatPoint): void {
                const scope = current.world();
                WorldFeedback.emit(scope, steelrollerScene, 1, at,
                    { moment: "skid", scale: radius / 0.5, fieldColor: fieldColor }, 22);
                scope.sound("minecraft:block.anvil.land", at, 14, "{}");
                movementScenes.finish(current, done);
            }

            function advance(current: CombatAction): void {
                const scope = current.world(), here = current.origin();
                const remaining = length - travelled;
                if (remaining <= 0.02) { settle(current, here); return; }
                const delta = direction.scale(Math.min(step, remaining));
                const swept = sweepStep(current, delta, radius), hit = swept.hit;
                let progressed = swept.moved;
                if (hit.hitEntity()) {
                    const victim = hit.target();
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                        const ref = String(victim.ref());
                        if (!hitRefs[ref] && hits < maxHits) {
                            hitRefs[ref] = true;
                            const landed = impact(current, hit, steelrollerId, power,
                                { damage: damageSpec(steelrollerId, "roll"), contact: true });
                            if (landed) {
                                hits++;
                                const away = hit.position().minus(here);
                                if (scope.valid(victim) && away.length() > 0.05) scope.hitDisplace(victim, away.unit().scale(push));
                                WorldFeedback.emit(scope, steelrollerScene, 1, hit.position(),
                                    { moment: "impact", target: ref, count: count, scale: radius / 0.5,
                                        fieldColor: fieldColor, power: Math.round(power * 10) / 10 }, 30);
                                scope.sound("cobblemon:impact.steel", hit.position(), 16, "{}");
                                WorldFeedback.text(scope, hit.position().plus(WorldCombat.point(0, 1.1, 0)), steelrollerHitText,
                                    [Math.round(power)], 26);
                            }
                        }
                    }
                    // 碾过刚才撞到的目标，把这一段剩余位移走完，继续向前推进。
                    const passed = swept.remaining;
                    if (passed.length() > 0.001) progressed += scope.displace(current.actor(), passed);
                }
                travelled += progressed;
                shards(current, current.origin());
                if (hit.blocked() || progressed < p(steelrollerId, "minimumMove", current) || travelled >= length) {
                    settle(current, current.origin());
                    return;
                }
                current.after(1, advance);
            }
            advance(action);
        }
    });
}
