/**
 * 精神剑 / psyblade —— 注册与动作。
 *
 * 核心念头：凝出一把几乎看不见的灵刃，顺着瞄准方向直刺出去；自己脚下若真的站在一片接地的电气场地上，
 *   灵刃被电荷镀亮、威力 ×1.5，并沿同一条线再延长一段，能把排成一列的人都刺到。它读的是**施法者此刻
 *   站的地**（WorldEffects.covers + grounded），不是离场后仍残留的 status 余电；离场或腾空后下一次恢复短刃，
 *   场地本身不被消耗。
 *
 * 三幕：
 *   起（draw，提交前）：手中凝出折光与一圈灵能微光，侧刃按当前朝向放置；脚下带电时刃身爬着电弧，只播预告。
 *   刺（execute）：提交后先朝选定目标**逐刻真实身体步进**（原生 moveSweep，受墙与会挡的身体限制，总预算 = 压上速度 ×8），
 *       贴近后再朝选定方向刺出一条很窄的 3D 段：判定与表现共用同一对端点（WorldGeometry.bodySegment + blockHit 的真实
 *       接触点裁墙），刃线内的每个非友方各挨一次 `blade`，被顶开；带电时基础段之后清楚接一段延展段。没人被刺到只留一道空挥。
 *   加成：`blade` 的公式读本招 defineFacts 的真实接地电场事实 psyblade.field，与执行、指示、AI 同源。
 */
namespace PokemonSkills {
    define({
        freeMovement: true,
        id: psybladeId,
        cooldownParameter: "recharge",
        name: "精神剑",
        description: "凝出一把几乎看不见的灵刃，朝选定方向直刺出一条很窄的直线；自己站在电气场地上时，灵刃被电荷镀亮、威力提高，并沿同一条线再延长一段，能刺到排成一列的人。实墙会截短刃线，离场后下一次恢复短刃。",
        uses: ["贴着电气场地的电荷刺出一记重锋", "站在电荷上时一刃穿透排成一列的敌人", "用看不见的刃切断对手架势"],
        kind: "aim",
        range: 4.0,
        maxRange: 13.5,
        prepare: 6,
        active: 0,
        recover: 7,
        cooldown: 24,
        style: "psy",
        defaults: { extend: false, ai: { maxChase: 9, seekTerrain: true, finishLow: true } },
        fields: [],
        indicator: function (config, pokemon, inspection) {
            // 指示与合法范围一致：此刻站在接地电场里就把延展段读进半径，准星不会仍按短刃拒绝。
            const world = inspection && inspection.world ? inspection.world : null;
            const actor = inspection && inspection.actor ? inspection.actor : null;
            const charged = psybladeGroundedField(world, actor);
            const base = pokemon ? p(psybladeId, "reach", pokemon) : 4;
            const extra = charged && pokemon ? p(psybladeId, "surge", pokemon) : 0;
            return { radius: base + extra + 0.4, geometry: "line", style: "psy", color: 0xB79BFF,
                label: charged ? "带电精神剑" : config && config.extend === true ? "穿排精神剑" : "聚锋精神剑" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[psybladeId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const charged = psybladeGroundedField(world || null, actor || null);
            const base = p(psybladeId, "reach", context);
            const range = base + (charged ? p(psybladeId, "surge", context) : 0);
            return {
                prepare: Math.round(p(psybladeId, "tempo", context)),
                recover: Math.round(p(psybladeId, "settle", context)),
                cooldown: Math.round(p(psybladeId, "recharge", context)),
                active: 0,
                range: range
            };
        },
        windup: function (action, config, prepare) {
            const sense = action.sense();
            const charged = psybladeChargedNow(sense, action.actor());
            const caster = sense.observe(action.actor());
            const aimed = aim(action), fallback = WorldGeometry.facing(sense, action.actor());
            // 接地时贴地直刺；腾空时保留完整 3D 瞄准。预告的侧刃按这条真实朝向放置。
            const direction = caster !== null && caster.grounded()
                ? WorldGeometry.flatUnit(aimed, fallback === null ? undefined : fallback) : aimed;
            action.present("psyblade:draw", psybladeScene, 1, action.origin(),
                JSON.stringify({ moment: "draw", extend: config && config.extend === true ? 1 : 0, charged: charged ? 1 : 0,
                    direction: [direction.x(), direction.y(), direction.z()] }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const self = world.observe(actor);
            if (self === null) { done(action); return; }
            const aimed = aim(action), fallback = WorldGeometry.facing(world, actor);
            const direction = self.grounded()
                ? WorldGeometry.flatUnit(aimed, fallback === null ? undefined : fallback)
                : (aimed.length() < 0.01 ? action.direction() : aimed.unit());
            const reach = p(psybladeId, "reach", action);
            const surge = p(psybladeId, "surge", action);
            const half = Math.max(0.2, p(psybladeId, "bladeHalf", action));
            const dashSpeed = Math.max(0.1, p(psybladeId, "dashSpeed", action));
            const push = p(psybladeId, "push", action);
            const shards = Math.max(10, Math.round(p(psybladeId, "shards", action)));
            const extend = !!(config && config.extend);
            const target = action.target();
            // 保留旧的一步预算（压上速度 ×8），但改成逐刻真实身体步进，不再一次瞬移到位。
            const dashBudget = Math.max(dashSpeed, dashSpeed * 8);
            const scenes = WorldFeedback.actionScenes(psybladeScene);
            let travelled = 0, dashing = false, settled = false;

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                if (dashing) scenes.stop(current, "dash");
                scenes.finish(current, done);
            }

            /** 贴到选定目标身前（原生 moveSweep 遇墙/身体真实停下），走完就把身体停在真实位置再刺。 */
            function advance(current: CombatAction): void {
                const scope = current.world();
                const body = scope.observe(actor);
                if (body === null) { finish(current); return; }
                const here = body.position();
                let toTarget: CombatPoint | null = null;
                if (target !== null && scope.valid(target) && !scope.friendly(target)) {
                    const foeBody = scope.observe(target);
                    if (foeBody !== null) toTarget = foeBody.position().minus(here);
                }
                const distance = toTarget === null ? null : toTarget.length();
                const room = dashBudget - travelled;
                if (distance === null || distance <= reach * 0.7 || room <= 0.02) { thrust(current); return; }
                const dashDir = WorldGeometry.flatUnit(toTarget!, direction);
                const stepLen = Math.min(dashSpeed, room, Math.max(0, distance - reach * 0.5));
                if (stepLen <= 0.02) { thrust(current); return; }
                dashing = true;
                scenes.show(current, "dash", here, { moment: "dash", direction: [dashDir.x(), 0, dashDir.z()] });
                const before = current.origin();
                const hit = current.moveSweep(dashDir.scale(stepLen), Math.max(0.2, half));
                const moved = current.origin().minus(before).length();
                travelled += moved;
                if (moved < 0.02 || hit.blocked() || hit.hitEntity()) { thrust(current); return; }
                current.after(1, advance);
            }

            /** 一记窄刺：判定与表现共用 start→end 同一段 3D 线，实墙按真实接触点截短。 */
            function thrust(current: CombatAction): void {
                const scope = current.world();
                const body = scope.observe(actor);
                const origin = body === null ? current.origin() : body.position();
                const rise = body === null ? 0.9 : Math.max(0.4, Math.min(1.4, body.height() * 0.55));
                const power = p(psybladeId, "blade", current);
                const charged = psybladeChargedNow(scope, actor);
                const length = Math.max(reach, reach + (charged ? surge : 0));
                const start = origin.plus(WorldCombat.point(0, rise, 0));
                const far = start.plus(direction.scale(length));
                // 原生 clipBlocks 畅通也返回 MISS Impact，过滤为实际 BLOCK；position() 才是真实接触点。
                const wall = WorldGeometry.blockHit(scope, start, far);
                const end = wall === null ? far : wall.position();
                const actual = end.minus(start).length();
                const baseLength = Math.min(actual, reach);
                const baseEnd = start.plus(direction.scale(baseLength));
                const region = WorldGeometry.bodySegment(start, end, half);
                const scale = Math.max(0.6, Math.min(2.2, actual / psybladeReference));
                const intensity = Math.max(0.6, Math.min(2.6, power / (charged ? 60 : 90)));
                const dir = [direction.x(), direction.y(), direction.z()];
                let hits = 0;

                sound(current, "cobblemon:move.psychic.actor");
                // 基础窄段：判定线以内这一段。
                WorldFeedback.emit(scope, psybladeScene, 1, start,
                    { moment: "slash", direction: dir, reach: reach, surge: 0, length: baseLength, half: half,
                        shards: shards, scale: scale, intensity: intensity, charged: 0, extend: extend ? 1 : 0,
                        path: [[start.x(), start.y(), start.z()], [baseEnd.x(), baseEnd.y(), baseEnd.z()]] }, 22, "psyblade:slash");
                // 带电延展段：与基础段清楚分界，只画真正多出来的那一截。
                if (charged && actual > baseLength + 0.02) {
                    WorldFeedback.emit(scope, psybladeScene, 1, baseEnd,
                        { moment: "surge", direction: dir, surge: surge, length: actual - baseLength, half: half,
                            shards: shards, scale: scale, intensity: intensity, charged: 1, extend: extend ? 1 : 0,
                            path: [[baseEnd.x(), baseEnd.y(), baseEnd.z()], [end.x(), end.y(), end.z()]] }, 22, "psyblade:surge");
                }

                WorldGeometry.selectBodies(scope, region, function (victim, facts) {
                    if (String(victim.key()) === String(actor.key()) || facts.friendly()) return;
                    const at = facts.position();
                    // 墙后无伤：与目标之间必须有通视线。
                    if (!scope.clear(start, at)) return;
                    if (!hurt(current, victim, psybladeId, power,
                        { damage: damageSpec(psybladeId, "blade"), contact: true, slice: true })) return;
                    hits++;
                    if (push > 0.02) {
                        const away = WorldCombat.point(at.x() - origin.x(), 0, at.z() - origin.z());
                        if (scope.valid(victim) && away.length() > 0.2) scope.hitDisplace(victim, away.unit().scale(push));
                    }
                    WorldFeedback.emit(scope, psybladeScene, 1, at,
                        { moment: "cut", target: String(victim.ref()), shards: shards, scale: scale, charged: charged ? 1 : 0,
                            intensity: intensity }, 22);
                    scope.sound("cobblemon:impact.psychic", at, 14, "{}");
                });

                if (hits === 0) {
                    WorldFeedback.emit(scope, psybladeScene, 1, end, { moment: "miss", scale: scale }, 18);
                    WorldFeedback.text(scope, end.plus(WorldCombat.point(0, 0.3, 0)), psybladeMissText, [], 20);
                } else {
                    WorldFeedback.text(scope, origin.plus(WorldCombat.point(0, 1.15, 0)),
                        charged ? psybladeChargedText : psybladeCutText, charged ? [] : [hits], 24);
                }
                scope.sound("minecraft:entity.player.attack.sweep", origin, 14, "{}");
                finish(current);
            }
            advance(action);
        }
    });
}
