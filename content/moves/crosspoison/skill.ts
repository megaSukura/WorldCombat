/**
 * 十字毒刃 / crosspoison 的出手方式。
 *
 * 核心念头：两片毒刃从左右分开、在对手身上**同时**合拢剪出一个 X；切口里的毒不会立刻走，过 `seepDelay` 刻再渗一次，
 *   把毒真正按进伤口。它靠留在切口里的毒取胜，而不是靠这一剪有多重。
 *
 * 两幕：
 *   起（windup，提交前）：两片毒刃在身前左右分开、刃口滴毒，只播预告。
 *   剪（execute → slit / cut / venom）：提交后两刃同时合拢，正对目标结算一次 `slit` 接触伤害，
 *       两刃之间那条窄线（宽 `spread`）里的其他人各吃一记折扣；每个被剪到的人按 `poisonChance` 先抹一次毒。
 *   渗（seep，`seepDelay` 刻后）：切口里的毒再走一次，对每个被剪到且仍活着的人按更高的 `seepChance` 真正令其中毒。
 *
 * 与同族分开：十字劈是两道劈击从斜上方先后落下、第一劈为第二劈撞开架势；十字毒刃是两刃从左右同时合拢的一剪，
 *   凭切口里的毒取胜；毒尾是绕身半圈的低扫。
 *
 * 配置 corrode（腐蚀式）由 resolve 改时序、由公式改威力/中毒/渗毒，提交后才触碰世界。
 */
namespace PokemonSkills {
    const crosspoisonScene = "world_combat:move_crosspoison";
    const crosspoisonHitText = "world_combat.move.crosspoison.text.hit";
    const crosspoisonVenomText = "world_combat.move.crosspoison.text.venom";
    const crosspoisonSeepText = "world_combat.move.crosspoison.text.seep";
    const crosspoisonMissText = "world_combat.move.crosspoison.text.miss";

    /** 一道斜刃：在过落点、垂直于瞄准方向的平面里从一角划到对角。 */
    function crosspoisonBlade(centre: CombatPoint, lateral: CombatPoint, up: CombatPoint, spread: number, rising: boolean): number[][] {
        const a = centre.plus(lateral.scale(-spread)).plus(up.scale(rising ? -spread * 0.8 : spread * 0.8));
        const b = centre.plus(lateral.scale(spread)).plus(up.scale(rising ? spread * 0.8 : -spread * 0.8));
        return [[a.x(), a.y(), a.z()], [b.x(), b.y(), b.z()]];
    }

    define({
        id: "crosspoison",
        name: "Cross Poison",
        description: "Two venomous blades snap shut from either side and scissor an X into the target; the venom in the cut seeps in a moment later.",
        uses: ["同时合拢的一剪、终结一个目标", "顺手划到挤在目标两侧的敌人", "在切口里留下会渗的毒"],
        kind: "enemy",
        range: 2.5,
        maxRange: 3.6,
        prepare: 7,
        active: 16,
        recover: 6,
        cooldown: 20,
        style: "venom",
        maximumTicks: 220,
        defaults: { corrode: false, ai: { maxChase: 6, preferUnpoisoned: true, preferPair: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p("crosspoison", "reach", pokemon) : 2.5, geometry: "line", style: "venom",
                color: 0x9BE86B, label: config && config.corrode === true ? "十字毒刃·腐蚀式" : "十字毒刃" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["crosspoison"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("crosspoison", "tempo", context)),
                recover: Math.round(p("crosspoison", "settle", context)),
                cooldown: Math.round(p("crosspoison", "recharge", context)),
                active: skills["crosspoison"].active,
                range: p("crosspoison", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const drops = Math.max(6, Math.round(p("crosspoison", "drops", action) * 0.6));
            action.present("crosspoison:spread", crosspoisonScene, 1, action.origin(),
                JSON.stringify({ moment: "spread", windup: prepare, drops: drops, corrode: config && config.corrode ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            const origin = body === null ? action.origin() : body.position();
            const heading = aim(action);
            const target = action.target();
            const targetBody = target !== null && world.valid(target) ? world.observe(target) : null;
            const reach = Math.max(2.0, action.range());
            const slit = p("crosspoison", "slit", action);
            const spread = p("crosspoison", "spread", action);
            const share = p("crosspoison", "share", action);
            const chance = p("crosspoison", "poisonChance", action);
            const seepChance = p("crosspoison", "seepChance", action);
            const venomTicks = Math.max(60, Math.round(p("crosspoison", "venomTicks", action)));
            const seepDelay = Math.max(2, Math.round(p("crosspoison", "seepDelay", action)));
            const drops = Math.max(8, Math.round(p("crosspoison", "drops", action)));
            const scale = Math.max(0.6, Math.min(1.8, spread / 0.7));
            const intensity = Math.max(0.6, Math.min(2.2, slit / 70));
            const primary = target !== null ? String(target.ref()) : "";
            const centre = targetBody !== null ? targetBody.position() : origin.plus(heading.scale(reach));
            const lateral = WorldCombat.point(-heading.z(), 0, heading.x());
            const up = WorldCombat.point(0, 1, 0);
            const struck: string[] = [];
            let settled = false;

            function applyPoison(scope: CombatWorld, victim: CombatActor, chanceValue: number, moment: string): boolean {
                if (scope.random() >= chanceValue) return false;
                if (!CombatStatus.inflict(scope, victim, "poison", venomTicks, 0, { secondary: true })) return false;
                const now = scope.observe(victim);
                const at = now === null ? centre : now.position();
                WorldFeedback.emit(scope, crosspoisonScene, 1, at, { moment: moment, target: String(victim.ref()), drops: drops, scale: scale, intensity: intensity }, 20);
                return true;
            }

            function cut(scope: CombatWorld, victim: CombatActor, powerValue: number, chanceValue: number, primaryHit: boolean): void {
                const landed = hurt(action, victim, "crosspoison", powerValue,
                    { damage: damageSpec("crosspoison", "slit"), contact: true });
                const now = scope.observe(victim);
                const at = now === null ? centre : now.position();
                WorldFeedback.emit(scope, crosspoisonScene, 1, at,
                    { moment: "cut", target: String(victim.ref()), drops: drops, scale: scale, primary: primaryHit ? 1 : 0,
                        intensity: Math.max(0.5, Math.min(2.2, powerValue / 70)) }, 20);
                if (!landed || !scope.valid(victim)) return;
                scope.sound("cobblemon:impact.poison", at, 14, "{}");
                struck.push(String(victim.ref()));
                if (primaryHit) {
                    if (applyPoison(scope, victim, chanceValue, "venom")) WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.1, 0)), crosspoisonVenomText, [], 22);
                    else WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.1, 0)), crosspoisonHitText, [], 20);
                } else {
                    applyPoison(scope, victim, chanceValue, "venom");
                }
            }

            function seep(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                for (let index = 0; index < struck.length; index++) {
                    const victim = scope.actor(struck[index]);
                    if (victim === null || !scope.valid(victim)) continue;
                    const now = scope.observe(victim);
                    const at = now === null ? centre : now.position();
                    if (applyPoison(scope, victim, seepChance, "seep"))
                        WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.2, 0)), crosspoisonSeepText, [], 22);
                    else
                        WorldFeedback.emit(scope, crosspoisonScene, 1, at, { moment: "seep", target: String(victim.ref()), drops: Math.round(drops * 0.5), scale: scale }, 16);
                }
                done(current);
            }

            sound(action, "minecraft:entity.player.attack.sweep");
            WorldFeedback.emit(world, crosspoisonScene, 1, centre,
                { moment: "slit", path: crosspoisonBlade(centre, lateral, up, spread, true), drops: drops, scale: scale,
                    intensity: intensity, direction: [heading.x(), heading.y(), heading.z()] }, 18);
            WorldFeedback.emit(world, crosspoisonScene, 1, centre,
                { moment: "slit", path: crosspoisonBlade(centre, lateral, up, spread, false), drops: drops, scale: scale,
                    intensity: intensity, direction: [heading.x(), heading.y(), heading.z()] }, 18);

            let any = false;
            if (target !== null && targetBody !== null && targetBody.position().minus(origin).length() <= reach + 0.7) {
                cut(world, target, slit, chance, true);
                any = true;
            }
            WorldGeometry.selectEnemies(world, WorldGeometry.box(centre, lateral, WorldCombat.point(spread, 0, 0.6), { below: 1.4, above: 2.2 }),
                function (victim: CombatActor, facts: CombatObservation) {
                    const ref = String(victim.ref());
                    if (ref === String(actor.ref()) || ref === primary) return;
                    cut(world, victim, slit * share, chance, false);
                    any = true;
                });
            WorldFeedback.emit(world, crosspoisonScene, 1, centre,
                { moment: "seal", path: crosspoisonBlade(centre, lateral, up, spread, true), drops: drops, scale: scale,
                    intensity: intensity, struck: struck.length }, 20);
            if (!any) {
                WorldFeedback.emit(world, crosspoisonScene, 1, centre, { moment: "miss", scale: scale }, 16);
                WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 1.0, 0)), crosspoisonMissText, [], 20);
                sound(action, "cobblemon:move.gust.actor");
                done(action);
                return;
            }
            action.after(seepDelay, function (next: CombatAction) { seep(next); });
        }
    });
}
