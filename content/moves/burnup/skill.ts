/**
 * 燃尽 / burnup 的出手方式。
 *
 * 核心念头：把身体里的火一次抽干、朝身前一个锥面喷出去；喷完施法者真的燃尽，一段时间内不再是火属性，
 *   也点不着第二发。代价与收益同一个人扛。
 *
 * 三幕：
 *   起（kindle，提交前）：全身的火向内收拢，体表泛白，只播预告。
 *   喷（burst → blast）：提交后白焰以 `speed` 冲出身前 `reach` 格、张开 `cone` 度的锥面；
 *       正对的目标吃满 `outburst`，锥内其他人按 `share` 结算。
 *   尽（spent）：喷完立刻给自己挂上 `world_combat:burnup_spent`（身份 world_combat:status/burned_out），
 *       由 rules.ts 用共享 NativeModifiers 的 types 层摘掉火属性；期间 `ready` 拒绝再次施放。
 *
 * 与同族分开：本组其他三招读的是**对手**的物攻／异常／睡眠；燃尽读的是**自己**的火属性，把它烧掉换一发重击。
 *   和爆炸烈焰分开：那是投向落点的火球＋无法行动，燃尽是自己变成火焰、喷完失去本系。
 */
namespace PokemonSkills {
    define({
        id: burnupId,
        name: "Burn Up",
        description: "To inflict massive damage, the user burns itself out. After using this move, the user will no longer be Fire type.",
        uses: ["一发烧尽面前一条锥面", "用失去本系换一次重击", "把挤在身前的对手一起点燃"],
        kind: "enemy",
        range: 6.8,
        maxRange: 12.6,
        prepare: 8,
        active: 0,
        recover: 10,
        cooldown: 30,
        style: "fire",
        defaults: { banked: false, ai: { maxChase: 10, holdUntil: 0.6 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(burnupId, "reach", pokemon) : 6.8, geometry: "cone", style: "fire", color: 0xFFB347, label: "燃尽" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[burnupId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(burnupId, "kindle", context)),
                recover: Math.round(p(burnupId, "settle", context)),
                cooldown: Math.round(p(burnupId, "recharge", context)),
                active: 0,
                range: p(burnupId, "reach", context)
            };
        },
        ready: function (action, config) {
            return burnupHasFireNow(action.sense(), action.actor()) ? "" : "not-fire";
        },
        windup: function (action, config, prepare) {
            action.present("burnup:kindle", burnupScene, 1, action.origin(),
                JSON.stringify({ moment: "kindle", banked: config && config.banked === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const origin = action.origin();
            const direction = aim(action);
            const reach = p(burnupId, "reach", action);
            const cone = p(burnupId, "cone", action);
            const outburst = p(burnupId, "outburst", action);
            const share = p(burnupId, "share", action);
            const speed = p(burnupId, "speed", action);
            const hold = Math.max(1, Math.round(p(burnupId, "hold", action)));
            const ember = Math.max(14, Math.round(p(burnupId, "ember", action)));
            const target = action.target();
            const targetRef = target === null ? "" : String(target.ref());
            const point = action.targetPosition();
            const distance = point.minus(origin).length();
            const delay = Math.max(2, Math.round(distance / Math.max(0.5, speed)));
            const scale = Math.max(0.6, Math.min(2.2, reach / 6.8));
            const intensity = Math.max(0.6, Math.min(2.6, outburst / 130));

            WorldFeedback.emit(world, burnupScene, 1, origin,
                { moment: "burst", direction: [direction.x(), direction.y(), direction.z()], reach: reach, cone: cone, half: cone / 2,
                    speed: speed, scale: scale, intensity: intensity, ember: ember }, delay + 44);
            sound(action, "cobblemon:move.eruption.actor");

            function blast(current: CombatAction): void {
                const scope = current.world();
                const region = WorldGeometry.sector(origin, direction, reach, cone, { below: 1.8, above: 3.0 });
                let touched = 0;
                WorldGeometry.selectEnemies(scope, region, function (enemy, facts) {
                    if (String(enemy.ref()) === String(current.actor().ref())) return;
                    const main = targetRef !== "" && String(enemy.ref()) === targetRef;
                    const power = main ? outburst : outburst * share;
                    if (!hurt(current, enemy, burnupId, power, { damage: damageSpec(burnupId, "outburst"), knockback: false })) return;
                    touched++;
                    WorldFeedback.emit(scope, burnupScene, 1, facts.position(),
                        { moment: main ? "scorch" : "splash", target: String(enemy.ref()), scale: scale,
                            intensity: Math.max(0.5, Math.min(2.4, power / 130)) }, 46);
                });
                const caster = scope.observe(current.actor());
                const spot = caster === null ? origin : caster.position();
                if (touched > 0) {
                    WorldFeedback.text(scope, spot.plus(WorldCombat.point(0, 1.4, 0)), burnupBlastText, [touched], 28);
                    sound(current, "cobblemon:move.fireblast.target");
                } else {
                    WorldFeedback.text(scope, spot.plus(WorldCombat.point(0, 1.4, 0)), burnupFizzleText, [], 26);
                    sound(current, "minecraft:block.fire.extinguish");
                }
                // 燃尽：本单元效果挂上，rules.ts 摘掉火属性；`ready` 在窗口内拒绝再放。
                MobEffects.apply(scope, current.actor(), burnupSpentEffect, hold, 0);
                WorldFeedback.emit(scope, burnupScene, 1, spot,
                    { moment: "spent", target: String(current.actor().ref()), ember: Math.round(ember * 0.6), scale: scale }, 50);
                WorldFeedback.text(scope, spot.plus(WorldCombat.point(0, 1.5, 0)), burnupSpentText, [Math.round(hold / 20 * 10) / 10], 32);
                done(current);
            }

            action.after(delay, blast);
        }
    });
}
