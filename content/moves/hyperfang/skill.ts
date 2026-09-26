/**
 * 必杀门牙 / hyperfang 的出手方式。
 *
 * 核心念头：扑上去一口咬死，牙齿不松、身体左右猛甩——那一甩把猎物从站位里晃出来，并按体重把它定住一小会儿；
 * 甩得够狠就把它彻底甩懵。它是全族单口直接伤害最高的一招，代价是没有持久削弱。
 *
 * 三幕：
 *   起（windup，提交前）：兽首张大、门牙泛出白光，只播预告表现。
 *   咬（pounce → bite）：提交后沿瞄准方向扑出，trace 咬中即结算 `fang`；命中处炸开骨白牙影与迸溅。
 *   甩（shake → stun）：咬住后按**配置里明确的左／右偏好**、相对释放方向沿选定侧分 3 刻小步甩到总 `shove` 格，
 *       受阻即停；按体重把目标钉住 `pinTicks`；每刻只有真实位移才画出甩线（`actual` 距离），免位移目标只留咬痕。
 *       甩完按 `flinchChance` 掷畏缩，甩懵则挂共享身份 `world_combat:status/flinch` 并投递 `world_combat:interrupt`。
 *
 * 与同族分开：咬住把人拽近、咬碎研磨压塌护甲、愤怒门牙削掉一半生命、贝壳刃横扫削甲；
 * 只有必杀门牙钳住钉住并猛甩，追求单口最重与一次震慑。
 */
namespace PokemonSkills {
    const hyperfangScene = "world_combat:move_hyperfang";
    const hyperfangFlinchEffect = "world_combat:hyperfang_flinch";
    const hyperfangLatchText = "world_combat.move.hyperfang.text.latch";
    const hyperfangStunText = "world_combat.move.hyperfang.text.stun";
    const hyperfangMissText = "world_combat.move.hyperfang.text.miss";

    function hyperfangFlinch(world: CombatWorld, target: CombatActor, ticks: number): boolean {
        if (MobEffects.apply(world, target, hyperfangFlinchEffect, ticks, 0) === null) return false;
        world.deliver(target, "world_combat:interrupt");
        return true;
    }

    define({
        freeMovement: true,
        id: "hyperfang",
        cooldownParameter: "recharge",
        name: "Hyper Fang",
        description: "扑上去一口咬死，牙齿不松、左右猛甩：这一口是全族最重的直接伤害，甩出的侧向位移把目标从站位里晃开，并按体重把它钉住一小会儿；甩得够狠就把它甩懵，打断它正在做的事。代价是没有持久削弱。",
        uses: ["用全族最重的单口直接伤害咬实", "咬住猛甩，把目标钉住一会儿", "甩懵对手，打断它正在做的事"],
        kind: "aim",
        range: 2.0,
        maxRange: 3.6,
        prepare: 5,
        active: 30,
        recover: 7,
        cooldown: 18,
        style: "bite",
        defaults: { shake: false, side: "right", ai: { maxChase: 6, press: true, clearLine: true } },
        fields: [choice("side", "甩出方向", ["right", "left"], ["向右", "向左"])],
        indicator: function (config, pokemon) {
            return { radius: (pokemon ? p("hyperfang", "grip", pokemon) : 0.45) * 1.5, geometry: "line", style: "bite",
                color: 0xE8DCC8, label: config && config.shake === true ? "摆甩式" : "钳咬式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["hyperfang"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.max(3, Math.round(p("hyperfang", "tempo", context))),
                recover: Math.max(3, Math.round(p("hyperfang", "aftercast", context))),
                cooldown: Math.max(11, Math.round(p("hyperfang", "recharge", context))),
                active: skills["hyperfang"].active,
                range: p("hyperfang", "reach", context) + 0.4
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:hyperfang:maw", hyperfangScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", shake: config && config.shake === true, windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const movementScenes = WorldFeedback.actionScenes(hyperfangScene);
            const world = action.world();
            const direction = aim(action);
            const length = p("hyperfang", "reach", action);
            const step = p("hyperfang", "lunge", action);
            const radius = p("hyperfang", "grip", action);
            const power = p("hyperfang", "fang", action);
            const pin = Math.max(1, Math.round(p("hyperfang", "pinTicks", action)));
            const shove = p("hyperfang", "shove", action);
            const chance = p("hyperfang", "flinchChance", action);
            const flinchTicks = Math.max(6, Math.round(p("hyperfang", "flinchTicks", action)));
            const scale = radius / 0.45;
            const intensity = Math.max(0.5, Math.min(2.3, power / 84));
            const morsels = Math.max(10, Math.round(power * 0.22));
            // 侧甩方向来自配置里明确的左／右偏好（默认右），相对本次释放方向；同一方向连续使用不会再随机换边。
            const sideSign = config && config.side === "left" ? -1 : 1;
            const flat = WorldGeometry.flatUnit(direction);
            const sideDir = WorldCombat.point(-flat.z() * sideSign, 0, flat.x() * sideSign);
            const whipSteps = 3;
            const perWhip = shove / whipSteps;
            let travelled = 0, settled = false;

            movementScenes.show(action, "pounce", action.origin(), { moment: "pounce", direction: [direction.x(), direction.y(), direction.z()], scale: scale });
            sound(action, "minecraft:entity.fox.bite");

            function finish(current: CombatAction): void { if (!settled) { settled = true; movementScenes.finish(current, done); } }

            function whiff(current: CombatAction, at: CombatPoint): void {
                const scope = current.world();
                WorldFeedback.emit(scope, hyperfangScene, 1, at, { moment: "miss", scale: scale }, 20);
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.1, 0)), hyperfangMissText, [], 20);
                sound(current, "minecraft:entity.player.attack.sweep");
                finish(current);
            }

            /** 甩完（或受阻停下）：按畏缩许可掷一次甩懵，然后收场。位移在甩步里已按真实 actual 结算。 */
            function afterWhip(current: CombatAction, victimRef: string, at: CombatPoint): void {
                const scope = current.world();
                const victim = scope.actor(victimRef);
                if (victim === null || !scope.valid(victim)) { finish(current); return; }
                const body = scope.observe(victim);
                const here = body === null ? at : body.position();
                if (scope.random() < chance && hyperfangFlinch(scope, victim, flinchTicks)) {
                    WorldFeedback.emit(scope, hyperfangScene, 1, here,
                        { moment: "stun", target: victimRef, stun: flinchTicks, scale: scale }, 26);
                    WorldFeedback.text(scope, here.plus(WorldCombat.point(0, 1.45, 0)), hyperfangStunText, [], 26);
                    sound(current, "cobblemon:impact.normal");
                }
                finish(current);
            }

            /** 分 3 刻把目标沿选定侧小步带到位；每刻只画真实发生的位移，受阻立即停。 */
            function whipStep(current: CombatAction, victimRef: string, at: CombatPoint, index: number): void {
                const scope = current.world();
                const victim = scope.actor(victimRef);
                if (victim === null || !scope.valid(victim)) { afterWhip(current, victimRef, at); return; }
                const before = scope.observe(victim);
                const from = before === null ? at : before.position();
                const actual = scope.displace(victim, sideDir.scale(perWhip));
                const after = scope.observe(victim);
                const to = after === null ? from.plus(sideDir.scale(actual)) : after.position();
                if (actual > 0.02) {
                    WorldFeedback.emit(scope, hyperfangScene, 1, from,
                        { moment: "shake", target: victimRef, pin: pin, sparks: Math.round(10 + perWhip * 36),
                            reach: Math.round(actual * 100) / 100, step: index + 1,
                            direction: [sideDir.x(), sideDir.y(), sideDir.z()],
                            path: [[from.x(), from.y() + 0.25, from.z()], [to.x(), to.y() + 0.25, to.z()]], scale: scale }, 20);
                }
                if (actual < perWhip * 0.25 || index + 1 >= whipSteps) { afterWhip(current, victimRef, at); return; }
                current.after(1, function (next: CombatAction) { whipStep(next, victimRef, at, index + 1); });
            }

            function latch(current: CombatAction, victim: CombatActor, at: CombatPoint, contact: CombatImpact): void {
                movementScenes.stop(current);
                const scope = current.world();
                const victimRef = String(victim.ref());
                const landed = impact(current, contact, "hyperfang", power,
                    { damage: damageSpec("hyperfang", "fang"), contact: true, bite: true });
                WorldFeedback.emit(scope, hyperfangScene, 1, at,
                    { moment: "bite", target: victimRef, morsels: morsels, scale: scale, intensity: intensity }, 24);
                sound(current, "cobblemon:move.hyperfang.target");
                if (!landed || !scope.valid(victim)) { finish(current); return; }
                // 牙齿不松：先按体重钉住，再沿选定侧逐步甩出；免位移的 Boss 仍吃这一口重咬。
                WorldEffects.apply(scope, victim, "rooted", {}, pin);
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.2, 0)), hyperfangLatchText, [], 22);
                sound(current, "minecraft:entity.iron_golem.attack");
                whipStep(current, victimRef, at, 0);
            }

            function advance(current: CombatAction): void {
                const scope = current.world();
                const origin = current.origin();
                const remaining = length - travelled;
                const delta = direction.scale(Math.min(step, Math.max(0, remaining)));
                if (remaining <= 0.001) { whiff(current, origin); return; }
                const swept = sweepStep(current, delta, radius), hit = swept.hit;
                if (hit.hitEntity()) {
                    const target = hit.target();
                    if (target !== null && scope.valid(target) && !scope.friendly(target)) { latch(current, target, hit.position(), hit); return; }
                }
                const moved = swept.moved + (hit.hitEntity() && swept.remaining.length() > 0.001 ? scope.displace(current.actor(), swept.remaining) : 0);
                travelled += moved;
                if (hit.blocked() || moved < p("hyperfang", "minimumMove", current) || travelled >= length) { whiff(current, origin); return; }
                current.after(1, advance);
            }

            advance(action);
        }
    });

}
