/**
 * 冰柱坠击 / iciclecrash 的出手方式。
 *
 * 核心念头：在选定落点的正上方凝出一根大冰柱，竖直砸下来——砸实的一瞬碎冰四散。
 * 它是单点重击：落点在提交时定死，冰柱落完之前目标可以走开，这就是它的余地。
 *
 * 三幕：
 *   起（windup，提交前）：呼出寒气、在选定落点挂一道预告的记号。
 *   击（mark → fall → shatter）：提交后先把落点吸附到地面、按顶棚截短可用落高，在落点正上方生成冰柱竖直落下；
 *       冰柱飞行中看得见、能躲，撞到方块就在该处碎裂。
 *   果（hit / miss）：落地一瞬把那圈里的敌人各砸一记（同一目标只砸一次），砸实的可能畏缩。
 *
 * 选取是 `kind: "aim"`：可以点地面或点实体，也可以朝空处落柱；提交时不要求存在敌人。
 * 落点出手时定死，出手后冰柱不再追人。取消掉附带冰面，冰地形留给已有的空间用途招式。
 *
 * 配置 `tall`（高空坠柱）由 resolve 改时序、由公式改高度与威力：开启＝更高更重更好躲，关闭＝近距快落。
 *
 * 畏缩：施加本单元声明的 MobEffect（共享身份 `world_combat:status/flinch`）并投递
 * `world_combat:interrupt`；全局起手门禁在窗口内拒绝新动作，伤害阶段不受影响。
 */
namespace PokemonSkills {
    const icicleCrashScene = "world_combat:move_iciclecrash";
    const icicleCrashFlinchEffect = "world_combat:iciclecrash_flinch";
    const icicleCrashFlinchText = "world_combat.move.iciclecrash.text.flinch";
    const icicleCrashHitText = "world_combat.move.iciclecrash.text.hit";
    const icicleCrashMissText = "world_combat.move.iciclecrash.text.miss";

    function icicleCrashFlinch(world: CombatWorld, target: CombatActor, ticks: number): boolean {
        if (MobEffects.apply(world, target, icicleCrashFlinchEffect, ticks, 0) === null) return false;
        world.deliver(target, "world_combat:interrupt");
        return true;
    }

    define({
        id: "iciclecrash",
        name: "Icicle Crash",
        description: "在选定落点的正上方凝出一根大冰柱竖直砸下：落地那圈里的敌人被碎冰扫到，砸实的可能畏缩。落点出手时定死、冰柱不再追人，目标可以在冰柱落下前走开；高空式更重更好躲，近落式更快更稳。",
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
            var selected = action.target();
            var centre = action.targetPosition();
            action.present("iciclecrash:mark", icicleCrashScene, 1, centre,
                JSON.stringify({ moment: "mark", target: selected ? String(selected.ref()) : "", tall: config && config.tall === true,
                    point: [centre.x(), centre.y(), centre.z()], scale: p("iciclecrash", "crackRadius", action) / 1.7 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const scenes = WorldFeedback.actionScenes(icicleCrashScene);
            const raw = action.targetPosition();
            action.releaseTarget();
            const point = WorldGeometry.ground(world, raw, 6);
            const dropHeight = p("iciclecrash", "dropHeight", action);
            const fallSpeed = p("iciclecrash", "fallSpeed", action);
            const crackRadius = p("iciclecrash", "crackRadius", action);
            const power = p("iciclecrash", "shatter", action);
            const chance = p("iciclecrash", "flinchChance", action);
            const flinchTicks = Math.round(p("iciclecrash", "flinchTicks", action));
            const icicleRadius = p("iciclecrash", "icicleRadius", action);
            const gravity = 0.02;
            const scale = crackRadius / 1.7;
            // 出生柱尖必须在落点正上方的连通空间里：向上探到第一块遮挡，用顶棚截短可用落高。
            const wanted = point.plus(WorldCombat.point(0, dropHeight, 0));
            const roof = action.trace(point.plus(WorldCombat.point(0, 0.2, 0)), wanted, Math.max(0.1, icicleRadius), false);
            const ceiling = roof.blockPosition();
            const topY = ceiling === null ? wanted.y()
                : Math.max(point.y() + Math.max(0.8, icicleRadius * 2), Math.min(wanted.y(), Math.floor(ceiling.y()) - 0.6));
            const top = WorldCombat.point(point.x(), topY, point.z());
            const fall = Math.max(0.5, top.y() - point.y());
            const count = Math.round(12 + power * 0.3);
            let settled = false;

            WorldFeedback.emit(world, icicleCrashScene, 1, point,
                { moment: "mark", scale: scale, radius: crackRadius, height: fall, count: count }, 26);
            sound(action, "cobblemon:move.iceshard.actor_1");

            function settle(current: CombatAction, at: CombatPoint, direct: CombatActor | null): void {
                if (settled) return;
                settled = true;
                scenes.stop(current, "fall");
                const scope = current.world();
                let struck = 0;
                WorldGeometry.selectEnemies(scope, WorldGeometry.ring(at, 0, crackRadius, { below: 2, above: 4 }), function (enemy, facts) {
                    if (direct !== null && String(enemy.ref()) === String(direct.ref())) return;
                    if (!hurt(current, enemy, "iciclecrash", power, { damage: damageSpec("iciclecrash", "shatter") })) return;
                    struck++;
                    WorldFeedback.emit(scope, icicleCrashScene, 1, facts.position(),
                        { moment: "hit", target: String(enemy.ref()), scale: scale, count: count }, 22);
                    if (scope.random() < chance && icicleCrashFlinch(scope, enemy, flinchTicks)) {
                        WorldFeedback.emit(scope, icicleCrashScene, 1, facts.position(), { moment: "flinch", target: String(enemy.ref()) }, 24);
                        WorldFeedback.text(scope, facts.position().plus(WorldCombat.point(0, 1.15, 0)), icicleCrashFlinchText, [], 26);
                    }
                });
                WorldFeedback.emit(scope, icicleCrashScene, 1, at, { moment: "shatter", scale: scale, radius: crackRadius, count: count }, 30);
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
                        if (impact(current, hit, "iciclecrash", power, { damage: damageSpec("iciclecrash", "shatter") })) {
                            WorldFeedback.emit(current.world(), icicleCrashScene, 1, at,
                                { moment: "hit", target: String(victim.ref()), scale: scale, count: count }, 22);
                            if (current.world().random() < chance && icicleCrashFlinch(current.world(), victim, flinchTicks)) {
                                WorldFeedback.emit(current.world(), icicleCrashScene, 1, at, { moment: "flinch", target: String(victim.ref()) }, 24);
                                WorldFeedback.text(current.world(), at.plus(WorldCombat.point(0, 1.15, 0)), icicleCrashFlinchText, [], 26);
                            }
                        }
                        settle(current, at, victim);
                    } else {
                        settle(current, at, null);
                    }
                },
                function (current) { if (!settled) settle(current, point, null); },
                JSON.stringify({ item: "minecraft:packed_ice", scale: Math.max(1.4, icicleRadius * 3), spin: true }));
            scenes.show(action, "fall", top,
                { moment: "fall", projectile: flight, height: fall, scale: scale });
        }
    });

}
