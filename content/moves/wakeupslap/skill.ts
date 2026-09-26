/**
 * 唤醒巴掌 / wakeupslap 的出手方式。
 *
 * 核心念头：一记带整段扑步的重掌，把睡着的对手一巴掌拍醒——睡着时这一掌翻倍，醒来那一下还被震得僵立片刻。
 *   翻倍读的是**这一掌实际拍中的人**当时的睡眠，不是施放时选中的目标。
 *
 * 两幕：
 *   起（coil，提交前）：后撤抽臂、掌面蓄势，只播预告。
 *   拍（advance → slap / wake / miss）：`kind:"aim"` 自由瞄准，提交后沿方向压上去，撞上活体即结算 slap 接触伤害；
 *       在伤害前对该受击者快照其睡眠并以**这个人**的事实求倍数；命中后只有这人真正被拍醒才留短促僵直。
 *       余震式在命中点震出一圈余波，对可达范围内其他敌人各按**各人自己**在伤害前的睡眠重算倍数，
 *       只惊醒其中真正睡着的；主击即使击倒对方，也仍从实际接触点结算一次合法余震。拍空或撞墙则收势。
 *
 * 与同族分开：清醒读的是麻痹、快而轻、命中即解除麻痹；唤醒巴掌读的是睡眠、慢而重、够得更近，
 *   且余震式一次能震醒一圈人。欺诈读实际抓到者的物攻，祸不单行读任意异常。
 */
namespace PokemonSkills {
    define({
        freeMovement: true,
        id: wakeupslapId,
        cooldownParameter: "recharge",
        name: "Wake-Up Slap",
        description: "一记带整段扑步的重掌：命中时按**实际被拍中者**当下的睡眠结算威力，正睡着就翻倍；只有真被这一掌拍醒的人会踉跄片刻。余震式还能震出一圈余波，把附近敌人各按各自状态拍中、惊醒其中真正的睡者。",
        uses: ["把睡着的对手一掌拍重", "趁睡眠窗口打出翻倍的一记", "余震式一次震醒一圈人"],
        kind: "aim",
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
            const shock = config && config.shock === true;
            const shockRadius = p(wakeupslapId, "shockRadius", action);
            const shockShare = p(wakeupslapId, "shockShare", action);
            const startle = Math.max(1, Math.round(p(wakeupslapId, "startle", action)));
            const dust = Math.max(8, Math.round(p(wakeupslapId, "dust", action)));
            const sparks = Math.max(4, Math.round(p(wakeupslapId, "sparks", action)));
            const scale = Math.max(0.6, Math.min(1.8, radius / 0.34));
            let travelled = 0;

            sound(action, "minecraft:entity.ravager.attack");

            /** 在**这个受击者**的上下文求这一掌的威力：目标睡眠 ×2 与余震式代价都按它自己算。 */
            function slapPowerFor(current: CombatAction, victim: CombatActor): number {
                return p(wakeupslapId, "slap", withTarget(factContext(current), victim));
            }

            /** 余震：只对可达真实小圈内的实际被波及者结算，各自快照睡眠、各自惊醒。 */
            function shockwave(current: CombatAction, point: CombatPoint, victimRef: string): void {
                const scope = current.world();
                WorldFeedback.emit(scope, wakeupslapScene, 1, point,
                    { moment: "shock", radius: shockRadius, scale: Math.max(0.6, Math.min(1.8, shockRadius / 1.8)), dust: dust }, 40);
                WorldGeometry.selectEnemies(scope, WorldGeometry.ring(point, 0, shockRadius, { below: 1.6, above: 2.6 }), function (other, facts) {
                    const ref = String(other.ref());
                    if (ref === victimRef || ref === String(current.actor().ref())) return;
                    if (shockShare <= 0) return;
                    if (!scope.clear(point, facts.position())) return;
                    const wasAsleep = wakeupslapSleeping(scope, other);
                    const power = slapPowerFor(current, other) * shockShare;
                    if (power <= 0) return;
                    if (!hurt(current, other, wakeupslapId, power, { damage: damageSpec(wakeupslapId, "slap"), contact: false })) return;
                    if (wasAsleep && scope.valid(other)) {
                        CombatStatus.cure(scope, other, "sleep");
                        if (scope.valid(other)) scope.marker(other, "minecraft:slowness", startle, 1);
                    }
                    WorldFeedback.emit(scope, wakeupslapScene, 1, facts.position(),
                        { moment: "splash", target: ref, scale: scale, dust: Math.round(dust * 0.6),
                            asleep: wasAsleep ? 1 : 0, sparks: wasAsleep ? Math.round(sparks * 0.6) : 0 }, 38);
                    WorldFeedback.text(scope, facts.position().plus(WorldCombat.point(0, 1.0, 0)),
                        wasAsleep ? wakeupslapWakeText : wakeupslapShockText, [], 22);
                });
                sound(current, "minecraft:entity.ravager.stunned");
            }

            function advance(current: CombatAction): void {
                const scope = current.world(), here = current.origin();
                const delta = direction.scale(Math.min(step, Math.max(0, length - travelled)));
                if (delta.length() <= 0.001) { done(current); return; }
                const swept = sweepStep(current, delta, radius);
                const hit = swept.hit;
                if (hit.hitEntity()) {
                    const victim = hit.target();
                    const point = hit.position();
                    if (victim === null || !scope.valid(victim) || scope.friendly(victim)) { done(current); return; }
                    const victimRef = String(victim.ref());
                    // 伤害前快照这个实际受击者的睡眠，并以它的事实求倍数。
                    const wasAsleep = wakeupslapSleeping(scope, victim);
                    const power = slapPowerFor(current, victim);
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
                    // 只有这个真实睡者被这一掌拍醒，才留短促僵直；未睡者不标惊醒。
                    if (wasAsleep && scope.valid(victim)) {
                        CombatStatus.cure(scope, victim, "sleep");
                        if (scope.valid(victim)) scope.marker(victim, "minecraft:slowness", startle, 1);
                    }
                    WorldFeedback.emit(scope, wakeupslapScene, 1, point,
                        { moment: wasAsleep ? "wake" : "slap", target: victimRef, asleep: wasAsleep ? 1 : 0,
                            dust: wasAsleep ? Math.round(dust * 1.3) : dust, sparks: wasAsleep ? sparks : 0, scale: scale,
                            intensity: Math.max(0.6, Math.min(2.4, power / 70)) }, 46);
                    WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.1, 0)),
                        wasAsleep ? wakeupslapWakeText : wakeupslapHitText, [], 26);
                    sound(current, wasAsleep ? "minecraft:block.amethyst_block.chime" : "cobblemon:impact.fighting");
                    // 主击击倒也仍从实际接触点结算一次合法余震。
                    if (shock) shockwave(current, point, victimRef);
                    done(current);
                    return;
                }
                const moved = swept.moved;
                travelled += moved;
                if (hit.blocked() || moved < p(wakeupslapId, "minimumMove", current) || travelled >= length) {
                    WorldFeedback.emit(scope, wakeupslapScene, 1, current.origin(), { moment: "miss", scale: scale }, 30);
                    WorldFeedback.text(scope, current.origin().plus(WorldCombat.point(0, 1.0, 0)), wakeupslapMissText, [], 22);
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
