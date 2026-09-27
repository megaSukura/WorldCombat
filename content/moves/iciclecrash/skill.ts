/**
 * 冰柱坠击 / iciclecrash 的出手方式。
 *
 * 核心念头：在选定落点的正上方凝出一块大冰，竖直砸下来——砸实的一瞬碎冰四散。
 * 它是单点重击：落点在准备期就锁到同一地表并固定，冰柱落完之前目标可以走开，这就是它的余地。
 *
 * 三幕：
 *   起（windup，提交前）：呼出寒气、在最终锁定的地表落点上挂一道预告。
 *   击（mark → fall → shatter）：提交后沿用同一个锁点，按头顶真实净空截短可用落高，在落点正上方生成冰块竖直落下；
 *       冰块飞行中看得见、能躲，撞到方块或实体就在该处碎裂；自然结束（无接触）只报落空，不凭空爆裂。
 *   果（hit / miss）：落地一瞬把那圈里**三维无遮挡**的敌人各砸一记（同一目标只砸一次），砸实的可能畏缩。
 *
 * 选取是 `kind: "aim"`：可以点地面或点实体，也可以朝空处落柱；提交时不要求存在敌人。
 * 落点准备期定死，出手后冰块不再追人。取消掉附带冰面，冰地形留给已有的空间用途招式。
 *
 * 配置 `tall`（高空坠柱）由 resolve 改时序、由公式改高度与威力：开启＝更高更重更好躲，关闭＝近距快落。
 *
 * 畏缩：施加本单元声明的 MobEffect（共享身份 `world_combat:status/flinch`）并投递
 * `world_combat:interrupt`；全局起手门禁在窗口内拒绝新动作，伤害阶段不受影响。载体成功与真正打断分别读回执。
 */
namespace PokemonSkills {
    const icicleCrashScene = "world_combat:move_iciclecrash";
    const icicleCrashFlinchEffect = "world_combat:iciclecrash_flinch";
    const icicleCrashFlinchText = "world_combat.move.iciclecrash.text.flinch";
    const icicleCrashHitText = "world_combat.move.iciclecrash.text.hit";
    const icicleCrashMissText = "world_combat.move.iciclecrash.text.miss";
    const icicleCrashBlockedText = "world_combat.move.iciclecrash.text.blocked";
    const icicleCrashLandingKey = "world_combat:move_iciclecrash/landing";

    /** 载体成功与真正打断分开读回执；只有载体真的挂上才播畏缩表现。 */
    function icicleCrashFlinch(world: CombatWorld, target: CombatActor, ticks: number): { applied: boolean; interrupted: boolean } {
        const applied = MobEffects.apply(world, target, icicleCrashFlinchEffect, ticks, 0) !== null;
        return { applied: applied, interrupted: applied ? world.deliver(target, "world_combat:interrupt") : false };
    }

    /** block-only 净空：整根冰柱的半径范围内，取最低的真实顶棚方块格；实体不参与。 */
    function icicleCrashCeiling(world: CombatWorld, point: CombatPoint, wanted: CombatPoint, radius: number): number | null {
        const offsets = [[0, 0], [radius, 0], [-radius, 0], [0, radius], [0, -radius]];
        let ceiling: number | null = null;
        for (let i = 0; i < offsets.length; i++) {
            const clip = WorldGeometry.blockHit(world,
                point.plus(WorldCombat.point(offsets[i][0], 0.2, offsets[i][1])),
                wanted.plus(WorldCombat.point(offsets[i][0], 0, offsets[i][1])));
            if (clip && clip.blockPosition()) {
                const y = clip.blockPosition()!.y();
                if (ceiling === null || y < ceiling) ceiling = y;
            }
        }
        return ceiling;
    }

    function icicleCrashLocked(action: CombatAction): CombatPoint | null {
        const stored = action.data(icicleCrashLandingKey);
        if (stored === null) return null;
        const value = JSON.parse(stored);
        return value && value.point && value.point.length === 3
            ? WorldCombat.point(value.point[0], value.point[1], value.point[2]) : null;
    }

    define({
        id: "iciclecrash",
        name: "Icicle Crash",
        description: "在选定落点的正上方凝出一块大冰竖直砸下：落地那圈里、三维无遮挡的敌人被碎冰扫到，砸实的可能畏缩。落点准备期定死、冰块不再追人，目标可以在落下前走开；高空式更重更好躲，近落式更快更稳。",
        uses: ["单点重击", "远程砸懵目标", "越过矮墙砸掩体后的落点", "把移动慢的目标钉在落点上"],
        kind: "aim",
        range: 9,
        maxRange: 13,
        prepare: 14,
        active: 24,
        recover: 10,
        cooldown: 44,
        style: "ice",
        defaults: { tall: false, ai: { maxChase: 13, opening: "fresh" } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("iciclecrash", "crackRadius", pokemon), geometry: "area", style: "ice", label: config && config.tall === true ? "高空冰柱" : "近落冰柱" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon, skill: skills["iciclecrash"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            var tall = !!(config && config.tall);
            return {
                prepare: p("iciclecrash", "prepare", context) + (tall ? 6 : 0),
                recover: p("iciclecrash", "recover", context),
                cooldown: p("iciclecrash", "cooldown", context) + (tall ? 8 : -2),
                active: skills["iciclecrash"].active,
                range: p("iciclecrash", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            var world = action.sense();
            var selected = action.target();
            var centre = WorldGeometry.ground(world, action.targetPosition(), 6);
            action.data(icicleCrashLandingKey, JSON.stringify({ point: [centre.x(), centre.y(), centre.z()] }));
            action.present("iciclecrash:mark", icicleCrashScene, 1, centre,
                JSON.stringify({ moment: "mark", target: selected ? String(selected.ref()) : "", tall: config && config.tall === true,
                    point: [centre.x(), centre.y(), centre.z()], scale: p("iciclecrash", "crackRadius", action) / 1.7 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const scenes = WorldFeedback.actionScenes(icicleCrashScene);
            const locked = icicleCrashLocked(action);
            const point = locked === null ? WorldGeometry.ground(world, action.targetPosition(), 6) : locked;
            // 停止准备期那道预告；随后在同一真实地表锁点重新标出执行圈，两圈不再并存。
            action.present("iciclecrash:mark", icicleCrashScene, 1, point, JSON.stringify({ moment: "mark", lifecycle: { reason: "settled" } }));
            action.releaseTarget();
            const dropHeight = p("iciclecrash", "dropHeight", action);
            const fallSpeed = p("iciclecrash", "fallSpeed", action);
            const crackRadius = p("iciclecrash", "crackRadius", action);
            const power = p("iciclecrash", "shatter", action);
            const chance = p("iciclecrash", "flinchChance", action);
            const flinchTicks = Math.round(p("iciclecrash", "flinchTicks", action));
            const icicleRadius = p("iciclecrash", "icicleRadius", action);
            const gravity = 0.02;
            const scale = crackRadius / 1.7;
            const wanted = point.plus(WorldCombat.point(0, dropHeight, 0));
            const ceiling = icicleCrashCeiling(world, point, wanted, icicleRadius);
            const minFall = Math.max(0.8, icicleRadius * 2);
            let topY = wanted.y();
            if (ceiling !== null) topY = Math.min(wanted.y(), ceiling - 0.6);
            if (!(topY - point.y() >= minFall)) {
                WorldFeedback.emit(world, icicleCrashScene, 1, point, { moment: "blocked", scale: scale, radius: crackRadius }, 22);
                WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1.0, 0)), icicleCrashBlockedText, [], 24);
                sound(action, "minecraft:block.glass.break");
                done(action);
                return;
            }
            const top = WorldCombat.point(point.x(), topY, point.z());
            const fall = Math.max(0.5, top.y() - point.y());
            const count = Math.round(12 + power * 0.3);
            let settled = false;

            WorldFeedback.emit(world, icicleCrashScene, 1, point,
                { moment: "mark", scale: scale, radius: crackRadius, height: fall, count: count }, 26);
            sound(action, "cobblemon:move.iceshard.actor_1");

            function tryFlinch(scope: CombatWorld, enemy: CombatActor, at: CombatPoint): void {
                if (scope.random() >= chance) return;
                const receipt = icicleCrashFlinch(scope, enemy, flinchTicks);
                if (!receipt.applied) return;
                WorldFeedback.emit(scope, icicleCrashScene, 1, at, { moment: "flinch", target: String(enemy.ref()), interrupted: receipt.interrupted }, 24);
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.15, 0)), icicleCrashFlinchText, [], 26);
            }

            function settle(current: CombatAction, at: CombatPoint, direct: CombatActor | null, directStruck: boolean): void {
                if (settled) return;
                settled = true;
                scenes.stop(current, "fall");
                const scope = current.world();
                let struck = directStruck ? 1 : 0;
                WorldGeometry.selectEnemies(scope, WorldGeometry.ring(at, 0, crackRadius, { below: 2, above: 4 }), function (enemy, facts) {
                    if (direct !== null && String(enemy.ref()) === String(direct.ref())) return;
                    // 三维遮挡：碎冰不能穿墙；身体中心或足底任一可见才算被扫到。
                    const centre = facts.position(), min = facts.boundsMin();
                    const feet = WorldCombat.point(centre.x(), min.y() + 0.1, centre.z());
                    if (WorldGeometry.blockHit(scope, at, centre) !== null && WorldGeometry.blockHit(scope, at, feet) !== null) return;
                    if (!hurt(current, enemy, "iciclecrash", power, { damage: damageSpec("iciclecrash", "shatter") })) return;
                    struck++;
                    WorldFeedback.emit(scope, icicleCrashScene, 1, facts.position(),
                        { moment: "hit", target: String(enemy.ref()), scale: scale, count: count }, 22);
                    tryFlinch(scope, enemy, facts.position());
                });
                // 首体在空中被直接命中时只碎在空中，不画地面霜圈。
                WorldFeedback.emit(scope, icicleCrashScene, 1, at,
                    { moment: direct !== null ? "shatter_air" : "shatter", scale: scale, radius: crackRadius, count: count }, 30);
                sound(current, "minecraft:block.glass.break");
                sound(current, "minecraft:block.powder_snow.break");
                if (struck === 0) {
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.0, 0)), icicleCrashMissText, [], 24);
                } else {
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.0, 0)), icicleCrashHitText, [struck], 26);
                }
                scenes.finish(current, done);
            }

            const flight = action.projectile(top, WorldCombat.point(0, -fallSpeed, 0), gravity, icicleRadius,
                fall + 3, 100,
                function (current, hit) {
                    const at = hit.position();
                    const victim = hit.target();
                    if (victim !== null && current.world().valid(victim) && !current.world().friendly(victim)) {
                        const directStruck = impact(current, hit, "iciclecrash", power, { damage: damageSpec("iciclecrash", "shatter") });
                        if (directStruck) {
                            WorldFeedback.emit(current.world(), icicleCrashScene, 1, at,
                                { moment: "hit", target: String(victim.ref()), scale: scale, count: count }, 22);
                            tryFlinch(current.world(), victim, at);
                        }
                        settle(current, at, victim, directStruck);
                    } else {
                        settle(current, at, null, false);
                    }
                },
                function (current) {
                    if (settled) return;
                    // 自然结束（无接触）：只按真实最后位置收场，不凭满射程点或旧瞄准点假造落点，也不结算范围伤害。
                    const last = current.world().projectilePosition(flight) || point;
                    scenes.stop(current, "fall");
                    WorldFeedback.emit(current.world(), icicleCrashScene, 1, last, { moment: "fizzle", scale: scale }, 18);
                    scenes.finish(current, done);
                },
                JSON.stringify({ item: "minecraft:packed_ice", scale: Math.max(1.4, icicleRadius * 3), spin: true }));
            scenes.show(action, "fall", top,
                { moment: "fall", projectile: flight, height: fall, scale: scale });
        }
    });

}
