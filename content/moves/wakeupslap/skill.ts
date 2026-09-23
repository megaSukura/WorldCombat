/**
 * 唤醒巴掌 / wakeupslap 的出手方式。
 *
 * 核心念头：一记带整段扑步的重掌，把睡着的对手一巴掌拍醒——睡着时这一掌翻倍，醒来那一下还被震得僵立片刻。
 *
 * 两幕：
 *   起（coil，提交前）：后撤抽臂、掌面蓄势，只播预告。
 *   拍（advance → slap / wake / shock / miss）：提交后沿瞄准方向压上去，撞上活体即结算 slap 接触伤害；
 *       目标睡着时翻倍，命中后目标被惊起（共享规则里任何伤害都会惊醒睡眠，本招再留一段短促的惊醒僵直）。
 *       余震式在命中点震出一圈余波，把范围内的其他敌人也拍中（按 `shockShare`）并同样惊醒其中的睡眠者。
 *       拍空或撞墙则收势。
 *
 * 与同族分开：清醒读的是麻痹、快而轻、命中即解除麻痹；唤醒巴掌读的是睡眠、慢而重、够得更近，
 *   且余震式一次能震醒一圈人。欺诈读目标的物攻，祸不单行读任意异常。
 */
namespace PokemonSkills {
    define({
        id: wakeupslapId,
        cooldownParameter: "recharge",
        name: "Wake-Up Slap",
        description: "This attack inflicts big damage on a sleeping target. This also wakes the target up, however.",
        uses: ["把睡着的对手一掌拍重", "趁睡眠窗口打出翻倍的一记", "余震式一次震醒一圈人"],
        kind: "enemy",
        range: 3.6,
        maxRange: 5.8,
        prepare: 6,
        active: 0,
        recover: 8,
        cooldown: 24,
        style: "fighting",
        defaults: { shock: false, ai: { maxChase: 7, wake: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(wakeupslapId, "collisionRadius", pokemon) * 2.2 : 0.7, geometry: "line", style: "fighting", color: 0xE8B06A, label: "唤醒巴掌" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[wakeupslapId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(wakeupslapId, "grit", context)),
                recover: Math.round(p(wakeupslapId, "settle", context)),
                cooldown: Math.round(p(wakeupslapId, "recharge", context)),
                active: 0,
                range: p(wakeupslapId, "lunge", context) + 0.4
            };
        },
        windup: function (action, config, prepare) {
            action.present("wakeupslap:coil", wakeupslapScene, 1, action.origin(),
                JSON.stringify({ moment: "coil", shock: config && config.shock === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const direction = aim(action);
            const length = p(wakeupslapId, "lunge", action);
            const step = p(wakeupslapId, "step", action);
            const radius = p(wakeupslapId, "collisionRadius", action);
            const push = p(wakeupslapId, "push", action);
            // 目标睡着时由公式里的 `F.target("status.sleep")` 翻倍；这一掌与余震共用这份威力。
            const slapPower = p(wakeupslapId, "slap", action);
            const shock = config && config.shock === true;
            const shockRadius = p(wakeupslapId, "shockRadius", action);
            const shockShare = p(wakeupslapId, "shockShare", action);
            const startle = Math.max(1, Math.round(p(wakeupslapId, "startle", action)));
            const dust = Math.max(8, Math.round(p(wakeupslapId, "dust", action)));
            const sparks = Math.max(4, Math.round(p(wakeupslapId, "sparks", action)));
            const scale = Math.max(0.6, Math.min(1.8, radius / 0.34));
            let travelled = 0;

            sound(action, "minecraft:entity.ravager.attack");

            function shockwave(current: CombatAction, point: CombatPoint, origin: CombatPoint, victimRef: string): void {
                const scope = current.world();
                WorldFeedback.emit(scope, wakeupslapScene, 1, point,
                    { moment: "shock", radius: shockRadius, scale: Math.max(0.6, Math.min(1.8, shockRadius / 1.8)), dust: dust }, 40);
                WorldGeometry.selectEnemies(scope, WorldGeometry.ring(point, 0, shockRadius, { below: 1.6, above: 2.6 }), function (other, facts) {
                    const ref = String(other.ref());
                    if (ref === victimRef || ref === String(current.actor().ref())) return;
                    const power = slapPower * shockShare;
                    if (power <= 0) return;
                    if (!hurt(current, other, wakeupslapId, power, { damage: damageSpec(wakeupslapId, "slap"), contact: false })) return;
                    const sleeping = wakeupslapSleeping(scope, other);
                    WorldFeedback.emit(scope, wakeupslapScene, 1, facts.position(),
                        { moment: "shock", target: ref, scale: scale, dust: Math.round(dust * 0.6) }, 38);
                    WorldFeedback.text(scope, facts.position().plus(WorldCombat.point(0, 1.0, 0)),
                        sleeping ? wakeupslapWakeText : wakeupslapShockText, [], 22);
                });
                sound(current, "minecraft:entity.ravager.stunned");
            }

            function advance(current: CombatAction): void {
                const scope = current.world(), here = current.origin();
                const delta = direction.scale(Math.min(step, Math.max(0, length - travelled)));
                if (delta.length() <= 0.001) { done(current); return; }
                const hit = current.trace(here, here.plus(delta.scale(p(wakeupslapId, "traceAhead", current))), radius);
                if (hit.hitEntity()) {
                    const victim = hit.target();
                    const point = hit.position();
                    if (victim === null || !scope.valid(victim) || scope.friendly(victim)) { done(current); return; }
                    const victimRef = String(victim.ref());
                    const wasAsleep = wakeupslapSleeping(scope, victim);
                    const power = slapPower;
                    const landed = hurt(current, victim, wakeupslapId, power, { damage: damageSpec(wakeupslapId, "slap"), contact: true });
                    if (!landed) {
                    WorldFeedback.emit(scope, wakeupslapScene, 1, point, { moment: "miss", scale: scale }, 30);
                    WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.0, 0)), wakeupslapMissText, [], 22);
                        sound(current, "minecraft:entity.player.attack.nodamage");
                        done(current);
                        return;
                    }
                    const away = point.minus(here);
                    if (away.length() > 0.05 && scope.valid(victim)) scope.displace(victim, away.unit().scale(push));
                    WorldFeedback.emit(scope, wakeupslapScene, 1, point,
                        { moment: wasAsleep ? "wake" : "slap", target: victimRef, asleep: wasAsleep ? 1 : 0,
                            dust: wasAsleep ? Math.round(dust * 1.3) : dust, sparks: wasAsleep ? sparks : 0, scale: scale,
                            intensity: Math.max(0.6, Math.min(2.4, power / 70)) }, 46);
                    WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.1, 0)),
                        wasAsleep ? wakeupslapWakeText : wakeupslapHitText, [], 26);
                    sound(current, wasAsleep ? "minecraft:block.amethyst_block.chime" : "cobblemon:impact.fighting");
                    if (wasAsleep && scope.valid(victim)) {
                        CombatStatus.cure(scope, victim, "sleep");
                        if (scope.valid(victim)) scope.marker(victim, "minecraft:slowness", startle, 1);
                    }
                    if (shock && scope.valid(victim)) shockwave(current, point, here, victimRef);
                    done(current);
                    return;
                }
                const moved = scope.displace(current.actor(), delta);
                travelled += moved;
                if (hit.blocked() || moved < p(wakeupslapId, "minimumMove", current) || travelled >= length) {
                    WorldFeedback.emit(scope, wakeupslapScene, 1, here.plus(delta), { moment: "miss", scale: scale }, 30);
                    WorldFeedback.text(scope, here.plus(delta).plus(WorldCombat.point(0, 1.0, 0)), wakeupslapMissText, [], 22);
                    sound(current, "minecraft:entity.player.attack.nodamage");
                    done(current);
                    return;
                }
                current.after(1, advance);
            }
            advance(action);
        }
    });
}
