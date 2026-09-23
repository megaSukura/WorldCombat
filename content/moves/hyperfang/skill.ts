/**
 * 必杀门牙 / hyperfang 的出手方式。
 *
 * 核心念头：扑上去一口咬死，牙齿不松、身体左右猛甩——那一甩把猎物从站位里晃出来，并按体重把它定住一小会儿；
 * 甩得够狠就把它彻底甩懵。它是全族单口直接伤害最高的一招，代价是没有持久削弱。
 *
 * 三幕：
 *   起（windup，提交前）：兽首张大、门牙泛出白光，只播预告表现。
 *   咬（pounce → bite）：提交后沿瞄准方向扑出，trace 咬中即结算 `fang`；命中处炸开骨白牙影与迸溅。
 *   甩（shake → stun）：咬住后沿侧面猛甩 `shove` 格并把目标钉住 `pinTicks`；按 `flinchChance` 掷畏缩，
 *       甩懵则挂共享身份 `world_combat:status/flinch` 并投递 `world_combat:interrupt` 把它此刻那一手按停。
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
        kind: "enemy",
        range: 2.0,
        maxRange: 3.6,
        prepare: 5,
        active: 30,
        recover: 7,
        cooldown: 18,
        style: "bite",
        defaults: { shake: false, ai: { maxChase: 6, press: true } },
        fields: [],
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
                // 牙齿不松、左右猛甩：把目标沿侧面晃开，并按体重钉住。
                const side = WorldCombat.point(-direction.z(), 0, direction.x());
                const sign = scope.random() < 0.5 ? -1 : 1;
                scope.displace(victim, side.scale(shove * sign));
                WorldEffects.apply(scope, victim, "rooted", {}, pin);
                WorldFeedback.emit(scope, hyperfangScene, 1, at,
                    { moment: "shake", target: victimRef, pin: pin, sparks: Math.round(12 + shove * 40),
                        direction: [direction.x(), direction.y(), direction.z()], scale: scale }, 24);
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.2, 0)), hyperfangLatchText, [], 22);
                sound(current, "minecraft:entity.iron_golem.attack");
                if (scope.random() < chance && hyperfangFlinch(scope, victim, flinchTicks)) {
                    WorldFeedback.emit(scope, hyperfangScene, 1, at,
                        { moment: "stun", target: victimRef, stun: flinchTicks, scale: scale }, 26);
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.45, 0)), hyperfangStunText, [], 26);
                    sound(current, "cobblemon:impact.normal");
                }
                finish(current);
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
