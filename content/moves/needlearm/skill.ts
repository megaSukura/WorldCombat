/**
 * 尖刺臂 / needlearm —— 注册与动作。
 *
 * 核心念头：压低身子扑上一步，带刺的手臂猛烈横扫目标；被扫中的人挨一记接触伤害、有概率一滞，
 *   而那些甩出去的尖刺插进周围的地面，留下一小片会反复扎人的荆棘地——打完之后，那块地还在替它施压。
 *
 * 三幕：
 *   起（windup，提交前）：压低身子、把刺拢到臂上，只播预告，可被打断。
 *   挥（drive → rake / whiff）：提交后沿瞄准方向逐刻扑上；trace 撞上活体即结算 `rake` 接触伤害、
 *       按 `flinchChance` 掷畏缩，并把尖刺甩到目标脚下扎出一片 `briarRadius` 的荆棘地。扑完距离没碰到人则挥空。
 *   刺（briar）：荆棘地存续 `briarTicks`；贴地的非友方站在里面每隔 `briarInterval` 被扎一次 `briar` 并绊慢。
 *
 * 畏缩：施加本单元声明的 MobEffect（共享身份 `world_combat:status/flinch`，只借身份、行为自写）并投递
 * `world_combat:interrupt`；下方门禁在窗口内拒绝新动作，伤害阶段不受影响。
 *
 * 配置 `briar`（荆棘式）由 resolve 改时序、由公式改挥击/荆棘，提交后才触碰世界。
 */
namespace PokemonSkills {
    function needlearmFlinch(world: CombatWorld, target: CombatActor, ticks: number): boolean {
        if (MobEffects.apply(world, target, needlearmFlinchEffect, ticks, 0) === null) return false;
        world.deliver(target, "world_combat:interrupt");
        return true;
    }

    function needlearmPoint(field: WorldEffects.Field): CombatPoint {
        return WorldCombat.point(field.position[0], field.position[1], field.position[2]);
    }
    /** 一片荆棘：贴地的非友方站在里面每隔 interval 被扎一次，并被绊慢一段。 */
    WorldEffects.fieldRule(needlearmRule, {
        stay: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            const body = world.observe(actor);
            if (body === null || !body.grounded()) return;
            const ref = String(actor.ref()), next = field.data.next || (field.data.next = {}), now = world.tick();
            if (now < (next[ref] || 0)) return;
            next[ref] = now + Math.max(10, Math.round(Number(field.data.interval) || 24));
            const power = Math.max(0, Number(field.data.power) || 0);
            if (!hurt(world, actor, needlearmId, power, { damage: damageSpec(needlearmId, "briar") })) return;
            const slow = Math.max(20, 2 * Math.round(Number(field.data.interval) || 24));
            MobEffects.apply(world, actor, "minecraft:slowness", slow, 0);
            WorldFeedback.emit(world, needlearmScene, 1, body.position(),
                { moment: "prick", target: ref, thorns: Math.max(6, Math.round(power * 1.2)), scale: field.radius / needlearmReference }, 20);
            world.sound("cobblemon:impact.grass", body.position(), 12, "{}");
            const seen = field.data.seen || (field.data.seen = {});
            if (seen[ref] !== true) {
                seen[ref] = true;
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.05, 0)), needlearmPrickText, [], 22);
            }
        },
        scan: function (effect: CombatEffect, world: CombatWorld, field: WorldEffects.Field): void {
            WorldFeedback.keep(world, "needlearm:hum:" + effect.id(), needlearmScene, 1, needlearmPoint(field),
                { moment: "hum", radius: field.radius, thorns: Math.max(10, Math.round(Number(field.data.thorns) || 22)),
                    scale: field.radius / needlearmReference }, 40);
        }
    });

    define({
        id: needlearmId,
        name: "Needle Arm",
        description: "The user attacks by wildly swinging its thorny arms. This may also make the target flinch.",
        uses: ["贴身挥扫并在地上留下一片会扎人的荆棘", "把一块地面封住、逼对手绕路", "拖住想从身边跑开的目标"],
        kind: "enemy",
        range: 2.6,
        maxRange: 3.8,
        prepare: 6,
        active: 18,
        recover: 7,
        cooldown: 20,
        style: "grass",
        defaults: { briar: false, ai: { maxChase: 7, seed: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(needlearmId, "grip", pokemon) * 1.6, geometry: "line", style: "grass", color: 0x8FC63A,
                label: config && config.briar === true ? "荆棘式尖刺臂" : "尖刺臂" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[needlearmId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(needlearmId, "tempo", context)),
                recover: Math.round(p(needlearmId, "aftercast", context)),
                cooldown: Math.round(p(needlearmId, "recharge", context)),
                active: 18,
                range: p(needlearmId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("needlearm:coil", needlearmScene, 1, action.origin(),
                JSON.stringify({ moment: "coil", briar: config && config.briar === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const direction = aim(action);
            const length = p(needlearmId, "reach", action);
            const speed = p(needlearmId, "swing", action);
            const grip = p(needlearmId, "grip", action);
            const power = p(needlearmId, "rake", action);
            const chance = p(needlearmId, "flinchChance", action);
            const flinchTicks = Math.round(p(needlearmId, "flinchTicks", action));
            const briarRadius = p(needlearmId, "briarRadius", action);
            const briarTicks = Math.max(60, Math.round(p(needlearmId, "briarTicks", action)));
            const briarPower = p(needlearmId, "briarPower", action);
            const briarInterval = Math.max(10, Math.round(p(needlearmId, "briarInterval", action)));
            const thorns = Math.max(12, Math.round(p(needlearmId, "thorns", action)));
            const scale = Math.max(0.6, Math.min(2.0, briarRadius / needlearmReference));
            const intensity = Math.max(0.6, Math.min(2.2, power / 70));
            let travelled = 0, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            function whiff(current: CombatAction, at: CombatPoint): void {
                const scope = current.world();
                WorldFeedback.emit(scope, needlearmScene, 1, at, { moment: "miss", scale: scale }, 18);
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.0, 0)), needlearmMissText, [], 20);
                sound(current, "minecraft:block.grass.break");
                finish(current);
            }

            sound(action, "cobblemon:move.razorleaf.actor_1");
            // 扑（drive）：带刺手臂拢着叶与刺向前压上；emitter 绑 source，随扑出的身形铺开。
            WorldFeedback.keep(world, "needlearm:drive:" + action.id(), needlearmScene, 1, action.origin(),
                { moment: "drive", thorns: thorns, scale: scale, intensity: intensity }, 30);

            function advance(current: CombatAction): void {
                const scope = current.world();
                const origin = current.origin();
                const step = Math.min(speed, Math.max(0, length - travelled));
                if (step <= 0.001) { whiff(current, origin); return; }
                const delta = direction.scale(step);
                const hit = current.trace(origin, origin.plus(delta.scale(p(needlearmId, "traceAhead", current))), grip);
                if (hit.hitEntity()) {
                    const victim = hit.target(), at = hit.position();
                    const landed = victim !== null && impact(current, hit, needlearmId, power,
                        { damage: damageSpec(needlearmId, "rake"), contact: true });
                    WorldFeedback.emit(scope, needlearmScene, 1, at,
                        { moment: "rake", target: victim ? String(victim.ref()) : "", thorns: thorns, scale: scale, intensity: intensity }, 24);
                    if (landed && victim !== null && scope.valid(victim)) {
                        WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.15, 0)), needlearmHitText, [thorns], 22);
                        sound(current, "cobblemon:impact.grass");
                        if (scope.random() < chance && needlearmFlinch(scope, victim, flinchTicks)) {
                            WorldFeedback.emit(scope, needlearmScene, 1, at, { moment: "flinch", target: String(victim.ref()) }, 20);
                            WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.35, 0)), needlearmFlinchText, [], 20);
                        }
                        // 甩出去的尖刺插在目标周围的地面，留下一片会持续扎人的荆棘。
                        // 圈心放在命中目标的身体中心，这样高个子的目标也稳稳落在圈的判定范围内；
                        // 画面在表现层向下偏移，把荆棘画回地面。
                        const focus = scope.observe(victim);
                        const centre = focus === null ? at : focus.position();
                        WorldEffects.field(scope, needlearmRule, centre, briarRadius,
                            { power: briarPower, interval: briarInterval, thorns: thorns, next: {}, seen: {} }, briarTicks);
                        WorldFeedback.emit(scope, needlearmScene, 1, centre,
                            { moment: "briar", radius: briarRadius, thorns: thorns, scale: scale, burst: true }, 30);
                        WorldFeedback.text(scope, centre.plus(WorldCombat.point(0, 0.6, 0)), needlearmBriarText, [], 24);
                    } else {
                        sound(current, "minecraft:block.grass.break");
                    }
                    finish(current);
                    return;
                }
                const moved = scope.displace(current.actor(), delta);
                travelled += moved;
                if (hit.blocked() || moved < p(needlearmId, "minimumMove", current) || travelled >= length) {
                    whiff(current, origin);
                    return;
                }
                current.after(1, advance);
            }

            advance(action);
        }
    });

}
