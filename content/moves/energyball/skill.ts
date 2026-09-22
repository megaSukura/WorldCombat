/**
 * 能量球 / energyball —— 注册与动作。
 *
 * 三幕：
 *   起（gather，提交前）：四周植被的生机被一缕缕吸向身前、球心在掌中成形（`action.present` 预告）。
 *   飞（travel，提交后）：草能球沿直线飞出，拖一路被抛落的草叶与光点。
 *   绽（burst / bloom / fizzle）：命中活物时结算一次特殊伤害并按概率用共享 `NativeEffects.boost(..., "spd", -1)`
 *       压低目标特防；球在落点绽开成一圈草种，并在地面短暂长出一小片花草（world.terrain 的 linger 租约，
 *       `bloomTicks` 后原方块回来）。打空也照样在地面绽开。
 *
 * 它把「周围的自然」算进威力：出手时按 `gather` 半径数周围植被的份数，实际威力 = core + 份数 × verdant。
 * 与同族分开：磨防远击四式里唯一依赖环境、命中后在地面长出真东西的那个。
 * 配置 `deeproot`（深根）由 resolve 改时序、由公式改吸收半径／每份生机／威力／射程。
 */
namespace PokemonSkills {
    const energyballScene = "world_combat:move_energyball";
    const energyballSunderText = "world_combat.move.energyball.text.sunder";

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

    /** 数一数施法者周围有多少处自然：按同心环取样地表方块，只读、出手时算一次；`limit` 供 AI 用少量样本估算。 */
    export function energyballNature(world: CombatWorld, centre: CombatPoint, radius: number, limit = 90): number {
        return WorldEnvironment.sampleSurface(world, centre, radius, limit, energyballIsNature).matched;
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

    /** 落点长出一小片花草：在落点周围找到地表上方的空格，种一株花草；到期原方块回来。 */
    function energyballBloom(world: CombatWorld, point: CombatPoint, ticks: number): number {
        const cells: any[] = [], seen: { [key: string]: boolean } = {};
        const palette = ["minecraft:short_grass", "minecraft:short_grass", "minecraft:moss_carpet",
            "minecraft:dandelion", "minecraft:azure_bluet", "minecraft:poppy", "minecraft:cornflower"];
        const baseX = Math.floor(point.x()), baseY = Math.floor(point.y()), baseZ = Math.floor(point.z());
        function isAir(id: string): boolean { return id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air"; }
        let placed = 0;
        for (let dx = -1; dx <= 1 && placed < 7; dx++) for (let dz = -1; dz <= 1 && placed < 7; dz++) {
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
                cells.push({ x: x, y: targetY, z: z, block: palette[placed % palette.length] });
                placed++;
            }
        }
        if (!cells.length) return 0;
        try { world.terrain(JSON.stringify({ cells: cells, linger: true }), ticks); }
        catch (error) { return 0; }
        return cells.length;
    }

    define({
        id: "energyball",
        name: "Energy Ball",
        description: "把周围植被的生机吸进球心再直线掷出：造成特殊伤害，并可能把目标特防压低 1 级；命中或落地时球在落点绽开，地面短暂长出一小片花草。周围自然越多，这一球越重。",
        uses: ["站在草木繁茂处的一记重击", "中距离单体点射并磨掉特防", "在落点留下短暂的花草标记"],
        kind: "enemy",
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
            action.present("world_combat:energyball:" + action.id(), energyballScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", gather: p("energyball", "gather", action),
                    deeproot: config && config.deeproot ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const origin = action.origin();
            const power = p("energyball", "core", action);
            const verdant = p("energyball", "verdant", action);
            const speed = p("energyball", "velocity", action);
            const radius = p("energyball", "radius", action);
            const gather = p("energyball", "gather", action);
            const chance = p("energyball", "sunderChance", action);
            const stages = Math.max(1, Math.round(p("energyball", "sunderStage", action)));
            const bloom = Math.max(60, Math.round(p("energyball", "bloomTicks", action)));
            const seeds = Math.max(12, Math.round(p("energyball", "seeds", action)));
            const nature = energyballNature(world, origin, gather);
            const total = Math.max(1, power + nature * verdant);
            const scale = Math.max(0.6, Math.min(2.6, total / 90));
            const intensity = Math.max(0.5, Math.min(2.2, total / 90));
            let settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            function bloomAt(current: CombatAction, point: CombatPoint): void {
                const planted = energyballBloom(current.world(), point, bloom);
                WorldFeedback.emit(current.world(), energyballScene, 1, point,
                    { moment: "bloom", seeds: seeds, nature: nature, planted: planted, scale: scale, intensity: intensity }, 26);
            }

            sound(action, "cobblemon:impact.grass");

            const flight = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: radius,
                lifetime: Math.max(30, Math.round(action.range() / Math.max(0.2, speed) + 24)),
                appearance: {
                    sprite: "cobblemon:generic/orb/energyorb", tint: 0x8FD14A, glow: true,
                    scale: Math.max(0.8, Math.min(2.0, radius / 0.24 + nature * 0.03))
                },
                impact: function (current: CombatAction, hit: CombatImpact) {
                    const scope = current.world();
                    const point = hit.position();
                    const victim = hit.target();
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                        const landed = impact(current, hit, "energyball", total, { damage: damageSpec("energyball", "core") });
                        if (landed && scope.valid(victim) && scope.random() < chance) {
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
                    bloomAt(current, point);
                    sound(current, "cobblemon:impact.grass");
                }
            }, function (current: CombatAction) { finish(current); });

            WorldFeedback.keep(world, "energyball:trail:" + action.id(), energyballScene, 1, origin,
                { moment: "travel", projectile: flight, seeds: seeds, nature: nature, scale: scale }, 90);
        }
    });
}
