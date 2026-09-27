/**
 * 唤醒巴掌 / wakeupslap 的出手方式。
 *
 * 核心念头：一记带整段扑步的重掌，把睡着的对手一巴掌拍醒——睡着时这一掌翻倍，醒来那一下还被拖得发懵片刻。
 *   翻倍读的是**这一掌实际拍中的人**当时的睡眠，不是施放时选中的目标。
 *
 * 两幕：
 *   起（coil，提交前）：后撤抽臂、掌面蓄势，只播预告。
 *   拍（advance → slap / wake / miss）：`kind:"aim"` 自由瞄准，提交后沿方向压上去，撞上活体即结算 slap 接触伤害；
 *       在伤害前对该受击者快照其睡眠并以**这个人**的事实求倍数；命中后只有这人真正被拍醒才留一段醒后迟缓。
 *       这一掌只打首碰的那一个人，不向周围扩散；拍空或撞墙则收势。
 *
 * 与同族分开：清醒读的是麻痹、快而轻、命中即解除麻痹；唤醒巴掌读的是睡眠、慢而重、够得更近。
 *   欺诈读实际抓到者的物攻，祸不单行读任意异常。
 */
namespace PokemonSkills {
    define({
        freeMovement: true,
        id: wakeupslapId,
        cooldownParameter: "recharge",
        name: "Wake-Up Slap",
        description: "一记带整段扑步的重掌：命中时按**实际被拍中者**当下的睡眠结算威力，正睡着就翻倍；只有真被这一掌拍醒的人会后短促发懵（减速，仍能还手）。",
        uses: ["把睡着的对手一掌拍重", "趁睡眠窗口打出翻倍的一记", "在对手醒来前把这一记兑现掉"],
        kind: "aim",
        range: 3.6,
        maxRange: 5.8,
        prepare: 6,
        active: 0,
        recover: 8,
        cooldown: 24,
        style: "fighting",
        defaults: { ai: { maxChase: 7, wake: true } },
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
                JSON.stringify({ moment: "coil" }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const direction = aim(action);
            const length = p(wakeupslapId, "lunge", action);
            const step = p(wakeupslapId, "step", action);
            const radius = p(wakeupslapId, "collisionRadius", action);
            const push = p(wakeupslapId, "push", action);
            const startle = Math.max(1, Math.round(p(wakeupslapId, "startle", action)));
            const dust = Math.max(8, Math.round(p(wakeupslapId, "dust", action)));
            const sparks = Math.max(4, Math.round(p(wakeupslapId, "sparks", action)));
            const scale = Math.max(0.6, Math.min(1.8, radius / 0.34));
            let travelled = 0;

            sound(action, "minecraft:entity.ravager.attack");

            /** 在**这个受击者**的上下文求这一掌的威力：目标睡眠 ×2 按它自己算。 */
            function slapPowerFor(current: CombatAction, victim: CombatActor): number {
                return p(wakeupslapId, "slap", withTarget(factContext(current), victim));
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
                    // 受击位移走原生受击通道，保留抗击退/原生事件；推不动也不影响掌伤。
                    const away = point.minus(here);
                    if (away.length() > 0.05 && scope.valid(victim)) scope.hitDisplace(victim, away.unit().scale(push));
                    // 只有这个真实睡者被这一掌拍醒，才留一段醒后迟缓；未睡者不标。
                    if (wasAsleep && scope.valid(victim)) {
                        CombatStatus.cure(scope, victim, "sleep");
                        if (scope.valid(victim)) scope.marker(victim, "minecraft:slowness", startle, 1);
                    }
                    WorldFeedback.emit(scope, wakeupslapScene, 1, point,
                        { moment: wasAsleep ? "wake" : "slap", target: victimRef, asleep: wasAsleep ? 1 : 0,
                            dust: wasAsleep ? Math.round(dust * 1.3) : dust, sparks: wasAsleep ? sparks : 0, scale: scale,
                            intensity: Math.max(0.6, Math.min(2.4, power / 70)) }, 46);
                    // 真实掌形：从施法者送到这一掌的首碰点，短促收住。
                    WorldFeedback.emit(scope, wakeupslapPalmScene, 1, point,
                        { moment: wasAsleep ? "wake" : "slap", target: victimRef, start: scope.tick(),
                            duration: 3, scale: scale, wake: wasAsleep ? 1 : 0 }, 24);
                    WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.1, 0)),
                        wasAsleep ? wakeupslapWakeText : wakeupslapHitText, [], 26);
                    sound(current, wasAsleep ? "minecraft:block.amethyst_block.chime" : "cobblemon:impact.fighting");
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
