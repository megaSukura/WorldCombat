/**
 * 大地之力 / earthpower —— 注册与动作。
 *
 * 三幕：
 *   记（mark，提交前）：起手就把要掀的那块地面定下来并标出记号（`action.present` 预告）——这是对手走位的窗口；
 *       选点向下寻找可承载地表，空中落到最远的合法地表，始终不在空中造地震。
 *   爆（erupt → hit）：提交后地脉从记号那一点自下而上崩开；站在这块地上的敌人各结算一次特殊伤害，被向上顶起
 *       `launch`，并按概率用共享 `NativeEffects.boost(..., "spd", -1)` 压低特防；离地的目标从地脉上方过去，
 *       什么也吃不到（原生 nonsky 的翻译）。
 *   痕（rupture）：这一点周围的地面被掀开一小片土石，停留 `ruptureTicks` 后原方块回来。
 *
 * 选取 `kind: "aim"`——自由点地面或方向都能放，可预置敌人将走到的位置；爆发只用起手锁定的同一点，不再追脚。
 * 与同族分开：磨防远击四式里唯一没有飞行物、从地面出手、只打站在地上的目标、并掀开地面的那个。
 * 配置 `fissure`（裂隙式）由 resolve 改时序、由公式改爆发半径／裂痕块数／威力。
 */
namespace PokemonSkills {
    const earthpowerScene = "world_combat:move_earthpower";
    const earthpowerSunderText = "world_combat.move.earthpower.text.sunder";
    const earthpowerMissText = "world_combat.move.earthpower.text.miss";
    const earthpowerSurfaceKey = "world_combat:earthpower/surface";

    /**
     * 从所选点向下找可承载地表（返回地表格中心的点）；直下没有地面时沿 origin→selected 逐步回退，
     * 退回最远的合法地表；仍然没有就返回 null（空中不造地震）。
     */
    function earthpowerSurface(world: CombatWorld, origin: CombatPoint, selected: CombatPoint, drop: number, reach: number): CombatPoint | null {
        function probe(x: number, z: number, fromY: number): CombatPoint | null {
            for (let dy = 1; dy >= -drop; dy--) {
                const block = world.block(WorldCombat.point(x, fromY + dy, z));
                if (block === null) return null;
                const id = String(block.id());
                if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
                if (id === "minecraft:water" || id === "minecraft:lava" || id === "minecraft:bedrock" || id === "minecraft:barrier") return null;
                return WorldCombat.point(x + 0.5, fromY + dy + 1, z + 0.5);
            }
            return null;
        }
        const baseY = Math.floor(selected.y());
        const direct = probe(Math.floor(selected.x()), Math.floor(selected.z()), baseY);
        if (direct !== null) return direct;
        const flat = WorldCombat.point(selected.x() - origin.x(), 0, selected.z() - origin.z());
        const span = flat.length();
        if (span < 0.05) return null;
        const back = flat.scale(1 / span);
        for (let step = 0.75; step <= reach; step += 0.75) {
            const at = selected.minus(back.scale(step));
            const found = probe(Math.floor(at.x()), Math.floor(at.z()), baseY);
            if (found !== null) return found;
        }
        return null;
    }

    /** 被地脉掀开的表层形态：泥土翻成粗土，石头崩成碎石，深板岩崩成深板岩碎石，沙地翻成砂岩。 */
    function earthpowerBroken(id: string): string {
        if (id === "minecraft:grass_block" || id === "minecraft:dirt" || id === "minecraft:coarse_dirt" ||
            id === "minecraft:podzol" || id === "minecraft:rooted_dirt" || id === "minecraft:moss_block") return "minecraft:coarse_dirt";
        if (id === "minecraft:deepslate" || id === "minecraft:cobbled_deepslate") return "minecraft:cobbled_deepslate";
        if (id === "minecraft:stone" || id === "minecraft:granite" || id === "minecraft:diorite" ||
            id === "minecraft:andesite" || id === "minecraft:tuff" || id === "minecraft:gravel") return "minecraft:cobblestone";
        if (id === "minecraft:sand" || id === "minecraft:red_sand") return "minecraft:sandstone";
        return "";
    }

    /** 在目标脚下掀开一小片地脉：只动地表的可换方块，到期原方块回来。 */
    function earthpowerRupture(world: CombatWorld, point: CombatPoint, radius: number, ticks: number, cap: number): number {
        const cells: any[] = [], seen: { [key: string]: boolean } = {};
        const baseX = Math.floor(point.x()), baseY = Math.floor(point.y()), baseZ = Math.floor(point.z());
        const limit = Math.max(6, Math.round(cap)), r = Math.max(1, Math.ceil(radius));
        for (let dx = -r; dx <= r && cells.length < limit; dx++) for (let dz = -r; dz <= r && cells.length < limit; dz++) {
            if (Math.sqrt(dx * dx + dz * dz) > radius) continue;
            const x = baseX + dx, z = baseZ + dz;
            for (let dy = 1; dy >= -3; dy--) {
                const y = baseY + dy, block = world.block(WorldCombat.point(x, y, z));
                if (block === null) break;
                const id = String(block.id());
                if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
                if (id === "minecraft:bedrock" || id === "minecraft:barrier" || id === "minecraft:water" || id === "minecraft:lava") break;
                const key = x + "," + y + "," + z;
                if (!seen[key]) {
                    const broken = earthpowerBroken(id);
                    if (broken !== "" && broken !== id) { seen[key] = true; cells.push({ x: x, y: y, z: z, block: broken }); }
                }
                break;
            }
        }
        if (!cells.length) return 0;
        try { world.terrain(JSON.stringify({ cells: cells, replace: true, linger: true }), ticks); }
        catch (error) { return 0; }
        return cells.length;
    }

    define({
        id: "earthpower",
        name: "Earth Power",
        description: "朝方向或点指定一块地面，起手先记号、随后自下而上崩开：只命中站在上面的敌人，造成特殊伤害并把它们顶起，可能压低特防 1 级；离地的目标从地脉上方过去。地面被掀开一小片，走出记号或飞到空中都能避开。",
        uses: ["隔一段距离在地面掀起一柱地脉", "把站在上面的对手顶离地面", "把落点预置在敌人将走到的位置", "跳过飞行或漂浮的目标，专打站桩的对手"],
        kind: "aim",
        range: 12,
        maxRange: 17,
        prepare: 12,
        active: 0,
        recover: 9,
        cooldown: 30,
        style: "tectonic",
        defaults: { fissure: false, ai: { maxChase: 14, stillFirst: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("earthpower", "burstRadius", pokemon), geometry: "area", style: "tectonic",
                color: 0xA87B3A, label: config && config.fissure === true ? "裂隙大地之力" : "大地之力" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["earthpower"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const fissure = !!(config && config.fissure);
            return {
                prepare: Math.round(p("earthpower", "tempo", context)),
                recover: 9,
                cooldown: 30 + (fissure ? 4 : 0),
                active: 0,
                range: p("earthpower", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            // 起手锁定落点：向下找可承载地表；目标是活物时按短距离速度估计提前量，之后不再追。
            const world = action.sense(), origin = action.origin();
            const radius = Math.max(1.3, p("earthpower", "burstRadius", action));
            let selected = action.targetPosition();
            const target = action.target();
            const body = target !== null && world.valid(target) ? world.observe(target) : null;
            if (body !== null) {
                const velocity = body.velocity();
                const cap = Math.max(1.0, radius * 0.9);
                let lead = WorldCombat.point(velocity.x(), 0, velocity.z()).scale(Math.min(10, Math.max(0, prepare)));
                if (lead.length() > cap) lead = lead.unit().scale(cap);
                selected = body.position().plus(lead);
            }
            const surface = earthpowerSurface(world, origin, selected, 24, action.range());
            const at = surface !== null ? surface : selected;
            action.data(earthpowerSurfaceKey, JSON.stringify(surface === null ? { found: false }
                : { found: true, x: surface.x(), y: surface.y(), z: surface.z() }));
            action.present("world_combat:earthpower:" + action.id(), earthpowerScene, 1, at,
                JSON.stringify({ moment: "mark", radius: radius, fissure: config && config.fissure ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const stored = action.data(earthpowerSurfaceKey);
            let point: CombatPoint | null = null;
            if (stored !== null) {
                const locked = JSON.parse(stored);
                if (locked && locked.found === true) point = WorldCombat.point(locked.x, locked.y, locked.z);
            }
            const power = p("earthpower", "core", action);
            const radius = Math.max(1.3, p("earthpower", "burstRadius", action));
            const launch = p("earthpower", "launch", action);
            const chance = p("earthpower", "sunderChance", action);
            const stages = Math.max(1, Math.round(p("earthpower", "sunderStage", action)));
            const rupture = Math.max(90, Math.round(p("earthpower", "ruptureTicks", action)));
            const cells = Math.max(6, Math.round(p("earthpower", "ruptureCells", action)));
            const shards = Math.max(12, Math.round(p("earthpower", "shards", action)));
            const scale = Math.max(0.6, Math.min(2.4, radius / 1.7));
            const intensity = Math.max(0.5, Math.min(2.2, power / 90));
            const column = Math.max(0.6, Math.min(6, launch * 8));
            let hits = 0;

            if (point === null) {
                // 空中没有可承载地表：只在落点落空，不在空中造地震。
                const at = action.targetPosition();
                WorldFeedback.emit(world, earthpowerScene, 1, at, { moment: "miss", radius: radius, scale: scale }, 20);
                WorldFeedback.text(world, at.plus(WorldCombat.point(0, 0.8, 0)), earthpowerMissText, [], 24);
                sound(action, "minecraft:block.gravel.break");
                done(action);
                return;
            }

            sound(action, "cobblemon:impact.ground");
            // 先掀地再爆发：爆发的碎石数与余痕都读这一次真实放下的块数。
            const placed = earthpowerRupture(world, point, radius * 1.2, rupture, cells);
            WorldFeedback.emit(world, earthpowerScene, 1, point,
                { moment: "erupt", radius: radius, shards: shards, cells: placed, column: column, scale: scale, intensity: intensity }, 30);

            WorldGeometry.selectEnemies(world, WorldGeometry.ring(point, 0, radius, { below: 2.5, above: 2.5 }), function (enemy, facts) {
                if (String(enemy.ref()) === String(action.actor().ref())) return;
                if (!facts.grounded()) return;
                if (!hurt(action, enemy, "earthpower", power, { damage: damageSpec("earthpower", "core") })) return;
                hits++;
                if (world.valid(enemy)) world.hitImpulse(enemy, WorldCombat.point(0, launch, 0));
                WorldFeedback.emit(world, earthpowerScene, 1, facts.position(),
                    { moment: "hit", target: String(enemy.ref()), radius: radius, shards: shards, column: column, scale: scale, intensity: intensity }, 24);
                if (world.valid(enemy) && world.random() < chance) {
                    NativeEffects.boost(world, enemy, "spd", -stages);
                    const at = world.observe(enemy);
                    if (at !== null)
                        WorldFeedback.text(world, at.position().plus(WorldCombat.point(0, 1.2, 0)), earthpowerSunderText, [stages], 30);
                }
            });

            WorldFeedback.emit(world, earthpowerScene, 1, point,
                { moment: "rupture", radius: radius, cells: placed, shards: shards, scale: scale }, 30);
            if (hits === 0)
                WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1.0, 0)), earthpowerMissText, [], 24);
            done(action);
        }
    });
}
