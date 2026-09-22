/**
 * 火焰牙 / firefang 的出手方式。
 *
 * 核心念头：**咬穿护甲，把火种按进伤口**——牙齿先咬穿，火不是"有时点着"，而是连火属性的身体也挡不住。
 * 它是本族唯一的**穿透**招：命中掷出灼伤时先开一个免疫窗口，再无视属性/特性免疫点火；咬得够狠时那一口还会咬懵对手。
 *
 * 三幕：
 *   起（windup，提交前）：牙间燃起火种、火星四散，只播预告表现。
 *   咬（pounce → bite）：提交后沿瞄准方向扑出；trace 咬中即结算 fang 接触咬合，命中点炸开火色迸溅与獠牙剪影。
 *   灌（sear / flinch）：按 scorchChance 先 `NativeEffects.breakTypeImmunity` 开免疫窗口，再 `CombatStatus.inflict`
 *       点火（无视免疫）；按 flinchChance 掷畏缩，挂共享身份 `world_combat:status/flinch` 并投递 `world_combat:interrupt`。
 *
 * 配置 `sear`（焦焰式）由 resolve 改时序、由公式改威力／火种／窗口，提交后才触碰世界。
 */
namespace PokemonSkills {
    const firefangScene = "world_combat:move_firefang";
    const firefangFlinchEffect = "world_combat:firefang_flinch";
    const firefangHitText = "world_combat.move.firefang.text.hit";
    const firefangBurnText = "world_combat.move.firefang.text.burn";
    const firefangFlinchText = "world_combat.move.firefang.text.flinch";
    const firefangMissText = "world_combat.move.firefang.text.miss";

    function firefangFlinch(world: CombatWorld, target: CombatActor, ticks: number): boolean {
        if (MobEffects.apply(world, target, firefangFlinchEffect, ticks, 0) === null) return false;
        world.deliver(target, "world_combat:interrupt");
        return true;
    }

    define({
        id: "firefang",
        name: "Fire Fang",
        description: "The user bites with flame-cloaked fangs. The bite pierces through and burns even a body that would normally shrug fire off, and may leave the target flinching.",
        uses: ["贴身咬一口并按几率点着目标", "把火种烧进火属性/免疫特性的身体", "咬懵对手，打断它正在做的事"],
        kind: "enemy",
        range: 2.3,
        maxRange: 3.6,
        prepare: 5,
        active: 24,
        recover: 6,
        cooldown: 16,
        style: "bite",
        defaults: { sear: false, ai: { maxChase: 8, seekUnlit: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: (pokemon ? p("firefang", "grip", pokemon) : 0.42) * 1.5, geometry: "line", style: "bite",
                color: 0xE2531B, label: config && config.sear === true ? "焦焰式" : "火焰牙" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["firefang"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.max(3, Math.round(p("firefang", "tempo", context))),
                recover: Math.max(3, Math.round(p("firefang", "aftercast", context))),
                cooldown: Math.max(9, Math.round(p("firefang", "recharge", context))),
                active: skills["firefang"].active,
                range: p("firefang", "reach", context) + 0.4
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:firefang:windup", firefangScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", sear: config && config.sear === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const direction = aim(action);
            const length = p("firefang", "reach", action);
            const step = p("firefang", "lunge", action);
            const radius = p("firefang", "grip", action);
            const power = p("firefang", "fang", action);
            const burnChance = Math.max(0.02, Math.min(0.95, p("firefang", "scorchChance", action)));
            const burnTicks = Math.max(60, Math.round(p("firefang", "scorchTicks", action)));
            const pierceTicks = Math.max(20, Math.round(p("firefang", "pierceTicks", action)));
            const chance = Math.max(0.02, Math.min(0.9, p("firefang", "flinchChance", action)));
            const flinchTicks = Math.max(6, Math.round(p("firefang", "flinchTicks", action)));
            const embers = Math.max(5, Math.round(p("firefang", "embers", action)));
            const scale = radius / 0.42;
            const intensity = Math.max(0.5, Math.min(2.3, power / 66));
            let travelled = 0, settled = false;

            WorldFeedback.emit(world, firefangScene, 1, action.origin(),
                { moment: "pounce", direction: [direction.x(), direction.y(), direction.z()], scale: scale, intensity: intensity }, 24);
            sound(action, "minecraft:entity.fox.bite");

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            function whiff(current: CombatAction, at: CombatPoint): void {
                const scope = current.world();
                WorldFeedback.emit(scope, firefangScene, 1, at, { moment: "miss", scale: scale }, 18);
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.1, 0)), firefangMissText, [], 20);
                sound(current, "minecraft:entity.player.attack.sweep");
                finish(current);
            }

            function latch(current: CombatAction, victim: CombatActor, at: CombatPoint, contact: CombatImpact): void {
                const scope = current.world();
                const victimRef = String(victim.ref());
                const landed = impact(current, contact, "firefang", power,
                    { damage: damageSpec("firefang", "fang"), contact: true, bite: true });
                WorldFeedback.emit(scope, firefangScene, 1, at,
                    { moment: "bite", target: victimRef, embers: embers, scale: scale, intensity: intensity }, 24);
                sound(current, "cobblemon:impact.fire");
                if (!landed || !scope.valid(victim)) { finish(current); return; }
                // 牙齿先咬穿：开一个免疫窗口，再无视属性/特性免疫把火种按进伤口。
                if (scope.random() < burnChance) {
                    NativeEffects.breakTypeImmunity(scope, victim, pierceTicks);
                    const burned = CombatStatus.inflict(scope, victim, "burn", burnTicks, 0, { secondary: true, ignoreAbility: true });
                    if (burned) {
                        scope.ignite(victim, Math.max(20, Math.min(60, Math.round(burnTicks * 0.2))));
                        WorldFeedback.emit(scope, firefangScene, 1, at,
                            { moment: "sear", target: victimRef, embers: embers, scale: scale, intensity: intensity, pierce: 1 }, 26);
                        WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.2, 0)), firefangBurnText, [], 24);
                        sound(current, "minecraft:entity.blaze.burn");
                    }
                }
                if (scope.valid(victim) && scope.random() < chance && firefangFlinch(scope, victim, flinchTicks)) {
                    WorldFeedback.emit(scope, firefangScene, 1, at, { moment: "flinch", target: victimRef, scale: scale }, 22);
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.35, 0)), firefangFlinchText, [], 22);
                }
                finish(current);
            }

            function advance(current: CombatAction): void {
                const scope = current.world();
                const origin = current.origin();
                const remaining = length - travelled;
                const delta = direction.scale(Math.min(step, Math.max(0, remaining)));
                if (remaining <= 0.001) { whiff(current, origin); return; }
                const hit = current.trace(origin, origin.plus(delta.scale(p("firefang", "traceAhead", current))), radius);
                if (hit.hitEntity()) {
                    const target = hit.target();
                    if (target !== null && scope.valid(target) && !scope.friendly(target)) { latch(current, target, hit.position(), hit); return; }
                }
                const moved = scope.displace(current.actor(), delta);
                travelled += moved;
                if (hit.blocked() || moved < p("firefang", "minimumMove", current) || travelled >= length) { whiff(current, origin); return; }
                current.after(1, advance);
            }

            advance(action);
        }
    });

}
