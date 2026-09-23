/**
 * 咬碎 / crunch 的出手方式。
 *
 * 核心念头：一口咬在护甲上，不是咬肉，是把护甲**压塌**。重、慢、可靠——这一口是整场战斗的破防开端，
 * 留一道缺口让别的招接着吃。
 *
 * 三幕：
 *   起（windup，提交前）：兽首低伏，牙间蓄起暗紫碎光，只播预告表现。
 *   咬（pounce → bite）：提交后沿瞄准方向扑出，trace 咬中即结算 `fang`；命中处炸开暗色迸溅与牙影。
 *   磨（grind → crack）：咬住不松，牙关研磨 `grindTicks`，结束时结算第二段 `chew` 并掷咬塌；
 *       咬塌则降防御、挂共享破防身份 `world_combat:status/guardbroken`，命中处补一圈压塌的碎屑环。
 *
 * 与同族分开：咬住把人拽近、必杀门牙钳住猛甩、愤怒门牙削掉一半生命；只有咬碎在命中后研磨并留下破防缺口。
 */
namespace PokemonSkills {
    const crunchScene = "world_combat:move_crunch";
    const crunchMark = "world_combat:crunch_cracked";
    const crunchLatchText = "world_combat.move.crunch.text.latch";
    const crunchCrushText = "world_combat.move.crunch.text.crush";
    const crunchMissText = "world_combat.move.crunch.text.miss";

    define({
        freeMovement: true,
        id: "crunch",
        cooldownParameter: "recharge",
        name: "Crunch",
        description: "扑上去一口咬住，牙关研磨把护甲压塌：咬实后隔一小会儿再嚼一记，磨完有机会让目标防御下降并留下一道破防缺口。獠牙的防御系数低于惯例，专啃硬壳；比咬住重、慢，却是可靠的破防开端。",
        uses: ["咬住研磨，把护甲压塌", "留下一道破防缺口给后续招吃", "用低防御系数的獠牙啃高防目标"],
        kind: "enemy",
        range: 2.1,
        maxRange: 3.8,
        prepare: 6,
        active: 52,
        recover: 7,
        cooldown: 20,
        style: "bite",
        defaults: { crush: false, ai: { maxChase: 8, openGuard: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: (pokemon ? p("crunch", "grip", pokemon) : 0.44) * 1.5, geometry: "line", style: "bite",
                color: 0x4E3C6E, label: config && config.crush === true ? "碾压式" : "疾咬式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["crunch"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.max(3, Math.round(p("crunch", "tempo", context))),
                recover: Math.max(3, Math.round(p("crunch", "aftercast", context))),
                cooldown: Math.max(12, Math.round(p("crunch", "recharge", context))),
                active: skills["crunch"].active,
                range: p("crunch", "reach", context) + 0.4
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:crunch:jaw", crunchScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", crush: config && config.crush === true, windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const direction = aim(action);
            const length = p("crunch", "reach", action);
            const step = p("crunch", "lunge", action);
            const radius = p("crunch", "grip", action);
            const power = p("crunch", "fang", action);
            const chance = p("crunch", "crushChance", action);
            const stages = Math.max(1, Math.round(p("crunch", "crushStages", action)));
            const grind = Math.max(1, Math.round(p("crunch", "grindTicks", action)));
            const crack = Math.max(40, Math.round(p("crunch", "crackTicks", action)));
            const chew = p("crunch", "chew", action);
            const scale = radius / 0.44;
            const intensity = Math.max(0.5, Math.min(2.2, power / 80));
            const morsels = Math.max(10, Math.round(power * 0.22));
            let travelled = 0, settled = false;

            WorldFeedback.emit(world, crunchScene, 1, action.origin(),
                { moment: "pounce", direction: [direction.x(), direction.y(), direction.z()], scale: scale, intensity: intensity }, 28);
            sound(action, "minecraft:entity.fox.bite");

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            function whiff(current: CombatAction, at: CombatPoint): void {
                const scope = current.world();
                WorldFeedback.emit(scope, crunchScene, 1, at, { moment: "miss", scale: scale }, 20);
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.1, 0)), crunchMissText, [], 20);
                sound(current, "minecraft:entity.player.attack.sweep");
                finish(current);
            }

            /** 研磨结束：第二段嚼碎伤害，随后掷咬塌，塌了就降防御并留下破防身份。 */
            function grindOut(current: CombatAction, victimRef: string, at: CombatPoint): void {
                const scope = current.world();
                const victim = scope.actor(victimRef);
                if (victim === null || !scope.valid(victim)) { finish(current); return; }
                const body = scope.observe(victim);
                const here = body === null ? at : body.position();
                hurt(current, victim, "crunch", chew, { damage: damageSpec("crunch", "chew"), contact: true, bite: true });
                sound(current, "minecraft:block.anvil.land");
                if (!scope.valid(victim)) { finish(current); return; }
                if (scope.random() < chance) {
                    NativeEffects.boost(scope, victim, "def", -stages);
                    MobEffects.apply(scope, victim, crunchMark, crack, 0);
                    WorldFeedback.emit(scope, crunchScene, 1, here,
                        { moment: "crack", target: victimRef, stages: stages, shards: Math.round(14 + stages * 12), scale: scale, intensity: intensity }, 28);
                    WorldFeedback.text(scope, here.plus(WorldCombat.point(0, 1.35, 0)), crunchCrushText, [stages], 30);
                    sound(current, "cobblemon:impact.dark");
                }
                finish(current);
            }

            function latch(current: CombatAction, victim: CombatActor, at: CombatPoint, contact: CombatImpact): void {
                const scope = current.world();
                const victimRef = String(victim.ref());
                const landed = impact(current, contact, "crunch", power,
                    { damage: damageSpec("crunch", "fang"), contact: true, bite: true });
                WorldFeedback.emit(scope, crunchScene, 1, at,
                    { moment: "bite", target: victimRef, morsels: morsels, scale: scale, intensity: intensity }, 26);
                if (!landed || !scope.valid(victim)) { finish(current); return; }
                sound(current, "cobblemon:move.crunch.target");
                WorldFeedback.emit(scope, crunchScene, 1, at,
                    { moment: "grind", target: victimRef, grind: grind, morsels: Math.max(8, Math.round(morsels * 0.6)), scale: scale }, grind + 14);
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.2, 0)), crunchLatchText, [], 22);
                current.after(grind, function (next: CombatAction) { grindOut(next, victimRef, at); });
            }

            function advance(current: CombatAction): void {
                const scope = current.world();
                const origin = current.origin();
                const remaining = length - travelled;
                const delta = direction.scale(Math.min(step, Math.max(0, remaining)));
                if (remaining <= 0.001) { whiff(current, origin); return; }
                const hit = current.trace(origin, origin.plus(delta.scale(p("crunch", "traceAhead", current))), radius);
                if (hit.hitEntity()) {
                    const target = hit.target();
                    if (target !== null && scope.valid(target) && !scope.friendly(target)) { latch(current, target, hit.position(), hit); return; }
                }
                const moved = scope.displace(current.actor(), delta);
                travelled += moved;
                if (hit.blocked() || moved < p("crunch", "minimumMove", current) || travelled >= length) { whiff(current, origin); return; }
                current.after(1, advance);
            }

            advance(action);
        }
    });
}
