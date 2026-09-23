/**
 * 千变万花 / flowertrick —— 注册与动作。
 *
 * 核心念头：一束做了手脚的花。花束自己找上门（会拐弯，所以必定命中），一碰就整束绽开、花瓣全扑在薄弱处
 *   （所以必定击中要害）。两种「必定」同时攥在一束花上，这就是它和别的招的分界。
 *
 * 两幕：
 *   起（windup，提交前）：把花束在手里理好、扬手蓄势，只播预告。
 *   投（launch → bloom，提交后）：用物品外观掷出花束，按 `turn` 每刻朝目标修正、按 `lockRange` 咬住；
 *       命中活体即结算 `bloom` 草属性物理伤害（必定要害）、炸开一圈花瓣，落点留下一片粉色花瓣（租借，linger，
 *       到期原方块回来）。结环时花瓣向外结成一圈，附近敌人各吃 `splash` 系数的一记；目标消失则空转散去。
 *
 * 与同族分开：魔法叶、高速星星是散成一群、各追各的；千变万花只有一束，命中即绽、必中且必暴。
 */
namespace PokemonSkills {
    /** 在原生花瓣可生长的地表上方空格铺瓣，租约到期清去花瓣；返回实际铺出的格数。 */
    function flowertrickPetals(world: CombatWorld, point: CombatPoint, cells: number, ticks: number): number {
        const list: any[] = [];
        const limit = Math.max(3, Math.round(cells));
        const baseY = Math.floor(point.y()), centreX = Math.floor(point.x()), centreZ = Math.floor(point.z());
        for (let dx = -2; dx <= 2 && list.length < limit; dx++) {
            for (let dz = -2; dz <= 2 && list.length < limit; dz++) {
                if (dx * dx + dz * dz > 5) continue;
                const x = centreX + dx, z = centreZ + dz;
                for (let dy = 1; dy >= -3; dy--) {
                    const y = baseY + dy;
                    const block = world.block(WorldCombat.point(x, y, z));
                    if (block === null) break;
                    const id = String(block.id());
                    if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
                    const at = WorldCombat.point(x, y + 1, z), above = world.block(at);
                    const over = above === null ? "" : String(above.id());
                    if ((over === "minecraft:air" || over === "minecraft:cave_air" || over === "minecraft:void_air")
                        && world.canSurvive(at, "minecraft:pink_petals"))
                        list.push({ x: x, y: y + 1, z: z, block: "minecraft:pink_petals", expectedState: above!.state() });
                    break;
                }
            }
        }
        if (!list.length) return 0;
        try {
            return JSON.parse(world.terrainResult(JSON.stringify({ cells: list, linger: true, bestEffort: true }),
                Math.max(40, Math.round(ticks)))).placed.length;
        }
        catch (error) { return 0; }
    }

    define({
        id: flowertrickId,
        cooldownParameter: "recharge",
        name: "Flower Trick",
        description: "掷出一束做了手脚的花；花束会自己拐弯追上门（必定命中），一碰就整束绽开、花瓣全扑在薄弱处（必定击中要害）。结环时花瓣向外结成一圈、溅到周围敌人；落点留下一片粉色花瓣。",
        uses: ["点掉一个目标并保证命中与要害", "结环时把绽开分给挤在一起的敌人", "在落点留下一片会到期的花瓣"],
        kind: "enemy",
        range: 10,
        maxRange: 15,
        prepare: 9,
        active: 0,
        recover: 8,
        cooldown: 40,
        style: "bloom",
        defaults: { wreathe: false, ai: { maxChase: 14, cluster: true, finish: true } },
        fields: [flag("wreathe", "结环")],
        indicator: function (config, pokemon) {
            return { radius: p(flowertrickId, "reach", pokemon), geometry: "line", style: "bloom", color: 0xF0A6C8,
                label: config && config.wreathe === true ? "千变万花·结环" : "千变万花·贯心" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[flowertrickId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(flowertrickId, "tempo", context)),
                recover: Math.round(p(flowertrickId, "aftercast", context)),
                cooldown: Math.round(p(flowertrickId, "recharge", context)),
                active: 0,
                range: p(flowertrickId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("flowertrick:ready", flowertrickScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", windup: prepare, wreathe: !!(config && config.wreathe) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const power = p(flowertrickId, "bloom", action);
            const speed = Math.max(0.4, p(flowertrickId, "velocity", action));
            const turn = Math.max(4, p(flowertrickId, "turn", action));
            const radius = Math.max(0.15, p(flowertrickId, "radius", action));
            const reach = Math.max(4, p(flowertrickId, "reach", action));
            const lock = Math.max(reach, p(flowertrickId, "lockRange", action));
            const petals = Math.max(12, Math.round(p(flowertrickId, "petals", action)));
            const bloomRadius = Math.max(1.2, p(flowertrickId, "bloomRadius", action));
            const splash = Math.max(0.15, Math.min(0.8, p(flowertrickId, "splash", action)));
            const petalCells = Math.max(3, Math.round(p(flowertrickId, "petalCells", action)));
            const petalTicks = Math.max(40, Math.round(p(flowertrickId, "petalTicks", action)));
            const wreathe = !!(config && config.wreathe);
            const scale = Math.max(0.7, Math.min(1.8, radius / 0.3));
            const intensity = Math.max(0.6, Math.min(2.2, power / 62));
            const chase = lock + 6;
            const selected = action.target();

            sound(action, "minecraft:entity.firework_rocket.launch");

            if (selected === null || !world.valid(selected)) {
                WorldFeedback.emit(world, flowertrickScene, 1, action.origin().plus(action.direction().scale(2)),
                    { moment: "miss", petals: petals, scale: scale }, 20);
                WorldFeedback.text(world, action.origin().plus(WorldCombat.point(0, 1.2, 0)), flowertrickMissText, [], 22);
                done(action);
                return;
            }

            const reference = String(selected.ref());
            const flight = LivingActions.projectile(action, {
                speed: speed, range: chase, radius: radius, lifetime: 200,
                appearance: {
                    item: "minecraft:pink_tulip", scale: Math.max(1, scale * 1.2), glow: true,
                    homing: { target: reference, turn: turn, delay: 1, range: chase }
                },
                impact: function (current: CombatAction, hit: CombatImpact) {
                    const scope = current.world(), point = hit.position(), victim = hit.target();
                    const landed = victim !== null && scope.valid(victim) && !scope.friendly(victim)
                        ? impact(current, hit, flowertrickId, power, { damage: damageSpec(flowertrickId, "bloom"), critical: true }) : false;
                    WorldFeedback.emit(scope, flowertrickScene, 1, point,
                        { moment: "bloom", target: victim === null ? "" : String(victim.ref()), petals: petals,
                            bloomRadius: bloomRadius, scale: scale, intensity: intensity, landed: landed ? 1 : 0 }, 26);
                    scope.sound("cobblemon:impact.grass", point, 14, "{}");
                    scope.sound("minecraft:block.pink_petals.break", point, 12, "{}");
                    if (landed && wreathe) {
                        const ref = String(victim!.ref());
                        WorldGeometry.selectEnemies(scope, WorldGeometry.ring(point, 0.4, bloomRadius, { below: 1.5, above: 2.5 }),
                            function (other: CombatActor, otherFacts: CombatObservation): void {
                                if (String(other.ref()) === ref) return;
                                if (!hurt(current, other, flowertrickId, power * splash,
                                    { damage: damageSpec(flowertrickId, "bloom"), critical: true })) return;
                                WorldFeedback.emit(scope, flowertrickScene, 1, otherFacts.position(),
                                    { moment: "bloom", target: String(other.ref()), petals: Math.round(petals * 0.6),
                                        bloomRadius: bloomRadius * 0.8, scale: scale, intensity: Math.max(0.4, intensity * 0.75), landed: 1 }, 22);
                            });
                    }
                    const cells = flowertrickPetals(scope, point, petalCells, petalTicks);
                    if (cells > 0)
                        WorldFeedback.emit(scope, flowertrickScene, 1, point, { moment: "petalbed", cells: cells, scale: scale }, 28);
                    if (landed) WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.25, 0)), flowertrickBloomText, [], 22);
                }
            }, function (current: CombatAction) {
                done(current);
            });
            WorldFeedback.keep(world, "flowertrick:flight:" + action.id(), flowertrickScene, 1, action.origin(),
                { moment: "flight", projectile: flight, petals: petals, scale: scale, intensity: intensity }, 140);
        }
    });
}
