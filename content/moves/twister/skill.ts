/**
 * 龙卷风 / twister 的出手方式。
 *
 * 核心念头：在选定的地点立起一道持续旋涡——它原地转一段时间，涡边的人被风压向心拽、被抬离地面，
 * 每隔一小段被风刃刮一记；被卷住的人可能懵住。走开就不再挨刮，所以它的范围会呼吸，玩家能读。
 *
 * 三幕：
 *   起（windup，提交前）：施法者旋身、身侧卷起一环风向的预告。
 *   击（rise → vortex → strike）：提交后在选定点升起旋涡；此后每刻把圈内**实际可达**的敌人朝涡心牵引
 *       （挡在实墙后的不拉、不刮），每 `pulseTicks` 刻刮一记风刃（每目标每次施放只掷一次畏缩），
 *       并把还站在地上的人抬起来。旋涡本体是动作拥有的一个无限阶段，随施法动作持续、随其中断即止。
 *   收（fade）：旋涡到时不候，原地收束散去。
 *
 * 配置 `hold`（持续涡旋）由 resolve 改时长与冷却、由公式改牵引与单段威力：开启＝久而黏，关闭＝短而烈。
 *
 * 拉与抬都走 `hitDisplace`，保留原生击退事件、抗性与碰撞限制；每次施放最多卷住 `maxTargets` 个可达者。
 *
 * 畏缩：施加本单元声明的 MobEffect（共享身份 `world_combat:status/flinch`）并投递
 * `world_combat:interrupt`；全局起手门禁在窗口内拒绝新动作，伤害阶段不受影响。
 */
namespace PokemonSkills {
    const twisterScene = "world_combat:move_twister";
    const twisterOrbitScene = "world_combat:move_twister_orbit";
    const twisterFlinchEffect = "world_combat:twister_flinch";
    const twisterFlinchText = "world_combat.move.twister.text.flinch";
    const twisterStrikeText = "world_combat.move.twister.text.strike";
    const twisterEmptyText = "world_combat.move.twister.text.empty";

    function twisterFlinch(world: CombatWorld, target: CombatActor, ticks: number): boolean {
        if (MobEffects.apply(world, target, twisterFlinchEffect, ticks, 0) === null) return false;
        world.deliver(target, "world_combat:interrupt");
        return true;
    }

    define({
        id: "twister",
        name: "Twister",
        description: "在选定地点立起一道持续旋涡：圈内的敌人被向心拽、抬离地面，并每隔一小段挨一记风刃；走开就不再挨刮，被卷实的可能畏缩。持续式更久更黏，爆发式更短更烈。",
        uses: ["锁住一片地", "把人从掩体边缘卷进空地", "打断挤在圈里的敌人", "在小范围反复出伤"],
        kind: "point",
        range: 9,
        maxRange: 13,
        prepare: 12,
        active: 60,
        recover: 10,
        cooldown: 60,
        style: "wind",
        defaults: { hold: false, ai: { maxChase: 12, cluster: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("twister", "vortexRadius", pokemon), geometry: "area", style: "wind", label: config && config.hold === true ? "持续涡旋" : "爆发阵风" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon, skill: skills["twister"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            var hold = !!(config && config.hold);
            var duration = Math.round(p("twister", "vortexTicks", context));
            return {
                prepare: p("twister", "prepare", context) + (hold ? 2 : 0),
                recover: p("twister", "recover", context),
                cooldown: duration + (hold ? 18 : 6),
                active: duration,
                range: p("twister", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("twister:windup", twisterScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", hold: config && config.hold === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const centre = action.targetPosition();
            const radius = p("twister", "vortexRadius", action);
            const pull = p("twister", "pull", action);
            const lift = p("twister", "lift", action);
            const power = p("twister", "gust", action);
            const chance = p("twister", "flinchChance", action);
            const flinchTicks = Math.round(p("twister", "flinchTicks", action));
            const pulseTicks = Math.max(2, Math.round(p("twister", "pulseTicks", action)));
            const duration = Math.max(10, Math.round(p("twister", "vortexTicks", action)));
            const maxTargets = Math.max(1, Math.round(p("twister", "maxTargets", action)));
            const above = 6, height = above;
            const scale = radius / 2.4;
            const intensity = Math.max(0.5, Math.min(2, power / 16));
            const flow = Math.round(70 + radius * 26);
            const region = WorldGeometry.ring(centre, 0, radius, { below: 1, above: above });
            // 旋涡本体与绕轴流线都由这次施法动作拥有：中断或结束时立即收回。
            const scenes = WorldFeedback.actionScenes(twisterScene);
            const orbit = WorldFeedback.actionScenes(twisterOrbitScene);
            let elapsed = 0, settled = false, total = 0;
            const flinched: { [ref: string]: boolean } = {};

            /** 风从轴心流到真正通视的受卷者；实墙后的人不被拉、也不吃风刃。 */
            function reachable(scope: CombatWorld, facts: CombatObservation): boolean {
                const y = Math.max(centre.y(), facts.position().y());
                return scope.clear(WorldCombat.point(centre.x(), y, centre.z()), facts.position());
            }

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                scenes.stop(current);
                orbit.stop(current);
                WorldFeedback.emit(scope, twisterScene, 1, centre, { moment: "fade", scale: scale, radius: radius }, 30);
                if (total === 0) WorldFeedback.text(scope, centre.plus(WorldCombat.point(0, 1.0, 0)), twisterEmptyText, [], 22);
                done(current);
            }

            function tick(current: CombatAction): void {
                const scope = current.world();
                scope.stopMovement(current.actor());
                // 每刻的向心牵引：最近的 maxTargets 个可达者朝涡心拽，走 hitDisplace 尊重抗推与碰撞。
                let chosen = 0;
                WorldGeometry.selectEnemies(scope, region, function (enemy, facts) {
                    if (chosen >= maxTargets || !reachable(scope, facts)) return;
                    chosen++;
                    const delta = centre.minus(facts.position());
                    const flat = WorldCombat.point(delta.x(), 0, delta.z());
                    if (flat.length() > 0.3) scope.hitDisplace(enemy, flat.unit().scale(pull));
                });
                // 每 pulseTicks 刻刮一记风刃，并把还站在地上的人抬起来。
                if (elapsed % pulseTicks === 0) {
                    let hits = 0;
                    WorldGeometry.selectEnemies(scope, region, function (enemy, facts) {
                        if (hits >= maxTargets || !reachable(scope, facts)) return;
                        if (!hurt(current, enemy, "twister", power, { damage: damageSpec("twister", "gust") })) return;
                        hits++; total++;
                        const ref = String(enemy.ref());
                        if (!flinched[ref] && scope.random() < chance && twisterFlinch(scope, enemy, flinchTicks)) {
                            flinched[ref] = true;
                            WorldFeedback.emit(scope, twisterScene, 1, facts.position(), { moment: "flinch", target: ref }, 22);
                            WorldFeedback.text(scope, facts.position().plus(WorldCombat.point(0, 1.1, 0)), twisterFlinchText, [], 24);
                        }
                        if (facts.grounded() && scope.valid(enemy)) scope.hitDisplace(enemy, WorldCombat.point(0, lift, 0));
                    });
                    WorldFeedback.emit(scope, twisterScene, 1, centre,
                        { moment: "strike", scale: scale, radius: radius, hits: hits, marks: Math.max(4, hits * 6), intensity: intensity }, 20);
                    if (hits > 0) sound(current, "minecraft:entity.phantom.flap");
                }
                elapsed++;
                if (elapsed >= duration) { finish(current); return; }
                current.after(1, tick);
            }

            sound(action, "minecraft:entity.breeze.wind_burst");
            WorldFeedback.emit(world, twisterScene, 1, centre,
                { moment: "rise", scale: scale, radius: radius, height: height, flow: flow, intensity: intensity }, 30);
            scenes.show(action, "vortex", centre,
                { moment: "vortex", scale: scale, radius: radius, height: height, flow: flow, intensity: intensity });
            orbit.show(action, "flow", centre,
                { radius: radius, height: height, intensity: intensity, turns: 0.22 + Math.min(0.2, radius * 0.04) });
            tick(action);
        }
    });

}
