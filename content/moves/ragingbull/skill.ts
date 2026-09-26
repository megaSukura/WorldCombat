/**
 * 怒牛 / ragingbull 的出手方式。
 *
 * 核心念头：低头压角，整副身板沿直线冲出去；身体真实扫过的屏障随冲势一起碎。
 * 三幕：
 *   起（windup，提交前）：低头压角、后蹄刨地，身周聚起对应形态颜色的气。
 *   冲（execute → charge → ram）：提交后沿瞄准方向逐刻冲出，身后拖出尘与角气；trace 撞到活体即结算冲撞
 *       并按体重顶开；贯穿式一路撞穿最多四个目标，猛停式撞到第一个就停。每走一步都用**实际行进的线段**检查
 *       光幕：只要身体真的穿过，屏障就碎，不要求先撞到活体，也不会碰到前方还没走到的屏。
 *   收（settle）：终点收势，命中浮字与角气爆发；全程没碰到人则留一声冲空的浮字。
 *
 * 与同族分开：劈瓦是贴身快劈；精神之牙只在第一处身体或屏障上闭合一次；上菜是带增益的抛投。
 * 怒牛是唯一「人也在动」的冲撞，属性还随形态在普通／格斗／火／水之间变化。
 */
namespace PokemonSkills {
    const ragingbullScene = "world_combat:move_ragingbull";
    const ragingbullBreakText = "world_combat.move.ragingbull.text.break";
    const ragingbullMissText = "world_combat.move.ragingbull.text.miss";

    /** 水平面上点到线段 from–to 的距离；屏障是水平圆盘，用它判断身体是否真的扫过。 */
    function ragingbullFlatDistance(point: CombatPoint, from: CombatPoint, to: CombatPoint): number {
        const ax = from.x(), az = from.z(), bx = to.x(), bz = to.z();
        const dx = bx - ax, dz = bz - az, lengthSquared = dx * dx + dz * dz;
        if (lengthSquared < 1e-9) return Math.sqrt((point.x() - ax) * (point.x() - ax) + (point.z() - az) * (point.z() - az));
        const t = Math.max(0, Math.min(1, ((point.x() - ax) * dx + (point.z() - az) * dz) / lengthSquared));
        const cx = ax + dx * t, cz = az + dz * t;
        return Math.sqrt((point.x() - cx) * (point.x() - cx) + (point.z() - cz) * (point.z() - cz));
    }
    /**
     * 清除 from–to 这段真实行进轨迹（半径 radius 的胶囊）碰到、且从轨迹起点通视的屏障：场地层与身上的
     * 共享身份都清；cleared 记录已处理对象，保证同一次冲锋里只清一次。返回清除层数与位置。
     */
    function ragingbullCross(world: CombatWorld, from: CombatPoint, to: CombatPoint, radius: number,
        cleared: { [key: string]: boolean }): { count: number; points: CombatPoint[] } {
        let count = 0;
        const points: CombatPoint[] = [];
        const zones = WorldEffects.areasWithTag(world, WorldEffects.categories.screen);
        for (let z = 0; z < zones.length; z++) {
            const area = zones[z];
            const key = "field:" + String(area.id);
            if (cleared[key]) continue;
            const at = WorldCombat.point(area.position[0], area.position[1], area.position[2]);
            if (ragingbullFlatDistance(at, from, to) > area.radius + radius) continue;
            if (!world.clear(from, at)) continue;
            if (world.operation(area.id, "world_combat:dispel", "{}")) { cleared[key] = true; count++; points.push(at); }
        }
        const middle = from.plus(to).scale(0.5);
        const span = from.minus(to).length() / 2 + radius + 2;
        const actors: CombatActor[] = world.query(middle, span, false).slice();
        for (let i = 0; i < actors.length; i++) {
            const actor = actors[i];
            if (!actor || !world.valid(actor) || world.friendly(actor)) continue;
            const key = "actor:" + String(actor.ref());
            if (cleared[key]) continue;
            const body = world.observe(actor);
            if (body === null) continue;
            if (ragingbullFlatDistance(body.position(), from, to) > radius + body.width() * 0.5) continue;
            if (!world.clear(from, body.position())) continue;
            const removed = CombatStatus.cureTagged(world, actor, WorldEffects.categories.screen);
            if (removed > 0) { cleared[key] = true; count += removed; points.push(body.position()); }
        }
        return { count: count, points: points };
    }

    define({
        freeMovement: true,
        id: "ragingbull",
        cooldownParameter: "recharge",
        name: "怒牛",
        description: "低头压角沿直线冲出去：撞开路上的一切，角尖把**真实穿过**的反射壁、光墙与极光幕整片震碎——空荡的光墙也照碎，没走到的远端屏不受影响。属性随形态在普通、格斗、火与水之间变化。",
        uses: ["沿直线撞穿一排敌人", "身体一路碾过并撞碎光幕", "属性随形态变化的重型起手"],
        kind: "aim",
        range: 5.0,
        maxRange: 9.0,
        prepare: 8,
        active: 40,
        recover: 10,
        cooldown: 34,
        style: "charge",
        defaults: { trample: false, ai: { maxChase: 10, crowd: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p("ragingbull", "charge", pokemon) : 5, geometry: "line", style: "charge",
                color: pokemon ? ragingbullColorOf(pokemon) : 0xC8C8C0, label: config && config.trample ? "贯穿式" : "猛停式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["ragingbull"], detail: { values: config }, world: world, actor: actor, attributes: attributes };
            return {
                prepare: Math.max(4, Math.round(p("ragingbull", "tempo", context))),
                recover: Math.max(3, Math.round(p("ragingbull", "aftercast", context))),
                cooldown: Math.max(12, Math.round(p("ragingbull", "recharge", context))),
                range: p("ragingbull", "charge", context) + 0.5
            };
        },
        windup: function (action, config, prepare) {
            const tint = ragingbullColorOf(CobblemonCombat.pokemon(action.actor()));
            action.present("world_combat:move_ragingbull:windup", ragingbullScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", trample: config && config.trample ? 1 : 0, tint: tint }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const movementScenes = WorldFeedback.actionScenes(ragingbullScene);
            const world = action.world();
            const actor = action.actor();
            const direction = aim(action);
            const length = p("ragingbull", "charge", action);
            const speed = p("ragingbull", "gallop", action);
            const radius = p("ragingbull", "collisionRadius", action);
            const power = p("ragingbull", "ram", action);
            const shove = p("ragingbull", "shove", action);
            const wardBreak = p("ragingbull", "wardBreak", action);
            const minimum = p("ragingbull", "minimumMove", action);
            const trample = !!(config && config.trample);
            const maxTargets = trample ? 4 : 1;
            const tint = ragingbullColorOf(CobblemonCombat.pokemon(actor));
            const scale = radius / 0.5;
            const cleared: { [key: string]: boolean } = {};
            let travelled = 0, hits = 0, wards = 0, finished = false;
            const struck: { [ref: string]: boolean } = {};

            function showCross(current: CombatAction, result: { count: number; points: CombatPoint[] }, at: CombatPoint): void {
                if (result.count <= 0) return;
                wards += result.count;
                const scope = current.world();
                for (let i = 0; i < result.points.length && i < 6; i++)
                    WorldFeedback.emit(scope, ragingbullScene, 1, result.points[i],
                        { moment: "break", wards: result.count, scale: wardBreak / 8 }, 24);
                WorldFeedback.emit(scope, ragingbullScene, 1, at,
                    { moment: "break", wards: result.count, scale: wardBreak / 8 }, 24);
                sound(current, "minecraft:block.glass.break");
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.2, 0)), ragingbullBreakText, [result.count], 28);
            }
            function finish(current: CombatAction, moment: string): void {
                if (finished) return;
                finished = true;
                const scope = current.world(), body = scope.observe(current.actor());
                if (body !== null) {
                    WorldFeedback.emit(scope, ragingbullScene, 1, body.position(),
                        { moment: moment, tint: tint, hits: hits, wards: wards, scale: scale }, 22);
                    if (hits === 0)
                        WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.2, 0)), ragingbullMissText, [], 24);
                }
                movementScenes.finish(current, done);
            }
            function advance(current: CombatAction): void {
                const scope = current.world(), origin = current.origin();
                const step = Math.min(speed, Math.max(0, length - travelled));
                if (step <= 0.001) { finish(current, "settle"); return; }
                const delta = direction.scale(step);
                const swept = sweepStep(current, delta, radius);
                const hit = swept.hit;
                if (hit.hitEntity()) {
                    const target = hit.target();
                    const point = hit.position();
                    if (target !== null) {
                        const ref = String(target.ref());
                        if (!struck[ref]) {
                            struck[ref] = true;
                            hits++;
                            const burst = ragingbullCross(scope, point, point, wardBreak, cleared);
                            if (burst.count > 0) showCross(current, burst, point);
                            const landed = impact(current, hit, "ragingbull", power,
                                { damage: damageSpec("ragingbull", "ram"), contact: true });
                            WorldFeedback.emit(scope, ragingbullScene, 1, point,
                                { moment: "ram", target: ref, tint: tint, hits: hits, power: Math.round(power), scale: scale }, 26);
                            if (landed && scope.valid(target)) scope.hitDisplace(target, direction.scale(shove));
                            sound(current, "minecraft:entity.ravager.attack");
                        }
                    }
                    if (hits >= maxTargets) { finish(current, "settle"); return; }
                }
                const moved = swept.moved + (hit.hitEntity() && swept.remaining.length() > 0.001 ? scope.displace(current.actor(), swept.remaining) : 0);
                // 身体真正走过的这一段才检查光幕：不要求先撞到人，也不碰前方还没走到的屏。
                const body = scope.observe(current.actor());
                const movedTo = body === null ? origin.plus(direction.scale(moved)) : body.position();
                if (moved > 0.001) {
                    const crossed = ragingbullCross(scope, origin, movedTo, radius, cleared);
                    if (crossed.count > 0) showCross(current, crossed, movedTo);
                }
                travelled += moved;
                if (hit.blocked() || moved < minimum || travelled >= length) { finish(current, "settle"); return; }
                movementScenes.show(current, "charge", origin, { moment: "charge", tint: tint, scale: scale, ratio: Math.min(1, travelled / Math.max(0.001, length)) });
                current.after(1, advance);
            }
            movementScenes.show(action, "charge", action.origin(), { moment: "charge", tint: tint, scale: scale, ratio: 0 });
            sound(action, "minecraft:entity.goat.prepare_ram");
            advance(action);
        }
    });
}
