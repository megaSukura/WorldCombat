/**
 * 能量球 / energyball —— 注册与动作。
 *
 * 三幕：
 *   起（gather，提交前）：起手按 `gather` 半径真实取样周围的植被点；每个真实点一条绿线，小点按实际准备进度
 *       吸向同一个球心（自定义场景 `world_combat:move_energyball_gather` 逐帧推进，不再整段 polyline 同时撒）。
 *       取样份数与这些点一并存进 `action.data`，飞行用的威力与画出的线读同一份。
 *   飞（travel，提交后）：草能球沿直线飞出，拖一路被抛落的草叶与光点。
 *   绽（burst / bloom / fizzle）：命中活物时结算一次特殊伤害，若真把特防压下去才用共享
 *       `NativeEffects.boost(..., "spd", -1)` 报文字；球在落点绽开成一圈草种，只在真实接触且合法生长面上
 *       短暂长出一小片花草（`terrainResult` 的 linger 租约，`bloomTicks` 后原方块回来），每株芽按确认格位画出。
 *       飞尽没碰到东西就消散，不向推算的远处落点生花。
 *
 * 它把「周围的自然」算进威力：起手数周围植被的份数，实际威力 = core + 份数 × verdant。
 * 选取 `kind: "aim"`——方向或世界点都能放，也可瞄实体；墙会截住球，落点只种合法空位。
 * 与同族分开：磨防远击四式里唯一依赖环境、命中后在地面长出真东西的那个。
 * 配置 `deeproot`（深根）由 resolve 改时序、由公式改吸收半径／每份生机／威力／射程。
 */
namespace PokemonSkills {
    const energyballScene = "world_combat:move_energyball";
    const energyballSunderText = "world_combat.move.energyball.text.sunder";
    const energyballGatherText = "world_combat.move.energyball.text.gather";
    const energyballSitesKey = "world_combat:energyball/sites";
    /** 逐帧画的生机线与吸向球心的小点；按实际采样点与真实准备进度推进。 */
    const energyballGatherScene = "world_combat:move_energyball_gather";
    /** 在 terrainResult 确认的每个真实落点画一株芽；没有合法落点就不发射。 */
    const energyballBloomScene = "world_combat:move_energyball_bloom";

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

    /** 方块表面的外法线，用来把落点从方块格移到真实接触侧，不穿墙扫到上层。 */
    function energyballNormal(face: string): CombatPoint {
        if (face === "down") return WorldCombat.point(0, -1, 0);
        if (face === "north") return WorldCombat.point(0, 0, -1);
        if (face === "south") return WorldCombat.point(0, 0, 1);
        if (face === "west") return WorldCombat.point(-1, 0, 0);
        if (face === "east") return WorldCombat.point(1, 0, 0);
        return WorldCombat.point(0, 1, 0);
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
            const state = palette[grown % palette.length];
            const at = world.block(WorldCombat.point(x, targetY, z));
            const support = world.block(WorldCombat.point(x, targetY - 1, z));
            if (at === null || support === null || !isAir(String(at.id()))) continue;
            const supportId = String(support.id());
            if (isAir(supportId) || energyballReplaceableAt(support)) continue;
            if (!world.canSurvive(WorldCombat.point(x, targetY, z), state)) continue;
            const key = x + "," + targetY + "," + z;
            if (!seen[key]) {
                seen[key] = true;
                cells.push({ x: x, y: targetY, z: z, block: state });
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
        description: "朝方向或点把周围植被的生机吸进球心再直线掷出：造成特殊伤害，并可能把目标特防压低 1 级；命中或撞上地面时球在落点绽开，仅在能生长的地表短暂长出一小片花草，纯空放不留。周围自然越多，这一球越重；墙会截住球。",
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
            // 起手做一次真实取样：份数存进 action.data 供飞行算威力；命中的植被点独立上传，
            // 每个真实点一条生机线，小点按实际准备进度吸向同一个球心（自定义场景逐帧推进）。
            const origin = action.origin();
            const sense = action.sense();
            const gather = p("energyball", "gather", action);
            const sample = energyballNatureSites(sense, origin, gather, 90, 8);
            const total = Math.max(1, p("energyball", "core", action) + sample.count * p("energyball", "verdant", action));
            const scale = Math.max(0.6, Math.min(2.6, total / 90));
            const sites: number[][] = [];
            for (let i = 0; i < sample.points.length; i++)
                sites.push([sample.points[i].x(), sample.points[i].y(), sample.points[i].z()]);
            action.data(energyballSitesKey, JSON.stringify({ count: sample.count }));
            action.present("energyball:gather:" + action.id(), energyballGatherScene, 1, origin,
                JSON.stringify({ sites: sites, origin: [origin.x(), origin.y(), origin.z()],
                    start: sense.tick(), duration: prepare, nature: sample.count, scale: scale }));
            action.present("world_combat:energyball:" + action.id(), energyballScene, 1, origin,
                JSON.stringify({ moment: "gather", gather: gather, nature: sample.count, scale: scale,
                    deeproot: config && config.deeproot ? 1 : 0 }));
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
            let settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; scenes.finish(current, done); } }

            /** 真在落点长出花草：每株芽按 terrainResult 确认的实际格位画出，只散种子不放芽。 */
            function bloomAt(current: CombatAction, point: CombatPoint): void {
                const born = energyballBloom(current.world(), point, bloom);
                if (born.length > 0) {
                    const placed: number[][] = [];
                    for (let i = 0; i < born.length; i++) placed.push([born[i].x(), born[i].y(), born[i].z()]);
                    WorldFeedback.emit(current.world(), energyballBloomScene, 1, point,
                        { placed: placed, nature: nature, scale: scale }, 30);
                }
                WorldFeedback.emit(current.world(), energyballScene, 1, point,
                    { moment: "bloom", seeds: seeds, nature: nature, planted: born.length, scale: scale, intensity: intensity }, 26);
            }

            sound(action, "cobblemon:impact.grass");
            // 起手读数：已采样的生机份数与这一球的实际强度，让玩家看见站位带来的差别。
            WorldFeedback.text(world, origin.plus(WorldCombat.point(0, 1.5, 0)), energyballGatherText, [nature, Math.round(total)], 26);

            const flight = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: radius, direction: direction,
                lifetime: Math.max(30, Math.round(action.range() / Math.max(0.2, speed) + 24)),
                appearance: {
                    sprite: "cobblemon:generic/orb/energyorb", tint: 0x8FD14A, glow: true,
                    scale: Math.max(0.8, Math.min(2.0, radius / 0.24 + nature * 0.03))
                },
                impact: function (current: CombatAction, hit: CombatImpact) {
                    const scope = current.world();
                    // 方块命中用真实接触点沿外法线移出表面，实体命中用身体接触点；落点、绽开与长花都读同一个点。
                    const point = hit.blockPosition() !== null
                        ? hit.position().plus(energyballNormal(hit.blockFace()).scale(0.5))
                        : hit.position();
                    const victim = hit.target();
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                        const landedHit = impact(current, hit, "energyball", total, { damage: damageSpec("energyball", "core") });
                        if (landedHit && scope.valid(victim) && scope.random() < chance) {
                            // 只有真的把特防压下去才报文字：已到底或原生拒绝时不发成功提示。
                            const applied = NativeEffects.boost(scope, victim, "spd", -stages);
                            const body = scope.observe(victim);
                            if (applied < 0 && body !== null)
                                WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.2, 0)), energyballSunderText, [Math.abs(applied)], 30);
                        }
                        WorldFeedback.emit(scope, energyballScene, 1, point,
                            { moment: "burst", target: String(victim.ref()), nature: nature, seeds: seeds, scale: scale, intensity: intensity }, 26);
                    } else {
                        WorldFeedback.emit(scope, energyballScene, 1, point,
                            { moment: "fizzle", nature: nature, seeds: seeds, scale: scale }, 22);
                    }
                    scenes.stop(current, "travel");
                    bloomAt(current, point);
                    sound(current, "cobblemon:impact.grass");
                }
            }, function (current: CombatAction) {
                // 飞尽没碰到任何东西：不在推算的远处落点生花，只让球自然消散。
                finish(current);
            });

            scenes.show(action, "travel", origin,
                { moment: "travel", projectile: flight, seeds: seeds, nature: nature, scale: scale });
        }
    });
}
