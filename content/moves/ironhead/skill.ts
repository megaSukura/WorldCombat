/**
 * 铁头 / ironhead 的出手方式。
 *
 * 核心念头：把头像铁块一样沉下去，向前一小步，用整个头的重量砸实，把目标整个掀开——全家最短、最慢、
 * 最重的一记，起手看得见、够不到就白砸，砸上一下能把人从掩体边或队友身边轰走。
 *
 * 三幕：
 *   起（windup，提交前）：钢铁光泽爬上前额、脚边压出细尘，只播预告。
 *   击（stomp → impact / miss）：提交后逐刻沿瞄准方向短步推进；trace 撞上活体即结算 smash 接触伤害、
 *       按 shove 砸开目标并给一点上顶 lift、按 flinchChance 震懵；撞空则一头刹在尽头。
 *   果（hit / miss）：命中浮字，震懵的挂上本单元效果；落空一声闷响。
 *
 * 与同族分开：头锤快而便宜、连续压制；意念头锤会追人；双刃头锤自损。只有铁头以击退为目的、声音像敲钟。
 *
 * 畏缩：施加本单元声明的 MobEffect（共享身份 `world_combat:status/flinch`，只借身份、行为自写）并投递
 * `world_combat:interrupt`；下方门禁在窗口内拒绝新动作，伤害阶段不受影响。
 *
 * 配置 `braced`（沉铁式）由 resolve 改时序、由公式改威力／距离／击退，提交后才触碰世界。
 */
namespace PokemonSkills {
    const ironheadScene = "world_combat:move_ironhead";
    const ironheadFlinchEffect = "world_combat:ironhead_flinch";
    const ironheadFlinchText = "world_combat.move.ironhead.text.flinch";
    const ironheadHitText = "world_combat.move.ironhead.text.hit";
    const ironheadMissText = "world_combat.move.ironhead.text.miss";

    function ironheadFlinch(world: CombatWorld, target: CombatActor, ticks: number): boolean {
        if (MobEffects.apply(world, target, ironheadFlinchEffect, ticks, 0) === null) return false;
        world.deliver(target, "world_combat:interrupt");
        return true;
    }

    define({
        id: "ironhead",
        name: "Iron Head",
        description: "The user slams the target with its steel-hard head. This may also make the target flinch.",
        uses: ["贴身被围时把人整个轰开", "把对手砸下高台或砸出据点", "用最久的震懵锁住一个目标"],
        kind: "enemy",
        range: 3.1,
        maxRange: 4.6,
        prepare: 8,
        active: 22,
        recover: 10,
        cooldown: 34,
        style: "contact",
        defaults: { braced: false, ai: { maxChase: 6, spacing: "close" } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("ironhead", "collisionRadius", pokemon) * 1.6, geometry: "line", style: "contact",
                color: 0xB8BEC8, label: config && config.braced === true ? "沉铁头" : "铁头" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["ironhead"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p("ironhead", "tempo", context)),
                recover: Math.round(p("ironhead", "aftercast", context)),
                cooldown: Math.round(p("ironhead", "recharge", context)),
                active: skills["ironhead"].active,
                range: p("ironhead", "step", context) + 0.55
            };
        },
        windup: function (action, config, prepare) {
            action.present("ironhead:harden", ironheadScene, 1, action.origin(),
                JSON.stringify({ moment: "harden", braced: config && config.braced === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const length = p("ironhead", "step", action);
            const speed = p("ironhead", "charge", action);
            const radius = p("ironhead", "collisionRadius", action);
            const traceAhead = p("ironhead", "traceAhead", action);
            const power = p("ironhead", "smash", action);
            const chance = p("ironhead", "flinchChance", action);
            const flinchTicks = Math.round(p("ironhead", "flinchTicks", action));
            const shove = p("ironhead", "shove", action);
            const lift = p("ironhead", "lift", action);
            const direction = aim(action);
            const scale = radius / 0.55;
            const intensity = Math.max(0.5, Math.min(2.4, power / 85));
            let travelled = 0, settled = false;

            WorldFeedback.emit(world, ironheadScene, 1, action.origin(),
                { moment: "stomp", scale: scale, intensity: intensity, stride: Math.max(2, Math.round(length / 0.7)) }, 46);
            sound(action, "minecraft:block.anvil.step");

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            function stop(current: CombatAction, at: CombatPoint): void {
                const scope = current.world();
                WorldFeedback.emit(scope, ironheadScene, 1, at, { moment: "miss", scale: scale, intensity: intensity }, 22);
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.2, 0)), ironheadMissText, [], 20);
                sound(current, "minecraft:block.anvil.land");
                finish(current);
            }

            function advance(current: CombatAction): void {
                const scope = current.world();
                const origin = current.origin();
                const step = Math.min(speed, Math.max(0, length - travelled));
                if (step <= 0.001) { stop(current, origin); return; }
                const delta = direction.scale(step);
                const hit = current.trace(origin, origin.plus(delta.scale(traceAhead)), radius);
                if (hit.hitEntity()) {
                    const target = hit.target();
                    const at = hit.position();
                    const landed = target !== null && impact(current, hit, "ironhead", power,
                        { damage: damageSpec("ironhead", "smash"), contact: true });
                    WorldFeedback.emit(scope, ironheadScene, 1, at,
                        { moment: "impact", target: target ? String(target.ref()) : "", scale: scale,
                            intensity: intensity, hits: Math.round(16 + power * 0.16) }, 28);
                    sound(current, "cobblemon:impact.steel");
                    sound(current, "minecraft:block.anvil.land");
                    if (landed && target !== null && scope.valid(target)) {
                        // 先沿冲撞方向砸开，再给一点上顶速度，让目标被掀得离地半瞬——铁头的标志是“被砸飞”。
                        scope.displace(target, direction.scale(shove));
                        scope.motion(target, WorldCombat.point(0, lift, 0), true);
                        WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.2, 0)), ironheadHitText, [], 22);
                        if (scope.random() < chance && ironheadFlinch(scope, target, flinchTicks)) {
                            WorldFeedback.emit(scope, ironheadScene, 1, at, { moment: "stagger", target: String(target.ref()) }, 26);
                            WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.35, 0)), ironheadFlinchText, [], 24);
                        }
                    }
                    finish(current);
                    return;
                }
                const moved = scope.displace(current.actor(), delta);
                travelled += moved;
                if (hit.blocked() || moved < p("ironhead", "minimumMove", current) || travelled >= length) {
                    stop(current, origin);
                    return;
                }
                current.after(1, advance);
            }

            advance(action);
        }
    });

}
