/**
 * 冰冻牙 / icefang 的出手方式。
 *
 * 核心念头：**一口咬住，冷气慢慢渗进关节**——咬合本身不高，寒气要隔一拍才在伤口里发作，掷出时把目标冻在原地；
 * 而对已经冻住的目标，冰壳让皮肉发脆，这一口会多咬碎一段。它是本族里唯一**收冻结残局**的牙。
 *
 * 三幕：
 *   起（windup，提交前）：牙间凝起冷霜、地面结一圈霜，只播预告表现。
 *   咬（pounce → bite）：提交后沿瞄准方向扑出；trace 咬中即结算 fang 接触咬合；若目标已被冻住，追加一段 `shatter`
 *       冷脆伤害。命中点炸开冰色迸溅与獠牙剪影，并按 flinchChance 掷畏缩。
 *   冻（freeze）：咬中后隔 `frostDelay` 刻，冷气在伤口里发作，按 freezeChance 施加共享身份
 *       `world_combat:status/frozen`（宝可梦同步为原生冰冻）。
 *
 * 配置 `deep`（深寒式）由 resolve 改时序、由公式改威力／冻期／冷脆，提交后才触碰世界。
 */
namespace PokemonSkills {
    const icefangScene = "world_combat:move_icefang";
    const icefangFlinchEffect = "world_combat:icefang_flinch";
    const icefangHitText = "world_combat.move.icefang.text.hit";
    const icefangShatterText = "world_combat.move.icefang.text.shatter";
    const icefangFreezeText = "world_combat.move.icefang.text.freeze";
    const icefangImmuneText = "world_combat.move.icefang.text.immune";
    const icefangFlinchText = "world_combat.move.icefang.text.flinch";
    const icefangMissText = "world_combat.move.icefang.text.miss";

    function icefangFlinch(world: CombatWorld, target: CombatActor, ticks: number): boolean {
        if (MobEffects.apply(world, target, icefangFlinchEffect, ticks, 0) === null) return false;
        world.deliver(target, "world_combat:interrupt");
        return true;
    }

    define({
        freeMovement: true,
        id: "icefang",
        cooldownParameter: "recharge",
        name: "Ice Fang",
        description: "一口咬住、把冷气渗进关节：命中造成咬合伤害，隔一拍后寒气在伤口里发作，按几率把目标冻住；对已经冻住的目标，冰壳发脆、会多咬碎一段，命中还可能把对手咬懵并打断它正在做的事。深寒式冻得更久，急寒式咬得更重。",
        uses: ["贴身咬一口并按几率冻住目标", "咬碎已经被冻住的目标", "咬懵对手，打断它正在做的事"],
        kind: "enemy",
        range: 2.4,
        maxRange: 3.7,
        prepare: 6,
        active: 26,
        recover: 6,
        cooldown: 17,
        style: "bite",
        defaults: { deep: false, ai: { maxChase: 8, finishFrozen: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: (pokemon ? p("icefang", "grip", pokemon) : 0.42) * 1.5, geometry: "line", style: "bite",
                color: 0x8FD8F0, label: config && config.deep === true ? "深寒式" : "冰冻牙" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["icefang"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.max(3, Math.round(p("icefang", "tempo", context))),
                recover: Math.max(3, Math.round(p("icefang", "aftercast", context))),
                cooldown: Math.max(10, Math.round(p("icefang", "recharge", context))),
                active: skills["icefang"].active,
                range: p("icefang", "reach", context) + 0.4
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:icefang:windup", icefangScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", deep: config && config.deep === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const direction = aim(action);
            const length = p("icefang", "reach", action);
            const step = p("icefang", "lunge", action);
            const radius = p("icefang", "grip", action);
            const power = p("icefang", "fang", action);
            const brittle = p("icefang", "shatter", action);
            const freezeChance = Math.max(0.02, Math.min(0.95, p("icefang", "freezeChance", action)));
            const freezeTicks = Math.max(40, Math.round(p("icefang", "freezeTicks", action)));
            const frost = Math.max(2, Math.round(p("icefang", "frostDelay", action)));
            const chance = Math.max(0.02, Math.min(0.9, p("icefang", "flinchChance", action)));
            const flinchTicks = Math.max(6, Math.round(p("icefang", "flinchTicks", action)));
            const shards = Math.max(5, Math.round(p("icefang", "shards", action)));
            const scale = radius / 0.42;
            const intensity = Math.max(0.5, Math.min(2.3, power / 66));
            let travelled = 0, settled = false;

            WorldFeedback.emit(world, icefangScene, 1, action.origin(),
                { moment: "pounce", direction: [direction.x(), direction.y(), direction.z()], scale: scale, intensity: intensity }, 24);
            sound(action, "minecraft:entity.fox.bite");

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            function whiff(current: CombatAction, at: CombatPoint): void {
                const scope = current.world();
                WorldFeedback.emit(scope, icefangScene, 1, at, { moment: "miss", scale: scale }, 18);
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.1, 0)), icefangMissText, [], 20);
                sound(current, "minecraft:entity.player.attack.sweep");
                finish(current);
            }

            /** 冷气渗进伤口：隔一拍才发作，掷出则冻住目标（共享身份 frozen，宝可梦同步为原生冰冻）。 */
            function freeze(current: CombatAction, victimRef: string, at: CombatPoint): void {
                const scope = current.world();
                const victim = scope.actor(victimRef);
                if (victim === null || !scope.valid(victim)) { finish(current); return; }
                const body = scope.observe(victim);
                const here = body === null ? at : body.position();
                if (scope.random() < freezeChance) {
                    const frozen = CombatStatus.inflict(scope, victim, "frozen", freezeTicks);
                    WorldFeedback.emit(scope, icefangScene, 1, here,
                        { moment: "freeze", target: victimRef, shards: shards, scale: scale, intensity: intensity }, 26);
                    WorldFeedback.text(scope, here.plus(WorldCombat.point(0, 1.2, 0)), frozen ? icefangFreezeText : icefangImmuneText, [], 24);
                    if (frozen) {
                        sound(current, "minecraft:block.glass.break");
                        sound(current, "minecraft:entity.player.hurt_freeze");
                    }
                }
                finish(current);
            }

            function latch(current: CombatAction, victim: CombatActor, at: CombatPoint, contact: CombatImpact): void {
                const scope = current.world();
                const victimRef = String(victim.ref());
                const landed = impact(current, contact, "icefang", power,
                    { damage: damageSpec("icefang", "fang"), contact: true, bite: true });
                WorldFeedback.emit(scope, icefangScene, 1, at,
                    { moment: "bite", target: victimRef, shards: shards, scale: scale, intensity: intensity }, 24);
                sound(current, "cobblemon:impact.ice");
                if (!landed || !scope.valid(victim)) { finish(current); return; }
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.2, 0)), icefangHitText, [], 22);
                // 冷脆：已经冻住的皮肉发脆，这一口多咬碎一段。
                if (CombatStatus.has(scope, victim, "frozen")) {
                    hurt(current, victim, "icefang", brittle, { damage: damageSpec("icefang", "shatter"), contact: true, bite: true });
                    WorldFeedback.emit(scope, icefangScene, 1, at,
                        { moment: "shatter", target: victimRef, shards: Math.round(shards * 0.7), scale: scale, intensity: intensity }, 22);
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.3, 0)), icefangShatterText, [], 22);
                    sound(current, "minecraft:block.powder_snow.break");
                }
                if (scope.valid(victim) && scope.random() < chance && icefangFlinch(scope, victim, flinchTicks)) {
                    WorldFeedback.emit(scope, icefangScene, 1, at, { moment: "flinch", target: victimRef, scale: scale }, 22);
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.35, 0)), icefangFlinchText, [], 22);
                }
                if (scope.valid(victim)) current.after(frost, function (next: CombatAction) { freeze(next, victimRef, at); });
                else finish(current);
            }

            function advance(current: CombatAction): void {
                const scope = current.world();
                const origin = current.origin();
                const remaining = length - travelled;
                const delta = direction.scale(Math.min(step, Math.max(0, remaining)));
                if (remaining <= 0.001) { whiff(current, origin); return; }
                const hit = current.trace(origin, origin.plus(delta.scale(p("icefang", "traceAhead", current))), radius);
                if (hit.hitEntity()) {
                    const target = hit.target();
                    if (target !== null && scope.valid(target) && !scope.friendly(target)) { latch(current, target, hit.position(), hit); return; }
                }
                const moved = scope.displace(current.actor(), delta);
                travelled += moved;
                if (hit.blocked() || moved < p("icefang", "minimumMove", current) || travelled >= length) { whiff(current, origin); return; }
                current.after(1, advance);
            }

            advance(action);
        }
    });

}
