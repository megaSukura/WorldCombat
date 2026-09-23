/**
 * 麻麻刺刺 / zingzap 的出手方式。
 *
 * 核心念头：一边朝对手冲、一边在身周攒静电，撞上的那一刻把攒下的电一次放出来；电还会跳向目标旁边的下一个人。
 * 跑得越远攒得越足，所以这一招的形状是「一段带电荷的冲程」，而不是一记瞬发的撞击。
 *
 * 三幕：
 *   起（windup，提交前）：蹲身、身周静电噼啪的预告。
 *   冲（charge）：提交后逐刻朝目标冲出去，每跑一格给这一击攒一份电，电花随冲程变密。
 *   放（discharge → arc）：撞上时按冲程放大威力并掷畏缩，目标身上留一小段电花；
 *       跳电开启时，命中点把电再跳向最近的一个敌人（按分摊比例结算、畏缩几率减半）。扑空则冲到头收势。
 *
 * 与同族的区分：起草借草木窜跃、命中后提速；水流裂破裹水撞出去、撕开护甲；麻麻刺刺是蓄电的冲撞，
 *   威力随冲程增长，并把电跳向第二个敌人。
 *
 * 畏缩：施加本单元声明的 MobEffect（共享身份 `world_combat:status/flinch`）并投递
 * `world_combat:interrupt`；全局起手门禁在窗口内拒绝新动作，伤害阶段不受影响。
 */
namespace PokemonSkills {
    const zingzapScene = "world_combat:move_zingzap";
    const zingzapFlinchEffect = "world_combat:zingzap_flinch";
    const zingzapFlinchText = "world_combat.move.zingzap.text.flinch";
    const zingzapHitText = "world_combat.move.zingzap.text.hit";
    const zingzapArcText = "world_combat.move.zingzap.text.arc";
    const zingzapMissText = "world_combat.move.zingzap.text.miss";

    function zingzapFlinch(world: CombatWorld, target: CombatActor, ticks: number): boolean {
        if (MobEffects.apply(world, target, zingzapFlinchEffect, ticks, 0) === null) return false;
        world.deliver(target, "world_combat:interrupt");
        return true;
    }

    define({
        freeMovement: true,
        id: "zingzap",
        cooldownParameter: "recharge",
        name: "Zing Zap",
        description: "一边朝目标冲一边攒静电，撞上时把攒下的电一次放出：冲得越远威力越高、越容易把目标电懵；开启跳电时电还会跳向目标旁边的下一个人。",
        uses: ["拉一段冲程撞出一次高蓄电重击", "把冲上来的对手电懵", "借目标把电跳向它身边的第二个人"],
        kind: "enemy",
        range: 5.2,
        maxRange: 9,
        prepare: 9,
        active: 0,
        recover: 8,
        cooldown: 24,
        style: "electric",
        defaults: { overcharge: false, arcChain: true, ai: { maxChase: 10, longRun: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("zingzap", "rush", pokemon), geometry: "line", style: "electric", color: 0xFFE066,
                label: config && config.overcharge === true ? "麻麻刺刺·蓄电" : "麻麻刺刺" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["zingzap"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("zingzap", "tempo", context)),
                recover: Math.round(p("zingzap", "settle", context)),
                cooldown: Math.round(p("zingzap", "recharge", context)),
                active: 0,
                range: p("zingzap", "rush", context) + 1
            };
        },
        windup: function (action, config, prepare) {
            action.present("zingzap:windup", zingzapScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", overcharge: config && config.overcharge === true, windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const movementScenes = WorldFeedback.actionScenes(zingzapScene);
            const world = action.world();
            const crash = p("zingzap", "crash", action);
            const chargeMax = p("zingzap", "chargeMax", action);
            const chargeRate = p("zingzap", "chargeRate", action);
            const rush = p("zingzap", "rush", action);
            const pace = p("zingzap", "pace", action);
            const radius = p("zingzap", "radius", action);
            const arcReach = p("zingzap", "arc", action);
            const arcShare = p("zingzap", "arcShare", action);
            const chance = p("zingzap", "flinchChance", action);
            const flinchTicks = Math.round(p("zingzap", "flinchTicks", action));
            const staticTicks = Math.max(20, Math.round(p("zingzap", "staticTicks", action)));
            const scale = radius / 0.6;
            let travelled = 0, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; movementScenes.finish(current, done); } }

            function miss(current: CombatAction): void {
                const scope = current.world();
                const body = scope.observe(current.actor());
                if (body !== null) {
                    WorldFeedback.emit(scope, zingzapScene, 1, body.position(), { moment: "miss", scale: scale }, 20);
                    WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.1, 0)), zingzapMissText, [], 22);
                }
                finish(current);
            }

            /** 撞上的一刻：按冲程蓄电结算主击，再决定电要不要跳到旁边的人。 */
            function discharge(current: CombatAction, hit: CombatImpact, direction: CombatPoint, charge: number): void {
                if (settled) return;
                const scope = current.world();
                const victim = hit.target();
                if (victim === null || !scope.valid(victim)) { finish(current); return; }
                const power = crash * (1 + charge);
                const roll = chance * (1 + charge * 0.6);
                const intensity = Math.max(0.5, Math.min(2.2, power / 80));
                const landed = hurt(current, victim, "zingzap", power,
                    { damage: damageSpec("zingzap", "crash"), contact: true });
                WorldFeedback.emit(scope, zingzapScene, 1, hit.position(),
                    { moment: "discharge", target: String(victim.ref()), scale: scale, intensity: intensity,
                        charge: charge, sparks: Math.round(14 + charge * 60) }, 28);
                sound(current, "cobblemon:impact.electric");
                if (landed) {
                    if (scope.valid(victim)) scope.displace(victim, direction.scale(0.7));
                    WorldFeedback.keep(scope, "zingzap:static:" + String(victim.ref()), zingzapScene, 1, hit.position(),
                        { moment: "static", target: String(victim.ref()), scale: scale, sparks: Math.round(6 + charge * 24) }, staticTicks);
                    WorldFeedback.text(scope, hit.position().plus(WorldCombat.point(0, 1.3, 0)), zingzapHitText, [], 26);
                    if (scope.random() < roll && zingzapFlinch(scope, victim, flinchTicks)) {
                        WorldFeedback.emit(scope, zingzapScene, 1, hit.position(), { moment: "flinch", target: String(victim.ref()) }, 24);
                        WorldFeedback.text(scope, hit.position().plus(WorldCombat.point(0, 1.1, 0)), zingzapFlinchText, [], 24);
                    }
                    if (arcShare > 0) {
                        const contact = hit.position();
                        const candidates: { actor: CombatActor; point: CombatPoint; distance: number }[] = [];
                        WorldGeometry.selectEnemies(scope, WorldGeometry.ring(contact, 0, arcReach, { below: 1, above: 4 }),
                            function (other, facts) {
                                if (String(other.ref()) === String(victim.ref())) return;
                                candidates.push({ actor: other, point: facts.position(), distance: facts.position().minus(contact).length() });
                            });
                        if (candidates.length) {
                            let best = candidates[0];
                            for (let i = 1; i < candidates.length; i++) if (candidates[i].distance < best.distance) best = candidates[i];
                            const arcPower = power * arcShare;
                            const arcLanded = hurt(current, best.actor, "zingzap", arcPower, { damage: damageSpec("zingzap", "crash") });
                            WorldFeedback.emit(scope, zingzapScene, 1, contact,
                                { moment: "arc", target: String(best.actor.ref()), source: String(victim.ref()),
                                    path: [[contact.x(), contact.y() + 0.4, contact.z()], [best.point.x(), best.point.y() + 0.4, best.point.z()]],
                                    sparks: Math.round(10 + charge * 30), scale: scale }, 26);
                            sound(current, "minecraft:entity.lightning_bolt.thunder");
                            if (arcLanded) {
                                WorldFeedback.text(scope, best.point.plus(WorldCombat.point(0, 1.2, 0)), zingzapArcText, [], 24);
                                if (scope.random() < roll * 0.6 && zingzapFlinch(scope, best.actor, flinchTicks)) {
                                    WorldFeedback.emit(scope, zingzapScene, 1, best.point, { moment: "flinch", target: String(best.actor.ref()) }, 24);
                                }
                            }
                        }
                    }
                }
                finish(current);
            }

            function advance(current: CombatAction): void {
                const scope = current.world();
                const here = current.origin();
                let direction = aim(current);
                const victim = current.target();
                if (victim !== null && scope.valid(victim)) {
                    const at = scope.observe(victim);
                    if (at !== null) {
                        const delta = at.position().minus(here);
                        if (delta.length() > 0.05) direction = delta.unit();
                    }
                }
                const remaining = rush - travelled;
                if (remaining <= 0.001) { miss(current); return; }
                const step = Math.min(pace, remaining);
                const delta = direction.scale(step);
                const swept = sweepStep(current, delta, radius);
                const hit = swept.hit;
                const charge = Math.min(chargeMax, (travelled + swept.moved) * chargeRate);
                if (hit.hitEntity()) { discharge(current, hit, direction, charge); return; }
                const moved = swept.moved;
                travelled += moved;
                movementScenes.show(current, "charge", here, { moment: "charge", scale: scale, charge: Math.min(1, travelled / Math.max(0.001, rush)),
                        sparks: Math.round(10 + Math.min(chargeMax, travelled * chargeRate) * 90) });
                if (hit.blocked() || moved < 0.05) { miss(current); return; }
                current.after(1, advance);
            }

            sound(action, "cobblemon:move.thunderbolt.actor");
            WorldFeedback.emit(world, zingzapScene, 1, action.origin(), { moment: "start", scale: scale }, 18);
            advance(action);
        }
    });

}
