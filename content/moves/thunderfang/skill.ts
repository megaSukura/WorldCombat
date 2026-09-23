/**
 * 雷电牙 / thunderfang 的出手方式。
 *
 * 核心念头：**一记最快的扑咬，让电流从牙齿穿身**——本族里出手最快、扑得最远的一口；命中按几率把目标麻住。
 * 独有部分在**电锁**：咬的是一具已经麻了的身体时，抽搐的肌肉被电流锁住，目标被短暂定在原地。
 *
 * 三幕：
 *   起（windup，提交前）：牙间窜起电光、脚边发亮，只播预告表现。
 *   咬（pounce → bite）：提交后沿瞄准方向快速扑出；trace 咬中即结算 fang 接触咬合，命中点炸开电色迸溅与獠牙剪影；
 *       按 numbChance 施加共享身份 `world_combat:status/paralysis`，并按 flinchChance 掷畏缩。
 *   锁（lock）：若咬中时目标已经完全麻痹，电流锁住它 `lockTicks`，把它定在原地（`world_combat:rooted`）。
 *
 * 配置 `overload`（过载式）由 resolve 改时序、由公式改威力／麻痹／电锁，提交后才触碰世界。
 */
namespace PokemonSkills {
    const thunderfangScene = "world_combat:move_thunderfang";
    const thunderfangFlinchEffect = "world_combat:thunderfang_flinch";
    const thunderfangHitText = "world_combat.move.thunderfang.text.hit";
    const thunderfangNumbText = "world_combat.move.thunderfang.text.numb";
    const thunderfangLockText = "world_combat.move.thunderfang.text.lock";
    const thunderfangFlinchText = "world_combat.move.thunderfang.text.flinch";
    const thunderfangMissText = "world_combat.move.thunderfang.text.miss";

    function thunderfangFlinch(world: CombatWorld, target: CombatActor, ticks: number): boolean {
        if (MobEffects.apply(world, target, thunderfangFlinchEffect, ticks, 0) === null) return false;
        world.deliver(target, "world_combat:interrupt");
        return true;
    }

    define({
        freeMovement: true,
        id: "thunderfang",
        cooldownParameter: "recharge",
        name: "Thunder Fang",
        description: "咬击目标，有机会使其麻痹或畏缩。咬中已麻痹的目标时会短暂将其定住。",
        uses: ["用最快的扑咬起手", "按几率把目标麻住", "把已经麻掉的目标电锁在原地"],
        kind: "enemy",
        range: 2.5,
        maxRange: 3.8,
        prepare: 4,
        active: 22,
        recover: 5,
        cooldown: 15,
        style: "bite",
        defaults: { overload: false, ai: { maxChase: 9, lockParalyzed: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: (pokemon ? p("thunderfang", "grip", pokemon) : 0.42) * 1.5, geometry: "line", style: "bite",
                color: 0xE8D24A, label: config && config.overload === true ? "过载式" : "雷电牙" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["thunderfang"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.max(2, Math.round(p("thunderfang", "tempo", context))),
                recover: Math.max(3, Math.round(p("thunderfang", "aftercast", context))),
                cooldown: Math.max(8, Math.round(p("thunderfang", "recharge", context))),
                active: skills["thunderfang"].active,
                range: p("thunderfang", "reach", context) + 0.4
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:thunderfang:windup", thunderfangScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", overload: config && config.overload === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const direction = aim(action);
            const length = p("thunderfang", "reach", action);
            const step = p("thunderfang", "lunge", action);
            const radius = p("thunderfang", "grip", action);
            const power = p("thunderfang", "fang", action);
            const numbChance = Math.max(0.02, Math.min(0.95, p("thunderfang", "numbChance", action)));
            const numbTicks = Math.max(60, Math.round(p("thunderfang", "numbTicks", action)));
            const lockTicks = Math.max(4, Math.round(p("thunderfang", "lockTicks", action)));
            const chance = Math.max(0.02, Math.min(0.9, p("thunderfang", "flinchChance", action)));
            const flinchTicks = Math.max(6, Math.round(p("thunderfang", "flinchTicks", action)));
            const sparks = Math.max(5, Math.round(p("thunderfang", "sparks", action)));
            const scale = radius / 0.42;
            const intensity = Math.max(0.5, Math.min(2.3, power / 65));
            let travelled = 0, settled = false;

            WorldFeedback.emit(world, thunderfangScene, 1, action.origin(),
                { moment: "pounce", direction: [direction.x(), direction.y(), direction.z()], scale: scale, intensity: intensity }, 22);
            sound(action, "minecraft:entity.fox.bite");

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            function whiff(current: CombatAction, at: CombatPoint): void {
                const scope = current.world();
                WorldFeedback.emit(scope, thunderfangScene, 1, at, { moment: "miss", scale: scale }, 18);
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.1, 0)), thunderfangMissText, [], 20);
                sound(current, "minecraft:entity.player.attack.sweep");
                finish(current);
            }

            function latch(current: CombatAction, victim: CombatActor, at: CombatPoint, contact: CombatImpact): void {
                const scope = current.world();
                const victimRef = String(victim.ref());
                const wasParalyzed = CombatStatus.has(scope, victim, "paralysis");
                const landed = impact(current, contact, "thunderfang", power,
                    { damage: damageSpec("thunderfang", "fang"), contact: true, bite: true });
                WorldFeedback.emit(scope, thunderfangScene, 1, at,
                    { moment: "bite", target: victimRef, sparks: sparks, scale: scale, intensity: intensity }, 22);
                sound(current, "cobblemon:impact.electric");
                if (!landed || !scope.valid(victim)) { finish(current); return; }
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.2, 0)), thunderfangHitText, [], 22);
                // 电锁：咬中一具已经麻了的身体时，抽搐的肌肉被电流锁住，原地定住一拍。
                if (wasParalyzed && scope.valid(victim)) {
                    WorldEffects.apply(scope, victim, "rooted", {}, lockTicks);
                    WorldFeedback.emit(scope, thunderfangScene, 1, at,
                        { moment: "lock", target: victimRef, sparks: sparks, scale: scale, intensity: intensity, lock: lockTicks }, 24);
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.3, 0)), thunderfangLockText, [], 24);
                    sound(current, "minecraft:item.trident.thunder");
                }
                if (scope.random() < numbChance && scope.valid(victim)) {
                    const numbed = CombatStatus.inflict(scope, victim, "paralysis", numbTicks, 0, { secondary: true });
                    if (numbed) {
                        WorldFeedback.emit(scope, thunderfangScene, 1, at,
                            { moment: "jolt", target: victimRef, sparks: Math.round(sparks * 0.7), scale: scale, intensity: intensity }, 24);
                        WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.45, 0)), thunderfangNumbText, [], 22);
                    }
                }
                if (scope.valid(victim) && scope.random() < chance && thunderfangFlinch(scope, victim, flinchTicks)) {
                    WorldFeedback.emit(scope, thunderfangScene, 1, at, { moment: "flinch", target: victimRef, scale: scale }, 22);
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.35, 0)), thunderfangFlinchText, [], 22);
                }
                finish(current);
            }

            function advance(current: CombatAction): void {
                const scope = current.world();
                const origin = current.origin();
                const remaining = length - travelled;
                const delta = direction.scale(Math.min(step, Math.max(0, remaining)));
                if (remaining <= 0.001) { whiff(current, origin); return; }
                const hit = current.trace(origin, origin.plus(delta.scale(p("thunderfang", "traceAhead", current))), radius);
                if (hit.hitEntity()) {
                    const target = hit.target();
                    if (target !== null && scope.valid(target) && !scope.friendly(target)) { latch(current, target, hit.position(), hit); return; }
                }
                const moved = scope.displace(current.actor(), delta);
                travelled += moved;
                if (hit.blocked() || moved < p("thunderfang", "minimumMove", current) || travelled >= length) { whiff(current, origin); return; }
                current.after(1, advance);
            }

            advance(action);
        }
    });

}
