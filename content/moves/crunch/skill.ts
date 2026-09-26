/**
 * 咬碎 / crunch 的出手方式。
 *
 * 核心念头：一口咬在护甲上，不是咬肉，是把护甲**压塌**。重、慢、可靠——这一口是整场战斗的破防开端，
 * 留一道缺口让别的招接着吃。
 *
 * 三幕：
 *   起（windup，提交前）：兽首低伏，牙间蓄起暗紫碎光，只播预告表现。
 *   咬（pounce → bite）：提交后沿瞄准方向扑出，trace 咬中即结算 `fang`；命中处炸开暗色迸溅与牙影。
 *   磨（grind → crack / release）：咬住不松，牙关研磨 `grindTicks`。研磨期间每 2 刻复核**真实双方身体间隙与通视**：
 *       目标拉开、隔墙或失效就立即松口（release），不再隔空嚼伤；只有一直咬合到结束才结算第二段 `chew`。
 *       第二段真实造成伤害后才有机会咬塌：降防御、挂共享破防身份 `world_combat:status/guardbroken`，
 *       命中处补一圈压塌的碎屑环。第二段被免疫则既不降防也不留缺口。
 *
 * 与同族分开：咬住把人拽近、必杀门牙钳住猛甩、愤怒门牙削掉一半生命；只有咬碎在命中后研磨并留下破防缺口。
 */
namespace PokemonSkills {
    const crunchScene = "world_combat:move_crunch";
    const crunchMark = "world_combat:crunch_cracked";
    const crunchLatchText = "world_combat.move.crunch.text.latch";
    const crunchCrushText = "world_combat.move.crunch.text.crush";
    const crunchMissText = "world_combat.move.crunch.text.miss";
    const crunchReleaseText = "world_combat.move.crunch.text.release";

    /** 两个原生碰撞箱之间最短的真实间隙；分离越远值越大，贴住为 0。 */
    function crunchGap(first: CombatObservation, second: CombatObservation): number {
        const aMin = first.boundsMin(), aMax = first.boundsMax(), bMin = second.boundsMin(), bMax = second.boundsMax();
        const dx = Math.max(0, Math.max(bMin.x() - aMax.x(), aMin.x() - bMax.x()));
        const dy = Math.max(0, Math.max(bMin.y() - aMax.y(), aMin.y() - bMax.y()));
        const dz = Math.max(0, Math.max(bMin.z() - aMax.z(), aMin.z() - bMax.z()));
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    define({
        freeMovement: true,
        id: "crunch",
        cooldownParameter: "recharge",
        name: "Crunch",
        description: "扑上去一口咬住，牙关研磨把护甲压塌：咬实后隔一小会儿再嚼一记，磨完有机会让目标防御下降并留下一道破防缺口。獠牙的防御系数低于惯例，专啃硬壳；比咬住重、慢，却是可靠的破防开端。",
        uses: ["咬住研磨，把护甲压塌", "留下一道破防缺口给后续招吃", "用低防御系数的獠牙啃高防目标"],
        kind: "aim",
        range: 2.1,
        maxRange: 3.8,
        prepare: 6,
        active: 52,
        recover: 7,
        cooldown: 20,
        style: "bite",
        defaults: { crush: false, ai: { maxChase: 8, openGuard: true, hardShell: true } },
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
            const movementScenes = WorldFeedback.actionScenes(crunchScene);
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

            movementScenes.show(action, "pounce", action.origin(), { moment: "pounce", direction: [direction.x(), direction.y(), direction.z()], scale: scale, intensity: intensity });
            sound(action, "minecraft:entity.fox.bite");

            function finish(current: CombatAction): void { if (!settled) { settled = true; movementScenes.finish(current, done); } }

            function whiff(current: CombatAction, at: CombatPoint): void {
                const scope = current.world();
                WorldFeedback.emit(scope, crunchScene, 1, at, { moment: "miss", scale: scale }, 20);
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.1, 0)), crunchMissText, [], 20);
                sound(current, "minecraft:entity.player.attack.sweep");
                finish(current);
            }

            /** 咬合保持阈值：獠牙判定半径再加上真实碰撞箱间允许的空隙，身体还在这圈内才算仍在咬。 */
            function stillBiting(scope: CombatWorld, selfBody: CombatObservation, body: CombatObservation): boolean {
                return crunchGap(selfBody, body) <= radius + 0.8 && scope.clear(selfBody.position(), body.position());
            }

            /** 磨到一半目标脱开、隔墙或失效：立即松口，不隔空结算第二段。 */
            function release(current: CombatAction, victimRef: string, at: CombatPoint): void {
                const scope = current.world();
                movementScenes.stop(current, "grind");
                const body = scope.observe(current.actor());
                const here = body === null ? at : body.position();
                WorldFeedback.emit(scope, crunchScene, 1, here, { moment: "release", target: victimRef, scale: scale }, 18);
                WorldFeedback.text(scope, here.plus(WorldCombat.point(0, 1.1, 0)), crunchReleaseText, [], 20);
                sound(current, "minecraft:entity.player.attack.weak");
                finish(current);
            }

            /** 研磨结束且全程咬合：第二段真实伤害落地后，才掷咬塌、降防御并留下破防身份。 */
            function grindOut(current: CombatAction, victimRef: string, at: CombatPoint): void {
                const scope = current.world();
                movementScenes.stop(current, "grind");
                const victim = scope.actor(victimRef);
                if (victim === null || !scope.valid(victim)) { finish(current); return; }
                const body = scope.observe(victim);
                const here = body === null ? at : body.position();
                const landed = hurt(current, victim, "crunch", chew, { damage: damageSpec("crunch", "chew"), contact: true, bite: true });
                if (!landed || !scope.valid(victim)) { finish(current); return; }
                sound(current, "minecraft:block.anvil.land");
                if (scope.random() < chance) {
                    if (NativeEffects.boost(scope, victim, "def", -stages) !== 0 && scope.valid(victim)) {
                        MobEffects.apply(scope, victim, crunchMark, crack, 0);
                        WorldFeedback.emit(scope, crunchScene, 1, here,
                            { moment: "crack", target: victimRef, stages: stages, shards: Math.round(14 + stages * 12), scale: scale, intensity: intensity }, 28);
                        WorldFeedback.text(scope, here.plus(WorldCombat.point(0, 1.35, 0)), crunchCrushText, [stages], 30);
                        sound(current, "cobblemon:impact.dark");
                    }
                }
                finish(current);
            }

            /** 研磨期间每 2 刻复核一次咬合；脱开当场松口，保持到结束才结算第二段。 */
            function grindPoll(current: CombatAction, victimRef: string, at: CombatPoint, elapsed: number): void {
                const scope = current.world();
                const victim = scope.actor(victimRef);
                if (victim === null || !scope.valid(victim)) { release(current, victimRef, at); return; }
                const selfBody = scope.observe(current.actor()), body = scope.observe(victim);
                if (selfBody === null || body === null) { release(current, victimRef, at); return; }
                if (!stillBiting(scope, selfBody, body)) { release(current, victimRef, at); return; }
                const gap = crunchGap(selfBody, body);
                const closeness = Math.max(0, Math.min(1, 1 - gap / (radius + 0.8)));
                movementScenes.show(current, "grind", body.position(),
                    { moment: "grind", target: victimRef, grind: grind, morsels: Math.max(8, Math.round(morsels * 0.6)),
                        scale: scale, press: Math.round((0.14 + 0.2 * closeness) * 100) / 100 });
                if (elapsed >= grind) { grindOut(current, victimRef, at); return; }
                current.after(2, function (next: CombatAction) { grindPoll(next, victimRef, at, elapsed + 2); });
            }

            function latch(current: CombatAction, victim: CombatActor, at: CombatPoint, contact: CombatImpact): void {
                movementScenes.stop(current);
                const scope = current.world();
                const victimRef = String(victim.ref());
                const landed = impact(current, contact, "crunch", power,
                    { damage: damageSpec("crunch", "fang"), contact: true, bite: true });
                WorldFeedback.emit(scope, crunchScene, 1, at,
                    { moment: "bite", target: victimRef, morsels: morsels, scale: scale, intensity: intensity }, 26);
                if (!landed || !scope.valid(victim)) { finish(current); return; }
                sound(current, "cobblemon:move.crunch.target");
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.2, 0)), crunchLatchText, [], 22);
                grindPoll(current, victimRef, at, 0);
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
                if (hit.blocked() || moved < p("crunch", "minimumMove", current) || travelled >= length) { whiff(current, origin); return; }
                current.after(1, advance);
            }

            advance(action);
        }
    });
}
