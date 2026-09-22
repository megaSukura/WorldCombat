/**
 * 回旋踢 / rollingkick —— 注册与动作。
 *
 * 核心念头：原地急旋一圈聚起惯性，再扑出半步抡起回旋腿正中目标，把它沿踢击方向**抛到半空飞出去**；
 *   那一脚的震荡有概率让对手一滞。方向在提交那一刻锁死，起旋的时间里目标移开就会扫空。
 *
 * 三幕：
 *   起（whirl，提交前）：原地急旋、腿根蓄劲，只播预告，可被打断；这是对手走开的窗口。
 *   扑（drive → kick / whiff）：提交后沿瞄准方向逐刻扑出；trace 撞上活体即结算 `kick` 接触伤害，
 *       并把目标沿踢击方向抛飞（`launchAway` 远、`launchUp` 高）；按 `flinchChance` 掷畏缩。扑完距离没碰到人则扫空。
 *   落（hit / miss）：命中浮字与火星，畏缩的挂上本单元效果；落空处火星散开。
 *
 * 畏缩：施加本单元声明的 MobEffect（共享身份 `world_combat:status/flinch`，只借身份、行为自写）并投递
 * `world_combat:interrupt`；下方门禁在窗口内拒绝新动作，伤害阶段不受影响。
 *
 * 配置 `liftoff`（抛飞式）由 resolve 改时序、由公式改踢力/抛飞，提交后才触碰世界。
 */
namespace PokemonSkills {
    function rollingkickFlinch(world: CombatWorld, target: CombatActor, ticks: number): boolean {
        if (MobEffects.apply(world, target, rollingkickFlinchEffect, ticks, 0) === null) return false;
        world.deliver(target, "world_combat:interrupt");
        return true;
    }

    define({
        id: rollingkickId,
        name: "Rolling Kick",
        description: "The user lashes out with a quick, spinning kick. This may also make the target flinch.",
        uses: ["把贴身的目标一腿踢飞到半空", "把对手从队友或掩体边踢开", "用旋转的冲劲顺势追上去"],
        kind: "enemy",
        range: 2.8,
        maxRange: 4.0,
        prepare: 9,
        active: 18,
        recover: 8,
        cooldown: 22,
        style: "fighting",
        defaults: { liftoff: false, ai: { maxChase: 7, finish: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(rollingkickId, "foot", pokemon) * 1.6, geometry: "line", style: "fighting", color: 0xE8A96A,
                label: config && config.liftoff === true ? "抛飞式回旋踢" : "回旋踢" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[rollingkickId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(rollingkickId, "tempo", context)),
                recover: Math.round(p(rollingkickId, "aftercast", context)),
                cooldown: Math.round(p(rollingkickId, "recharge", context)),
                active: 18,
                range: p(rollingkickId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("rollingkick:whirl", rollingkickScene, 1, action.origin(),
                JSON.stringify({ moment: "whirl", liftoff: config && config.liftoff === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const aimed = aim(action);
            const flat = WorldCombat.point(aimed.x(), 0, aimed.z());
            const direction = flat.length() < 0.05 ? WorldCombat.point(0, 0, 1) : flat.unit();
            const length = p(rollingkickId, "reach", action);
            const speed = p(rollingkickId, "lunge", action);
            const foot = p(rollingkickId, "foot", action);
            const power = p(rollingkickId, "kick", action);
            const launchAway = p(rollingkickId, "launchAway", action);
            const launchUp = p(rollingkickId, "launchUp", action);
            const chance = p(rollingkickId, "flinchChance", action);
            const flinchTicks = Math.round(p(rollingkickId, "flinchTicks", action));
            const sparks = Math.max(12, Math.round(p(rollingkickId, "sparks", action)));
            const scale = Math.max(0.6, Math.min(2.0, foot / 0.42));
            const intensity = Math.max(0.6, Math.min(2.2, power / 72));
            let travelled = 0, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            function whiff(current: CombatAction, at: CombatPoint): void {
                const scope = current.world();
                WorldFeedback.emit(scope, rollingkickScene, 1, at, { moment: "miss", scale: scale, intensity: intensity }, 18);
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.05, 0)), rollingkickMissText, [], 20);
                sound(current, "minecraft:entity.player.attack.nodamage");
                finish(current);
            }

            WorldFeedback.emit(world, rollingkickScene, 1, action.origin(),
                { moment: "whirl", radius: length, sparks: sparks, scale: scale, intensity: intensity }, 30);
            sound(action, "cobblemon:move.quickattack.actor");
            // 扑（drive）：身子带着惯性冲出；emitter 绑 source 并留 trail，随扑出的轨迹拖出一线火星。
            WorldFeedback.keep(world, "rollingkick:drive:" + action.id(), rollingkickScene, 1, action.origin(),
                { moment: "drive", sparks: sparks, scale: scale, intensity: intensity }, 30);

            function advance(current: CombatAction): void {
                const scope = current.world();
                const origin = current.origin();
                const step = Math.min(speed, Math.max(0, length - travelled));
                if (step <= 0.001) { whiff(current, origin); return; }
                const delta = direction.scale(step);
                const hit = current.trace(origin, origin.plus(delta.scale(p(rollingkickId, "traceAhead", current))), foot);
                if (hit.hitEntity()) {
                    const victim = hit.target(), at = hit.position();
                    const landed = victim !== null && impact(current, hit, rollingkickId, power,
                        { damage: damageSpec(rollingkickId, "kick"), contact: true });
                    WorldFeedback.emit(scope, rollingkickScene, 1, at,
                        { moment: "kick", target: victim ? String(victim.ref()) : "", sparks: sparks, scale: scale, intensity: intensity }, 24);
                    if (landed && victim !== null && scope.valid(victim)) {
                        // 踢飞：不是单纯击退，而是沿踢击方向把目标抛出去（水平抛远 + 抬离地面）。
                        const launch = direction.scale(launchAway).plus(WorldCombat.point(0, launchUp, 0));
                        scope.displace(victim, launch);
                        WorldFeedback.emit(scope, rollingkickScene, 1, at,
                            { moment: "launch", target: String(victim.ref()), direction: [direction.x(), launchUp, direction.z()],
                                sparkles: Math.round(8 + launchAway * 4) }, 22);
                        WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.2, 0)), rollingkickHitText, [], 22);
                        WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 0.95, 0)), rollingkickLaunchText, [Math.round(launchAway * 10) / 10], 22);
                        sound(current, "cobblemon:impact.fighting");
                        if (scope.random() < chance && rollingkickFlinch(scope, victim, flinchTicks)) {
                            WorldFeedback.emit(scope, rollingkickScene, 1, at, { moment: "flinch", target: String(victim.ref()) }, 20);
                            WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.4, 0)), rollingkickFlinchText, [], 20);
                        }
                    } else {
                        sound(current, "minecraft:entity.player.attack.nodamage");
                    }
                    finish(current);
                    return;
                }
                const moved = scope.displace(current.actor(), delta);
                travelled += moved;
                if (hit.blocked() || moved < p(rollingkickId, "minimumMove", current) || travelled >= length) {
                    whiff(current, origin);
                    return;
                }
                current.after(1, advance);
            }

            advance(action);
        }
    });

}
