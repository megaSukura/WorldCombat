/**
 * 流星群 / dracometeor 的出手方式。
 *
 * 核心念头：**从高空召下一群陨石**——抬手叫来落点、陨石一颗颗垂直砸下，每颗在自己落点炸开一圈龙属性能量、
 *   把地面砸出焦黑的坑。召唤与维系陨石耗的是同一份精神力，所以自身特攻掉 2 级，提交那一刻就付。
 *
 * 三幕（提交前只播预告）：
 *   起（summon）：施法者抬头，天光在目标处聚成落点标记，只播预告，此时代价未结清。
 *   落（fall → impact / burst）：提交后立刻付反作用力（自身特攻 −insightLoss，中与不中都照付）；
 *       第一颗瞄向目标当前位置，其余按 `spread` 散布（流星式）逐个推迟 `interval` 刻召下；
 *       每颗垂直落到落点后在 `impactRadius` 内结算一次 `meteor`，砸出 `crater` 半径、`craterTicks` 时长的坑。
 *   散（fade / miss）：全部落完后余烬散去；一颗也没砸到就是空放。
 *
 * 与同族分开：飞叶风暴是旋转前进并留场的叶刃、过热是身前一张扇形热浪、精神突进是隔空内爆；
 *   流星群是唯一从正上方垂直砸下、落点散布成一片的那一记，也是唯一把伤害分给多颗陨石的。
 *
 * 配置 `barrage`（流星式）由 `resolve` 改时序、由公式改威力／颗数／散布，由本文件改判定与表现；提交后才触碰世界。
 */
namespace PokemonSkills {
    const dracometeorScene = "world_combat:move_dracometeor";
    const dracometeorMissText = "world_combat.move.dracometeor.text.miss";

    /** 陨石坑：内圈黑石、外圈玄武岩，只换地表，到期原方块回来。 */
    function dracometeorCrater(world: CombatWorld, point: CombatPoint, radius: number, ticks: number): number {
        const cells: any[] = [], r = Math.ceil(radius);
        const px = point.x(), py = point.y(), pz = point.z();
        for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
            const distance = Math.sqrt(dx * dx + dz * dz);
            if (distance > radius) continue;
            const x = Math.floor(px) + dx, z = Math.floor(pz) + dz;
            for (let dy = 1; dy >= -3; dy--) {
                const y = Math.floor(py) + dy;
                const block = world.block(WorldCombat.point(x, y, z));
                if (block === null) break;
                const id = String(block.id());
                if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
                if (id === "minecraft:bedrock" || id === "minecraft:barrier" || id === "minecraft:water" || id === "minecraft:lava") break;
                const surface = distance <= radius * 0.5 ? "minecraft:blackstone" : "minecraft:basalt";
                if (id !== surface) cells.push({ x: x, y: y, z: z, block: surface });
                break;
            }
        }
        if (!cells.length) return 0;
        try { return world.terrain(JSON.stringify({ cells: cells, replace: true, linger: true }), Math.max(40, Math.round(ticks))); }
        catch (error) { return 0; }
    }

    define({
        id: "dracometeor",
        cooldownParameter: "recharge",
        name: "Draco Meteor",
        description: "Calls comets down from the sky onto the target; the recoil harshly lowers the user's Sp. Atk.",
        uses: ["远距离召下陨石点杀", "流星式把落点铺成一片、罩住聚在一起的敌人", "在落点砸出焦黑的坑、持续占住那片地"],
        kind: "enemy",
        range: 13,
        maxRange: 17,
        prepare: 14,
        active: 0,
        recover: 10,
        cooldown: 40,
        maximumTicks: 320,
        style: "meteor",
        defaults: { barrage: false, ai: { maxChase: 17, spread: true, minRange: 5 } },
        fields: [],
        indicator: function (config, pokemon) {
            const fallback = config && config.barrage === true ? 2.0 : 1.3;
            const radius = pokemon ? Math.max(p("dracometeor", "impactRadius", pokemon), p("dracometeor", "spread", pokemon)) : fallback;
            return { radius: radius, geometry: "area", style: "meteor", color: 0x7A6AC8,
                label: config && config.barrage === true ? "流星群·流星式" : "流星群·坠星式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["dracometeor"], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("dracometeor", "tempo", context)),
                recover: Math.round(p("dracometeor", "aftercast", context)),
                cooldown: Math.round(p("dracometeor", "recharge", context)),
                active: 0,
                range: p("dracometeor", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_dracometeor:summon", dracometeorScene, 1, action.targetPosition(),
                JSON.stringify({ moment: "summon", barrage: config && config.barrage === true ? 1 : 0,
                    shards: Math.round(p("dracometeor", "shards", action)) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const origin = action.origin();
            const barrage = !!(config && config.barrage);
            const power = p("dracometeor", "meteor", action);
            const count = Math.max(1, Math.round(p("dracometeor", "count", action)));
            const spread = Math.max(0, p("dracometeor", "spread", action));
            const impactRadius = p("dracometeor", "impactRadius", action);
            const fall = p("dracometeor", "fall", action);
            const velocity = Math.max(0.4, p("dracometeor", "velocity", action));
            const interval = Math.max(1, Math.round(p("dracometeor", "interval", action)));
            const crater = p("dracometeor", "crater", action);
            const craterTicks = Math.max(40, Math.round(p("dracometeor", "craterTicks", action)));
            const shards = Math.max(16, Math.round(p("dracometeor", "shards", action)));
            const insightLoss = Math.max(0, Math.round(p("dracometeor", "insightLoss", action)));
            const base = action.targetPosition();
            const fallTicks = Math.ceil(fall / velocity);
            const markRadius = Math.max(impactRadius, spread);
            const trailScale = Math.max(0.7, Math.min(1.8, impactRadius / 1.3));
            const intensity = Math.max(0.5, Math.min(2.4, power / 120));
            let launched = 0, resolved = 0, totalHits = 0, settled = false;

            // 召唤耗的是精神力：反作用力在提交那一刻付。
            NativeEffects.boost(world, actor, "spa", -insightLoss);
            WorldFeedback.emit(world, dracometeorScene, 1, base,
                { moment: "summon", barrage: barrage ? 1 : 0, shards: shards, radius: markRadius, scale: trailScale, intensity: intensity }, 26);
            WorldFeedback.keep(world, "dracometeor:mark:" + action.id(), dracometeorScene, 1, base,
                { moment: "mark", radius: markRadius, shards: shards, scale: trailScale, intensity: intensity }, count * interval + fallTicks + 24);
            sound(action, "cobblemon:move.dracometeor.actor_1");

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                if (totalHits === 0) {
                    const scope = current.world();
                    WorldFeedback.text(scope, base.plus(WorldCombat.point(0, 1.0, 0)), dracometeorMissText, [], 20);
                }
                done(current);
            }

            /** 一颗陨石落定：在落点半径内结算，砸出坑，播一次冲击。 */
            function strike(current: CombatAction, at: CombatPoint, direct: CombatActor | null): void {
                const scope = current.world();
                let hits = 0;
                WorldGeometry.selectEnemies(scope, WorldGeometry.ring(at, 0, impactRadius, { below: 3, above: 3.5 }), function (enemy, facts) {
                    const isDirect = direct !== null && String(enemy.ref()) === String(direct.ref());
                    if (!hurt(current, enemy, "dracometeor", power, { damage: damageSpec("dracometeor", "meteor") })) return;
                    hits++;
                    WorldFeedback.emit(scope, dracometeorScene, 1, facts.position(),
                        { moment: "impact", target: String(enemy.ref()), direct: isDirect ? 1 : 0, shards: shards,
                            impactRadius: impactRadius, scale: trailScale, intensity: isDirect ? intensity : intensity * 0.85 }, 24);
                });
                totalHits += hits;
                const cells = dracometeorCrater(scope, at, crater, craterTicks);
                WorldFeedback.emit(scope, dracometeorScene, 1, at,
                    { moment: "burst", cells: cells, shards: shards, impactRadius: impactRadius, crater: crater,
                        scale: trailScale, intensity: intensity, hits: hits }, 28);
                sound(current, "cobblemon:impact.dragon");
                sound(current, "minecraft:entity.generic.explode");
                resolved++;
                if (resolved >= launched && launched >= count) finish(current);
            }

            /** 召下一颗：第一颗瞄向目标当前位置，其余按 spread 散布。 */
            function summon(current: CombatAction, index: number): void {
                const scope = current.world();
                let at = base;
                if (index === 0) {
                    const t = current.target();
                    if (t !== null && scope.valid(t)) {
                        const body = scope.observe(t);
                        if (body !== null) at = body.position();
                    }
                } else if (spread > 0) {
                    const angle = scope.random() * Math.PI * 2, radius = Math.sqrt(scope.random()) * spread;
                    at = base.plus(WorldCombat.point(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
                }
                const from = at.plus(WorldCombat.point(0, fall, 0));
                let spent = false;
                launched++;
                const flight = current.projectile(from, WorldCombat.point(0, -velocity, 0), 0,
                    Math.max(0.25, impactRadius * 0.5), fall + 8, fallTicks + 40,
                    function (fresh: CombatAction, hit: CombatImpact) {
                        if (spent) return;
                        spent = true;
                        strike(fresh, hit.position(), hit.target());
                    },
                    function (fresh: CombatAction) {
                        if (spent) return;
                        spent = true;
                        strike(fresh, at, null);
                    },
                    JSON.stringify({ sprite: "cobblemon:particle/moves/meteor", scale: Math.max(1.0, impactRadius * 1.5), glow: true, spin: true }));
                WorldFeedback.keep(scope, "dracometeor:fall:" + flight, dracometeorScene, 1, from,
                    { moment: "fall", projectile: flight, shards: shards, scale: trailScale, intensity: intensity }, fallTicks + 40);
                sound(current, "cobblemon:move.dracometeor.actor_2");
            }

            let index = 0;
            function drop(current: CombatAction): void {
                summon(current, index);
                index++;
                if (index < count) {
                    current.after(interval, function (fresh: CombatAction) { drop(fresh); });
                    return;
                }
                current.after(fallTicks + 60, function (fresh: CombatAction) { finish(fresh); });
            }
            drop(action);
        }
    });
}
