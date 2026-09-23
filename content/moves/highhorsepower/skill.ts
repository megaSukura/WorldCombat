/**
 * 十万马力 / highhorsepower 的出手方式。
 *
 * 核心念头：**压低整个身体、把质量当武器压上去**——它不需要助跑、不旋转、不留坑，只是一次贴地的正面冲撞；
 *   这一招的全部内容就是「份量」。撞上的那一刻，体重与速度换算成的「马力」数浮在撞击点上方，撞击扬起的尘量
 *   也按这个数走，所以同招在两只精灵手里画面不同。
 *
 * 三幕（提交前只播预告）：
 *   起（ready）：压低重心、四足蹬地，脚边尘被往后推，只播预告，此时代价未结清。
 *   冲（drive）：提交后沿瞄准方向贴地冲出（每刻推进 `rush`，最远 `charge`）；每刻把前进的一段扫一遍，
 *       撞上非友方活体就结算 `drive` 接触伤害。
 *   撞（impact → press / miss）：撞中时在撞击点炸开尘环与土块，把目标沿冲撞方向顶开 `shove`，浮出 `might` 马力；
 *       压身式额外在撞击点向下压出一圈更重的尘环（把目标留在近处）；冲完没撞到人只留下扑空的尘与浮字。
 *
 * 与同族分开：蛮力（superpower）是舍身突进、自身攻防双降并留坑；直冲钻（drillrun）旋转钻穿一条线、地面犁沟；
 *   泰山压顶（bodyslam）从上方砸落。十万马力只有这一次贴地正面冲撞、撞完自己站住、什么都不留下。
 *
 * 配置 `press`（压身式）由 `resolve` 改时序与射程、由公式改威力／顶开／冷却，提交后才触碰世界。
 */
namespace PokemonSkills {
    define({
        id: highhorsepowerId,
        cooldownParameter: "recharge",
        name: "High Horsepower",
        description: "The user fiercely attacks the target using its entire body.",
        uses: ["用全身质量压低冲撞一个目标", "把对手撞离阵地、或压在近身继续打", "把体重与速度换成看得见的马力数"],
        kind: "enemy",
        range: 3.4,
        maxRange: 5.6,
        prepare: 7,
        active: 0,
        recover: 8,
        cooldown: 30,
        maximumTicks: 220,
        style: "impact",
        defaults: { press: false, ai: { maxChase: 9, closer: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(highhorsepowerId, "charge", pokemon) : 3.4, geometry: "line", style: "impact",
                color: 0xC9A66B, label: config && config.press === true ? "压身式十万马力" : "十万马力" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[highhorsepowerId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(highhorsepowerId, "tempo", context)),
                recover: Math.round(p(highhorsepowerId, "aftercast", context)),
                cooldown: Math.round(p(highhorsepowerId, "recharge", context)),
                active: 0,
                range: p(highhorsepowerId, "charge", context) + 0.6
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_highhorsepower:ready", highhorsepowerScene, 1, action.origin(),
                JSON.stringify({ moment: "ready", press: config && config.press === true ? 1 : 0,
                    might: Math.round(p(highhorsepowerId, "might", action)),
                    dust: Math.round(p(highhorsepowerId, "dust", action)) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const direction = aim(action);
            const charge = p(highhorsepowerId, "charge", action);
            const rush = p(highhorsepowerId, "rush", action);
            const hoof = p(highhorsepowerId, "hoof", action);
            const power = p(highhorsepowerId, "drive", action);
            const shove = p(highhorsepowerId, "shove", action);
            const might = Math.round(p(highhorsepowerId, "might", action));
            const dust = Math.max(8, Math.round(p(highhorsepowerId, "dust", action)));
            const traceAhead = p(highhorsepowerId, "traceAhead", action);
            const minimumMove = p(highhorsepowerId, "minimumMove", action);
            const press = !!(config && config.press);
            const scale = Math.max(0.5, Math.min(2.0, hoof / 0.45));
            const intensity = Math.max(0.5, Math.min(2.4, power / 95));
            let travelled = 0, struck = false, settled = false;

            sound(action, "minecraft:entity.iron_golem.attack");

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world(), body = scope.observe(actor);
                const at = body !== null ? body.position() : current.origin();
                if (!struck) {
                    WorldFeedback.emit(scope, highhorsepowerScene, 1, at,
                        { moment: "miss", might: might, dust: dust, scale: scale }, 18);
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 0.9, 0)), highhorsepowerMissText, [], 20);
                    sound(current, "minecraft:block.gravel.break");
                }
                done(current);
            }

            function advance(current: CombatAction): void {
                const scope = current.world(), origin = current.origin();
                const remaining = charge - travelled;
                if (remaining <= 0.001) { finish(current); return; }
                const delta = direction.scale(Math.min(rush, remaining));
                const hit = current.trace(origin, origin.plus(delta.scale(traceAhead)), hoof);
                if (hit.hitEntity()) {
                    const victim = hit.target();
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                        struck = true;
                        const at = hit.position();
                        const landed = impact(current, hit, highhorsepowerId, power,
                            { damage: damageSpec(highhorsepowerId, "drive"), contact: true });
                        WorldFeedback.emit(scope, highhorsepowerScene, 1, at,
                            { moment: "impact", target: String(victim.ref()), might: might, dust: dust,
                                scale: scale, intensity: intensity }, 30);
                        if (landed && scope.valid(victim)) {
                            if (press)
                                WorldFeedback.emit(scope, highhorsepowerScene, 1, at,
                                    { moment: "press", target: String(victim.ref()), might: might, dust: dust,
                                        scale: scale, intensity: intensity }, 26);
                            scope.displace(victim, direction.scale(shove));
                            WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.2, 0)),
                                highhorsepowerMightText, [might], 30);
                        }
                        scope.sound("cobblemon:impact.ground", at, 14, "{}");
                        scope.sound("minecraft:block.stone.break", at, 10, "{}");
                        finish(current);
                        return;
                    }
                }
                const moved = scope.displace(actor, delta);
                travelled += moved;
                WorldFeedback.keep(scope, "highhorsepower:drive:" + current.id(), highhorsepowerScene, 1, origin,
                    { moment: "drive", might: might,
                        dust: Math.round(dust * Math.min(1, travelled / Math.max(0.001, charge))),
                        scale: scale, intensity: intensity, progress: Math.min(1, travelled / Math.max(0.001, charge)) }, 8);
                if (hit.blocked() || moved < minimumMove || travelled >= charge) { finish(current); return; }
                current.after(1, function (next: CombatAction) { advance(next); });
            }

            WorldFeedback.emit(world, highhorsepowerScene, 1, action.origin(),
                { moment: "ready", press: press ? 1 : 0, might: might, dust: dust, scale: scale }, 16);
            advance(action);
        }
    });
}
