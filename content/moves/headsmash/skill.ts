/**
 * 双刃头锤 / headsmash 的出手方式。
 *
 * 核心念头：孤注一掷的正面头撞——低头沿瞄准方向直线冲出一段，用整颗头把目标撞飞，代价是这一撞的反作用力
 * 几乎一模一样地砸回自己身上；冲空也不是没事，会一头栽在地上自己掉血。它比同类猛撞都更“双刃”，
 * 每一记都在拿自己的生命换对方的生命。
 *
 * 两幕（冲空多一幕）：
 *   起（windup，提交前）：低头、刨地，只播预告表现。
 *   击（charge → impact / crash）：提交后逐刻沿瞄准方向推进；trace 撞上活体即结算 smash 接触伤害，
 *       按 recoil 比例反伤自己（共享结算），并把目标撞飞 shove 格；冲到底、撞墙或推不动都算撞空，
 *       一头栽地，按 selfCrash 比例自伤，扬起碎石。
 *
 * 与同族分开：舍身冲撞是中等反伤、撞完双方被弹开；爆炸头突击是贯通多目标、反伤轻；双刃头锤只撞一个、
 * 但反震重得离谱、冲空还要自伤。玩家凭“自己掉血有多狠”一眼分开。
 * 配置 hold（稳头式）由 resolve 改时序、由公式改威力/反伤/自伤，提交后才触碰世界。
 */
namespace PokemonSkills {
    const headsmashScene = "world_combat:move_headsmash";
    const headsmashHitText = "world_combat.move.headsmash.text.hit";
    const headsmashCrashText = "world_combat.move.headsmash.text.crash";

    define({
        id: "headsmash",
        cooldownParameter: "recharge",
        name: "Head Smash",
        description: "The user attacks the target with a hazardous full-power headbutt. This also damages the user terribly.",
        uses: ["用一记重得离谱的头槌砸掉残血目标", "在生存无虞时换一记全场最重的单点伤害", "把目标撞飞、为队友拉开身位"],
        kind: "enemy",
        range: 3.8,
        maxRange: 6.2,
        prepare: 9,
        active: 34,
        recover: 12,
        cooldown: 56,
        style: "contact",
        defaults: { hold: false, ai: { maxChase: 8, minHealth: 0.45 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("headsmash", "collisionRadius", pokemon) * 1.6, geometry: "line", style: "contact", color: 0xA88E6A, label: "双刃头锤" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["headsmash"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p("headsmash", "tempo", context)),
                recover: Math.round(p("headsmash", "aftercast", context)),
                cooldown: Math.round(p("headsmash", "recharge", context)),
                range: p("headsmash", "chargeLength", context) + 0.5
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_headsmash:windup", headsmashScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", hold: !!(config && config.hold) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const length = p("headsmash", "chargeLength", action);
            const speed = p("headsmash", "speed", action);
            const radius = p("headsmash", "collisionRadius", action);
            const traceAhead = p("headsmash", "traceAhead", action);
            const power = p("headsmash", "smash", action);
            const recoil = p("headsmash", "recoil", action);
            const selfCrash = p("headsmash", "selfCrash", action);
            const shove = p("headsmash", "shove", action);
            const direction = aim(action);
            const scale = radius / 0.55;
            const intensity = Math.max(0.6, Math.min(2.4, power / 120));
            WorldFeedback.emit(world, headsmashScene, 1, action.origin(), { moment: "charge", scale: scale, intensity: intensity }, 60);
            sound(action, "minecraft:entity.goat.long_jump");
            let travelled = 0;

            // 冲空：一头栽在地上，按自身最大生命比例自伤。
            function crash(current: CombatAction): void {
                const scope = current.world();
                const body = scope.observe(current.actor());
                if (body !== null) {
                    const loss = -scope.health(current.actor(), -body.maxHealth() * selfCrash, "world_combat:headsmash_crash");
                    WorldFeedback.emit(scope, headsmashScene, 1, body.position(),
                        { moment: "crash", scale: scale, intensity: intensity, loss: Math.round(loss * 10) / 10 }, 30);
                    WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.4, 0)), headsmashCrashText,
                        [Math.round(loss * 10) / 10], 30);
                }
                sound(current, "minecraft:item.mace.smash_ground_heavy");
                sound(current, "minecraft:entity.generic.big_fall");
                done(current);
            }

            function advance(current: CombatAction): void {
                const scope = current.world();
                const origin = current.origin();
                const step = Math.min(speed, Math.max(0, length - travelled));
                if (step <= 0.001) { crash(current); return; }
                const delta = direction.scale(step);
                const hit = current.trace(origin, origin.plus(delta.scale(traceAhead)), radius);
                if (hit.hitEntity()) {
                    const victim = hit.target();
                    const point = hit.position();
                    const landed = victim !== null && impact(current, hit, "headsmash", power,
                        { damage: damageSpec("headsmash", "smash"), contact: true, recoil: recoil });
                    WorldFeedback.emit(scope, headsmashScene, 1, point,
                        { moment: "impact", target: victim ? String(victim.ref()) : "", scale: scale,
                            intensity: intensity, hits: Math.round(18 + power * 0.14) }, 32);
                    sound(current, "minecraft:entity.goat.ram_impact");
                    if (landed && victim !== null && scope.valid(victim)) {
                        scope.displace(victim, direction.scale(shove));
                        WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.4, 0)), headsmashHitText, [], 30);
                    }
                    // 这一撞的反震由共享结算按 recoil 比例落在自己身上；这里只补表现。
                    const self = scope.observe(current.actor());
                    if (self !== null) WorldFeedback.emit(scope, headsmashScene, 1, self.position(),
                        { moment: "recoil", scale: scale, intensity: Math.max(0.5, Math.min(2.4, power * recoil / 60)) }, 26);
                    done(current);
                    return;
                }
                const moved = scope.displace(current.actor(), delta);
                travelled += moved;
                if (hit.blocked() || moved < p("headsmash", "minimumMove", current) || travelled >= length) {
                    crash(current);
                    return;
                }
                current.after(1, advance);
            }

            advance(action);
        }
    });
}
