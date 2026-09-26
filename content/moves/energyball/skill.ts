/**
 * 能量球 / energyball —— 注册与动作。
 *
 * 三幕：
 *   起（gather，提交前）：起手按 `gather` 半径真实取样周围的植被点，每个真实点拉一条稀疏绿线把生机送进球心
 *       （`action.present` 预告）；取样份数与这些点一并存进 `action.data`，飞行用的威力与画出的线读同一份。
 *   飞（travel，提交后）：草能球沿直线飞出，拖一路被抛落的草叶与光点。
 *   绽（burst / bloom / fizzle）：命中活物时结算一次特殊伤害并按概率用共享 `NativeEffects.boost(..., "spd", -1)`
 *       压低目标特防；球在落点绽开成一圈草种，并在地面短暂长出一小片花草（`terrainResult` 的 linger 租约，
 *       `bloomTicks` 后原方块回来），实际放下的格数驱动花粉。空放也照样在落点绽开。
 *
 * 它把「周围的自然」算进威力：起手数周围植被的份数，实际威力 = core + 份数 × verdant。
 * 选取 `kind: "aim"`——方向或世界点都能放，也可瞄实体；墙会截住球，落点只种合法空位。
 * 与同族分开：磨防远击四式里唯一依赖环境、命中后在地面长出真东西的那个。
 * 配置 `deeproot`（深根）由 resolve 改时序、由公式改吸收半径／每份生机／威力／射程。
 */
namespace PokemonSkills {
    const energyballScene = "world_combat:move_energyball";
    const energyballSunderText = "world_combat.move.energyball.text.sunder";
    const energyballSitesKey = "world_combat:energyball/sites";

    const energyballNatureTags = ["minecraft:leaves", "minecraft:flowers", "minecraft:saplings",
        "minecraft:crops", "minecraft:tall_flowers"];

    const energyballNatureIds: { [id: string]: boolean } = {
        "minecraft:grass_block": true, "minecraft:moss_block": true, "minecraft:short_grass": true,
        "minecraft:tall_grass": true, "minecraft:fern": true, "minecraft:large_fern": true,
        "minecraft:moss_carpet": true, "minecraft:azalea": true, "minecraft:flowering_azalea": true,
        "minecraft:lily_pad": true, "minecraft:vine": true, "minecraft:glow_lichen": true,
        "minecraft:big_dripleaf": true, "minecraft:small_dripleaf": true, "minecraft:spore_blossom": true,
        "minecraft:sweet_berry_bush": true, "minecraft:bamboo": true, "minecraft:bamboo_sapling": true,
        "minecraft:cactus": true, "minecraft:melon": true, "minecraft:pumpkin": true,
        "minecraft:sugar_cane": true, "minecraft:kelp": true, "minecraft:seagrass": true,
        "minecraft:brown_mushroom": true, "minecraft:red_mushroom": true, "minecraft:crimson_roots": true,
        "minecraft:warped_roots": true, "minecraft:nether_sprouts": true
    };

    function energyballIsNature(block: CombatBlock): boolean {
        for (let i = 0; i < energyballNatureTags.length; i++)
            if (block.tagged(energyballNatureTags[i])) return true;
        return energyballNatureIds[String(block.id())] === true;
    }

    /**
     * 按同心环取样施法者周围的地表，数出自然处并保留前 `limit` 个真实命中的植被点。
     * 只读、出手时算一次：同一个结果既算威力，也决定画面里从哪些点拉出生机线。
     */
    export function energyballNatureSites(world: CombatWorld, centre: CombatPoint, radius: number, budget = 90, limit = 0): { count: number; points: CombatPoint[] } {
        const points: CombatPoint[] = [], seen: { [key: string]: boolean } = {};
        let matched = 0, sampled = 0;
        const x0 = Math.floor(centre.x()), y0 = Math.floor(centre.y()), z0 = Math.floor(centre.z());
        const reach = Math.max(0, Math.round(radius));
        for (let ring = 1; ring <= reach && sampled < Math.floor(budget); ring++) {
            const spokes = Math.max(1, Math.round(ring * 6));
            for (let spoke = 0; spoke < spokes && sampled < Math.floor(budget); spoke++) {
                const angle = spoke * Math.PI * 2 / spokes;
                const x = x0 + Math.round(Math.cos(angle) * ring), z = z0 + Math.round(Math.sin(angle) * ring);
                const key = x + "," + z;
                if (seen[key]) continue;
                seen[key] = true; sampled++;
                for (let dy = 1; dy >= -2; dy--) {
                    const block = world.block(WorldCombat.point(x, y0 + dy, z));
                    if (block === null) break;
                    const id = String(block.id());
                    if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
                    if (energyballIsNature(block)) {
                        matched++;
                        if (points.length < limit) points.push(WorldCombat.point(x + 0.5, y0 + dy + 1, z + 0.5));
                    }
                    break;
                }
            }
        }
        return { count: matched, points: points };
    }

    /** 数一数施法者周围有多少处自然：按同心环取样地表方块，只读、出手时算一次；`limit` 供 AI 用少量样本估算。 */
    export function energyballNature(world: CombatWorld, centre: CombatPoint, radius: number, limit = 90): number {
        return energyballNatureSites(world, centre, radius, limit, 0).count;
    }

    const energyballReplaceable: { [id: string]: boolean } = {
        "minecraft:short_grass": true, "minecraft:tall_grass": true, "minecraft:fern": true,
        "minecraft:large_fern": true, "minecraft:moss_carpet": true, "minecraft:dandelion": true,
        "minecraft:poppy": true, "minecraft:azure_bluet": true, "minecraft:cornflower": true,
        "minecraft:oxeye_daisy": true, "minecraft:allium": true, "minecraft:lily_of_the_valley": true
    };

    function energyballReplaceableAt(block: CombatBlock): boolean {
        const id = String(block.id());
        if (energyballReplaceable[id] === true) return true;
        return block.tagged("minecraft:flowers") || block.tagged("minecraft:crops") || block.tagged("minecraft:saplings");
    }

    /** 落点长出一小片花草：在落点周围找地表上方的空格；返回 `terrainResult` 确认真正放下的格（原生跳过保护/占用）。 */
    function energyballBloom(world: CombatWorld, point: CombatPoint, ticks: number): CombatPoint[] {
        const cells: any[] = [], seen: { [key: string]: boolean } = {};
        const palette = ["minecraft:short_grass", "minecraft:short_grass", "minecraft:moss_carpet",
            "minecraft:dandelion", "minecraft:azure_bluet", "minecraft:poppy", "minecraft:cornflower"];
        const baseX = Math.floor(point.x()), baseY = Math.floor(point.y()), baseZ = Math.floor(point.z());
        function isAir(id: string): boolean { return id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air"; }
        let grown = 0;
        for (let dx = -1; dx <= 1 && grown < 7; dx++) for (let dz = -1; dz <= 1 && grown < 7; dz++) {
            const x = baseX + dx, z = baseZ + dz;
            let targetY = null;
            for (let dy = 1; dy >= -3; dy--) {
                const block = world.block(WorldCombat.point(x, baseY + dy, z));
                if (block === null) break;
                const id = String(block.id());
                if (isAir(id)) continue;
                if (id === "minecraft:water" || id === "minecraft:lava" || id === "minecraft:bedrock" ||
                    id === "minecraft:barrier") break;
                targetY = baseY + dy + 1;
                break;
            }
            if (targetY === null) continue;
            const at = world.block(WorldCombat.point(x, targetY, z));
            const support = world.block(WorldCombat.point(x, targetY - 1, z));
            if (at === null || support === null || !isAir(String(at.id()))) continue;
            const supportId = String(support.id());
            if (isAir(supportId) || energyballReplaceableAt(support)) continue;
            const key = x + "," + targetY + "," + z;
            if (!seen[key]) {
                seen[key] = true;
                cells.push({ x: x, y: targetY, z: z, block: palette[grown % palette.length] });
                grown++;
            }
        }
        if (!cells.length) return [];
        try {
            const receipt = JSON.parse(String(world.terrainResult(JSON.stringify({ cells: cells, linger: true }), ticks)));
            const taken = receipt && receipt.placed ? receipt.placed : [], born: CombatPoint[] = [];
            for (let i = 0; i < taken.length; i++) {
                const cell = taken[i];
                if (cell && cell.length >= 3) born.push(WorldCombat.point(cell[0] + 0.5, cell[1] + 0.3, cell[2] + 0.5));
            }
            return born;
        } catch (error) { return []; }
    }

    define({
        id: "energyball",
        name: "Energy Ball",
        description: "朝方向或点把周围植被的生机吸进球心再直线掷出：造成特殊伤害，并可能把目标特防压低 1 级；命中或落地时球在落点绽开，地面短暂长出一小片花草。周围自然越多，这一球越重；墙会截住球。",
        uses: ["站在草木繁茂处的一记重击", "中距离单体点射并磨掉特防", "在落点留下短暂的花草标记"],
        kind: "aim",
        range: 12,
        maxRange: 18,
        prepare: 12,
        active: 0,
        recover: 9,
        cooldown: 30,
        style: "verdant",
        defaults: { deeproot: false, ai: { maxChase: 14, verdantFirst: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("energyball", "reach", pokemon), geometry: "line", style: "verdant",
                color: 0x7FBF3A, label: config && config.deeproot === true ? "深根能量球" : "能量球" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["energyball"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const deeproot = !!(config && config.deeproot);
            return {
                prepare: Math.round(p("energyball", "tempo", context)),
                recover: 9,
                cooldown: 30 + (deeproot ? 5 : 0),
                active: 0,
                range: p("energyball", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            // 起手做一次真实取样：份数存进 action.data 供飞行算威力，命中的植被点连成画面里的生机线。
            const origin = action.origin();
            const gather = p("energyball", "gather", action);
            const sample = energyballNatureSites(action.sense(), origin, gather, 90, 8);
            const path: any[] = [];
            for (let i = 0; i < sample.points.length; i++) {
                const site = sample.points[i];
                path.push([site.x(), site.y(), site.z()]);
                path.push([origin.x(), origin.y() + 0.45, origin.z()]);
            }
            const total = Math.max(1, p("energyball", "core", action) + sample.count * p("energyball", "verdant", action));
            action.data(energyballSitesKey, JSON.stringify({ count: sample.count }));
            action.present("world_combat:energyball:" + action.id(), energyballScene, 1, origin,
                JSON.stringify({ moment: "gather", gather: gather, sites: sample.points.length, nature: sample.count, path: path,
                    scale: Math.max(0.6, Math.min(2.6, total / 90)), deeproot: config && config.deeproot ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const scenes = WorldFeedback.actionScenes(energyballScene);
            const world = action.world();
            const origin = action.origin();
            const direction = aim(action);
            const power = p("energyball", "core", action);
            const verdant = p("energyball", "verdant", action);
            const speed = p("energyball", "velocity", action);
            const radius = p("energyball", "radius", action);
            const gather = p("energyball", "gather", action);
            const chance = p("energyball", "sunderChance", action);
            const stages = Math.max(1, Math.round(p("energyball", "sunderStage", action)));
            const bloom = Math.max(60, Math.round(p("energyball", "bloomTicks", action)));
            const seeds = Math.max(12, Math.round(p("energyball", "seeds", action)));
            const stored = action.data(energyballSitesKey);
            const nature = stored !== null ? Math.max(0, Math.round(JSON.parse(stored).count || 0)) : energyballNature(world, origin, gather);
            const total = Math.max(1, power + nature * verdant);
            const scale = Math.max(0.6, Math.min(2.6, total / 90));
            const intensity = Math.max(0.5, Math.min(2.2, total / 90));
            let landed = false, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; scenes.finish(current, done); } }

            function bloomAt(current: CombatAction, point: CombatPoint): void {
                const born = energyballBloom(current.world(), point, bloom);
                WorldFeedback.emit(current.world(), energyballScene, 1, point,
                    { moment: "bloom", seeds: seeds, nature: nature, planted: born.length, scale: scale, intensity: intensity }, 26);
            }

            sound(action, "cobblemon:impact.grass");

            const flight = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: radius, direction: direction,
                lifetime: Math.max(30, Math.round(action.range() / Math.max(0.2, speed) + 24)),
                appearance: {
                    sprite: "cobblemon:generic/orb/energyorb", tint: 0x8FD14A, glow: true,
                    scale: Math.max(0.8, Math.min(2.0, radius / 0.24 + nature * 0.03))
                },
                impact: function (current: CombatAction, hit: CombatImpact) {
                    const scope = current.world();
                    // 打到方块按原生格与表面，打到实体用身体位置；落点、绽开与长花都读同一个点。
                    const cell = hit.blockPosition();
                    const point = cell !== null ? cell : hit.position();
                    const victim = hit.target();
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                        const landedHit = impact(current, hit, "energyball", total, { damage: damageSpec("energyball", "core") });
                        if (landedHit && scope.valid(victim) && scope.random() < chance) {
                            NativeEffects.boost(scope, victim, "spd", -stages);
                            const body = scope.observe(victim);
                            if (body !== null)
                                WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.2, 0)), energyballSunderText, [stages], 30);
                        }
                        WorldFeedback.emit(scope, energyballScene, 1, point,
                            { moment: "burst", target: String(victim.ref()), nature: nature, seeds: seeds, scale: scale, intensity: intensity }, 26);
                    } else {
                        WorldFeedback.emit(scope, energyballScene, 1, point,
                            { moment: "fizzle", nature: nature, seeds: seeds, scale: scale }, 22);
                    }
                    landed = true;
                    scenes.stop(current, "travel");
                    bloomAt(current, point);
                    sound(current, "cobblemon:impact.grass");
                }
            }, function (current: CombatAction) {
                // 空放：球飞到射程尽头没碰到任何东西，也在实际落到的地表绽开一小片。
                if (!landed) bloomAt(current, WorldGeometry.ground(current.world(), origin.plus(direction.scale(current.range())), 6));
                finish(current);
            });

            scenes.show(action, "travel", origin,
                { moment: "travel", projectile: flight, seeds: seeds, nature: nature, scale: scale });
        }
    });
}
