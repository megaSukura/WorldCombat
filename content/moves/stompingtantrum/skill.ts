/**
 * 跺脚 / stompingtantrum 的出手方式。
 *
 * 核心念头：上一次出手落空的一口气没有咽下去，抬脚往地上一跺——地面从脚下朝目标裂开一条缝，
 *   站在缝上的人挨一记、被向上掀起并向外震开；带着那口气时，裂缝尽头再崩一次，把人掀得更高。
 *
 * 三幕：
 *   起（stomp，提交前）：沉身、抬脚，脚边尘土一跳的预告。
 *   裂（fissure）：提交后地面沿一条线裂向目标，缝上每个站在地上的敌人各挨一次 `tremor`，
 *       被向上抛起 `launch`、沿离中心的方向推开 `shove`；空中的目标不沾地所以安全。
 *   崩（burst／collapse）：带憋愤时，裂缝尽头再崩开一圈更大的土石；随后地面留下裂痕，到期原方块回来。
 *
 * 与同族分开：
 *   重踏（bulldoze） 一圈地裂贴着地表一圈圈向外推，只削速度、留面上的痕；
 *   地震（earthquake）整块地面瞬间掀起，把人向上抛，范围更大；
 *   跺脚（本招）    一条**朝目标的定向裂缝**，只在发动那一下掀人；上一次打空时这一脚翻倍、尽头补崩——
 *                   它的身份是「憋着一口气的一脚」，不是持续的地面波。
 */
namespace PokemonSkills {
    /** 地表的裂开形态：泥土类跺成粗土，石头类跺裂成圆石，沙地跺成砂岩；其余不动。 */
    function stompCracked(id: string): string {
        if (id === "minecraft:grass_block" || id === "minecraft:dirt" || id === "minecraft:coarse_dirt" ||
            id === "minecraft:podzol" || id === "minecraft:rooted_dirt" || id === "minecraft:moss_block") return "minecraft:coarse_dirt";
        if (id === "minecraft:stone" || id === "minecraft:granite" || id === "minecraft:diorite" ||
            id === "minecraft:andesite" || id === "minecraft:tuff" || id === "minecraft:deepslate" ||
            id === "minecraft:gravel" || id === "minecraft:cobblestone") return "minecraft:cobblestone";
        if (id === "minecraft:sand" || id === "minecraft:red_sand") return "minecraft:sandstone";
        return "";
    }

    /** 沿裂缝方向把表层踏裂：只动地表的可换方块，到期原方块回来。 */
    function stompRent(world: CombatWorld, centre: CombatPoint, direction: CombatPoint, length: number, halfWidth: number, ticks: number, cap: number): number {
        const cells: any[] = [], seen: { [key: string]: boolean } = {};
        const baseX = Math.floor(centre.x()), baseY = Math.floor(centre.y()), baseZ = Math.floor(centre.z());
        const limit = Math.max(6, Math.round(cap)), steps = Math.max(4, Math.round(length / 0.6));
        const side = WorldCombat.point(-direction.z(), 0, direction.x());
        const width = Math.max(1, Math.round(halfWidth));
        for (let step = 0; step <= steps && cells.length < limit; step++) {
            const along = length * step / steps;
            for (let offset = -width; offset <= width && cells.length < limit; offset++) {
                if (Math.abs(offset) > Math.max(0.4, halfWidth)) continue;
                const x = baseX + Math.round(direction.x() * along + side.x() * offset);
                const z = baseZ + Math.round(direction.z() * along + side.z() * offset);
                for (let dy = 1; dy >= -2; dy--) {
                    const y = baseY + dy, block = world.block(WorldCombat.point(x, y, z));
                    if (block === null) break;
                    const id = String(block.id());
                    if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
                    if (id === "minecraft:bedrock" || id === "minecraft:barrier" || id === "minecraft:water" || id === "minecraft:lava") break;
                    const key = x + "," + y + "," + z;
                    if (!seen[key]) {
                        const cracked = stompCracked(id);
                        if (cracked !== "" && cracked !== id) { seen[key] = true; cells.push({ x: x, y: y, z: z, block: cracked }); }
                    }
                    break;
                }
            }
        }
        if (!cells.length) return 0;
        try { world.terrain(JSON.stringify({ cells: cells, replace: true, linger: true }), ticks); }
        catch (error) { return 0; }
        return cells.length;
    }

    define({
        id: stompId,
        cooldownParameter: "recharge",
        name: "Stomping Tantrum",
        description: "Driven by frustration, the user attacks the target. This move's power is doubled if the user's previous move failed.",
        uses: ["朝目标跺开一条地裂", "把站在缝上的人掀起来", "上一次打空后打出翻倍的一脚"],
        kind: "enemy",
        range: 6.0,
        maxRange: 6.4,
        prepare: 9,
        active: 0,
        recover: 8,
        cooldown: 30,
        style: "quake",
        defaults: { deep: false, ai: { maxChase: 7, punishWhiff: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(stompId, "fissure", pokemon) : 6.0, geometry: "line", style: "quake",
                color: 0x9A6B3A, label: config && config.deep === true ? "深跺" : "跺脚" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[stompId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const deep = !!(config && config.deep);
            return {
                prepare: Math.round(p(stompId, "tempo", context)),
                recover: Math.round(p(stompId, "settle", context)),
                cooldown: Math.round(p(stompId, "recharge", context)),
                active: 0,
                range: p(stompId, "fissure", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:stompingtantrum:stomp", stompScene, 1, action.origin(),
                JSON.stringify({ moment: "stomp", deep: config && config.deep === true, windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            if (body === null) { done(action); return; }
            const centre = body.position();
            const goal = action.targetPosition();
            const direction = aim(action);
            const gap = goal.minus(centre).length();
            const length = Math.max(1.4, Math.min(p(stompId, "fissure", action), gap + 0.6));
            const half = p(stompId, "halfWidth", action);
            const power = p(stompId, "tremor", action);
            const launch = p(stompId, "launch", action);
            const shove = p(stompId, "shove", action);
            const shock = p(stompId, "shock", action);
            const flows = Math.max(6, Math.round(p(stompId, "flows", action)));
            const rentTicks = Math.max(40, Math.round(p(stompId, "rentTicks", action)));
            const rentCells = Math.max(6, Math.round(p(stompId, "rentCells", action)));
            const doubled = CombatStatus.has(world, actor, stompStatus);
            const scale = Math.max(0.5, Math.min(1.8, half / 0.7));
            const intensity = Math.max(0.5, Math.min(2.4, power / 75));
            const end = centre.plus(direction.scale(length));
            let hits = 0;

            sound(action, "minecraft:item.mace.smash_ground_heavy");
            WorldFeedback.emit(world, stompScene, 1, centre,
                { moment: "fissure", path: [[centre.x(), centre.y() + 0.08, centre.z()], [end.x(), end.y() + 0.08, end.z()]],
                    flows: flows, scale: scale, doubled: doubled ? 1 : 0, intensity: intensity }, 26);
            sound(action, "cobblemon:impact.ground");

            WorldGeometry.selectEnemies(world, WorldGeometry.lane(centre, direction, length, half, { below: 1.4, above: 2.0 }), function (enemy, facts) {
                if (!facts.grounded()) return;
                if (String(enemy.ref()) === String(actor.ref())) return;
                if (!hurt(action, enemy, stompId, power, { damage: damageSpec(stompId, "tremor"), contact: true })) return;
                hits++;
                const away = facts.position().minus(centre);
                if (world.valid(enemy)) {
                    if (away.length() > 0.2)
                        world.displace(enemy, WorldCombat.point(away.x(), 0, away.z()).unit().scale(shove));
                    world.motion(enemy, WorldCombat.point(0, launch, 0), true);
                }
                WorldFeedback.emit(world, stompScene, 1, facts.position(),
                    { moment: "burst", target: String(enemy.ref()), flows: Math.max(4, Math.round(flows / 2)), scale: scale,
                        doubled: doubled ? 1 : 0, intensity: intensity }, 22);
            });

            if (doubled) {
                WorldFeedback.emit(world, stompScene, 1, end,
                    { moment: "collapse", shock: shock, flows: flows, scale: Math.max(0.6, Math.min(2, shock / 1.3)), intensity: intensity }, 24);
                sound(action, "minecraft:entity.iron_golem.attack");
            }
            const placed = stompRent(world, centre, direction, length, half, rentTicks, rentCells);
            WorldFeedback.emit(world, stompScene, 1, centre,
                { moment: "rent", path: [[centre.x(), centre.y() + 0.05, centre.z()], [end.x(), end.y() + 0.05, end.z()]],
                    radius: length, cells: placed, doubled: doubled ? 1 : 0, intensity: intensity }, 28);
            WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 1.15, 0)),
                doubled ? stompRageText : hits > 0 ? stompHitText : stompMissText, doubled || hits > 0 ? [hits] : [], 26);
            done(action);
        }
    });
}
