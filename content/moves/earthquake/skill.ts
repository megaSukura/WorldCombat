/**
 * 地震 / earthquake 的出手方式。
 *
 * 核心念头：把全身的重量一次砸进地里，脚下整块地面当场隆起、沿几条裂缝崩开——站在那块地上的人被一起
 * 向上抛起并向外推开，空中的目标不沾地所以安全。它比同族的重踏更重、更广、更瞬时：重踏是一圈爬到
 * 脚边的地裂，地震是整片地一次掀起来。
 *
 * 三幕（余震式多一幕）：
 *   起（windup，提交前）：施法者沉身，脚边尘土被震得跳起、地面浮现将被掀开的圈。
 *   掀（rupture → hit）：提交后地面整块掀起；圈内每个站在地上的敌人各挨一次 `tremor`，被向上抛起
 *       `launch`、沿离中心的方向推开 `shove`。空中的目标只看到掀起、吃不到伤害。
 *   痕（rent）：掀完后地面上留下放射状深缝，停留一会儿后原方块回来。
 *   余震（aftershock，仅余震式）：主震后 `aftershockDelay` 刻再掀一次半威力的余震，还没站稳的人再挨一下。
 *
 * 配置 `aftershock`（余震式）由 resolve 改时序、由公式改威力；开启＝主震更轻但补一次余震、起手与冷却更长。
 */
namespace PokemonSkills {
    const earthquakeScene = "world_combat:move_earthquake";
    const earthquakeHitText = "world_combat.move.earthquake.text.hit";
    const earthquakeMissText = "world_combat.move.earthquake.text.miss";

    /** 被掀开的地面形态：泥土类翻成粗土，石头类崩成碎石，深板岩类崩成深板岩碎石，沙地翻成砂岩。 */
    function earthquakeBroken(id: string): string {
        if (id === "minecraft:grass_block" || id === "minecraft:dirt" || id === "minecraft:coarse_dirt" ||
            id === "minecraft:podzol" || id === "minecraft:rooted_dirt" || id === "minecraft:moss_block") return "minecraft:coarse_dirt";
        if (id === "minecraft:deepslate" || id === "minecraft:cobbled_deepslate") return "minecraft:cobbled_deepslate";
        if (id === "minecraft:stone" || id === "minecraft:granite" || id === "minecraft:diorite" ||
            id === "minecraft:andesite" || id === "minecraft:tuff" || id === "minecraft:gravel") return "minecraft:cobblestone";
        if (id === "minecraft:sand" || id === "minecraft:red_sand") return "minecraft:sandstone";
        return "";
    }

    /** 放射状的深缝：从中心向 `rays` 个方向各切一条，再沿外缘补一圈；只动地表的可换方块，到期原方块回来。 */
    function earthquakeRent(world: CombatWorld, point: CombatPoint, radius: number, ticks: number, cap: number): number {
        const cells: any[] = [], seen: { [key: string]: boolean } = {};
        const baseX = Math.floor(point.x()), baseY = Math.floor(point.y()), baseZ = Math.floor(point.z());
        const limit = Math.max(8, Math.round(cap)), rays = 6, step = Math.max(0.8, radius / 9);

        function surface(x: number, z: number): void {
            if (cells.length >= limit) return;
            for (let dy = 1; dy >= -3; dy--) {
                const y = baseY + dy, block = world.block(WorldCombat.point(x, y, z));
                if (block === null) break;
                const id = String(block.id());
                if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
                if (id === "minecraft:bedrock" || id === "minecraft:barrier" || id === "minecraft:water" || id === "minecraft:lava") break;
                const key = x + "," + y + "," + z;
                if (!seen[key]) {
                    const broken = earthquakeBroken(id);
                    if (broken !== "" && broken !== id) { seen[key] = true; cells.push({ x: x, y: y, z: z, block: broken }); }
                }
                break;
            }
        }

        for (let ray = 0; ray < rays && cells.length < limit; ray++) {
            const angle = ray * (Math.PI * 2 / rays) + 0.35, dx = Math.cos(angle), dz = Math.sin(angle);
            for (let d = 1; d * step <= radius && cells.length < limit; d++)
                surface(baseX + Math.round(dx * d * step), baseZ + Math.round(dz * d * step));
        }
        const rim = Math.max(8, Math.round(radius * 2.4));
        for (let i = 0; i < rim && cells.length < limit; i++) {
            const angle = i * (Math.PI * 2 / rim) + 0.2;
            surface(baseX + Math.round(Math.cos(angle) * radius), baseZ + Math.round(Math.sin(angle) * radius));
        }
        if (!cells.length) return 0;
        try { world.terrain(JSON.stringify({ cells: cells, replace: true, linger: true }), ticks); }
        catch (error) { return 0; }
        return cells.length;
    }

    define({
        requiresGround: true,
        id: "earthquake",
        name: "Earthquake",
        description: "把重量砸进大地，脚下整片地面同时掀起：只命中站在地上的敌人，被掀中的人向上抛起并被向外推开；掀完在地面留下放射状深缝。余震式主震更轻，但过一会儿再掀一次。",
        uses: ["一次掀到身周一圈站在地上的敌人", "打断贴身的围攻、把人掀离地面", "跳过空中的目标，专打站桩的对手", "在地面留下裂缝标出下一次交战区"],
        kind: "self",
        range: 4.6,
        maxRange: 7.4,
        prepare: 14,
        active: 0,
        recover: 10,
        cooldown: 40,
        style: "quake",
        defaults: { aftershock: false, ai: { maxChase: 8, minFoes: 2 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("earthquake", "fissureRadius", pokemon), geometry: "area", style: "quake",
                color: 0x9A6B3A, label: config && config.aftershock === true ? "余震式" : "单震式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["earthquake"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const aftershock = !!(config && config.aftershock);
            return {
                prepare: Math.round(p("earthquake", "prepare", context) + (aftershock ? 4 : 0)),
                recover: Math.round(p("earthquake", "recover", context)),
                cooldown: Math.round(p("earthquake", "cooldown", context) + (aftershock ? 10 : 0)),
                active: skills["earthquake"].active,
                range: p("earthquake", "fissureRadius", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("earthquake:stomp", earthquakeScene, 1, action.origin(),
                JSON.stringify({ moment: "stomp", area: p("earthquake", "fissureRadius", action),
                    aftershock: config && config.aftershock === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const body = world.observe(action.actor());
            const centre = body !== null ? body.position() : action.origin();
            const radius = Math.max(2.8, p("earthquake", "fissureRadius", action));
            const power = p("earthquake", "tremor", action);
            const launch = p("earthquake", "launch", action);
            const shove = p("earthquake", "shove", action);
            const rentTicks = Math.max(100, Math.round(p("earthquake", "rentTicks", action)));
            const cells = Math.max(16, Math.round(p("earthquake", "rentCells", action)));
            const cap = Math.max(1, Math.round(p("earthquake", "maxTargets", action)));
            const aftershock = !!(config && config.aftershock);
            const delay = Math.max(5, Math.round(p("earthquake", "aftershockDelay", action)));
            const scale = radius / 4.6;
            const struck: { [ref: string]: boolean } = {};
            let hits = 0, settled = false;

            /** 一次掀地：圈内每个还站在地上的敌人各挨一记，被向上抛起并向外推开。 */
            function rupture(current: CombatAction, amount: number, moment: string): void {
                const scope = current.world();
                WorldGeometry.selectEnemies(scope, WorldGeometry.ring(centre, 0, radius, { below: 2.5, above: 2.5 }), function (enemy, facts) {
                    const ref = String(enemy.ref());
                    if (ref === String(current.actor().ref()) || hits >= cap) return;
                    if (!facts.grounded()) return;
                    if (moment === "aftershock" && struck[ref]) return;
                    struck[ref] = true;
                    if (!hurt(current, enemy, "earthquake", amount, { damage: damageSpec("earthquake", "tremor") })) return;
                    hits++;
                    const away = facts.position().minus(centre);
                    if (scope.valid(enemy)) {
                        if (away.length() > 0.2) scope.displace(enemy, WorldCombat.point(away.x(), 0, away.z()).unit().scale(shove));
                        scope.motion(enemy, WorldCombat.point(0, launch, 0), true);
                    }
                    WorldFeedback.emit(scope, earthquakeScene, 1, facts.position(),
                        { moment: "hit", target: ref, scale: scale, intensity: Math.max(0.5, Math.min(2.2, amount / 95)), count: Math.round(12 + amount * 0.28) }, 24);
                });
            }

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                const placed = earthquakeRent(scope, centre, radius, rentTicks, cells);
                WorldFeedback.emit(scope, earthquakeScene, 1, centre,
                    { moment: "rent", radius: radius, cells: placed, ruptured: hits, flow: Math.round(36 + placed * 1.6) }, 30);
                WorldFeedback.text(scope, centre.plus(WorldCombat.point(0, 1.2, 0)),
                    hits > 0 ? earthquakeHitText : earthquakeMissText, hits > 0 ? [hits] : [], 26);
                done(current);
            }

            sound(action, "minecraft:item.mace.smash_ground_heavy");
            WorldFeedback.emit(world, earthquakeScene, 1, centre,
                { moment: "rupture", radius: radius, scale: scale, ruptured: 0,
                    intensity: Math.max(0.6, Math.min(2.4, power / 95)), cells: cells,
                    marks: Math.round(14 + power * 0.3), flow: Math.round(60 + radius * 26) }, 28);
            sound(action, "cobblemon:impact.ground");
            rupture(action, power, "rupture");

            if (!aftershock) { finish(action); return; }
            action.after(delay, function (next: CombatAction) {
                WorldFeedback.emit(next.world(), earthquakeScene, 1, centre,
                    { moment: "aftershock", radius: radius * 0.85, scale: scale, cells: Math.round(cells * 0.5),
                        marks: Math.round(8 + power * 0.15), flow: Math.round(40 + radius * 18) }, 24);
                sound(next, "cobblemon:impact.ground");
                rupture(next, power * 0.5, "aftershock");
                finish(next);
            });
        }
    });
}
