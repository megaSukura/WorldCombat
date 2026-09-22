/**
 * 落英缤纷 / petalblizzard 的出手方式。
 *
 * 核心念头：原地转起一阵落英旋风——第一阵风把周围的花瓣与人都朝自己卷拢，后面的几阵把花瓣与面前的
 * 东西一起甩开；每一阵扫过圈里都割一下。它不是一发弹丸，而是一团会先收后放的风暴：留在圈里的人
 * 会被卷过几阵、被割几次，第一阵还把人拽近一点；站到圈外就不再被割。瓣最后落在地上。
 *
 * 三幕（阵数可变）：
 *   起（windup，提交前）：花瓣在身周卷起、打旋的预告。
 *   旋（draw → cut）：提交后第一阵风向内收束，圈内敌人各挨一次 `petal`，并被朝中心拽 `draw`。
 *   甩（lash → cut）：其后每一阵向外甩开，圈内敌人再挨一次 `petal`，并被沿离中心方向甩 `lash`。
 *   落（settle）：风暴走完，被甩出去的花瓣落在地面，停留一会儿后消失。
 *
 * 配置 `cyclone`（回旋式）由 resolve 改时序、由公式改半径与每阵威力：开启＝窄而重、多一阵、拽甩更猛。
 */
namespace PokemonSkills {
    const petalblizzardScene = "world_combat:move_petalblizzard";
    const petalblizzardHitText = "world_combat.move.petalblizzard.text.hit";
    const petalblizzardMissText = "world_combat.move.petalblizzard.text.miss";

    /** 花瓣只落得住在能长草的地表上；石头、沙子上不强行铺瓣。 */
    function petalblizzardSoil(id: string): boolean {
        return id === "minecraft:grass_block" || id === "minecraft:dirt" || id === "minecraft:coarse_dirt" ||
            id === "minecraft:podzol" || id === "minecraft:rooted_dirt" || id === "minecraft:moss_block" ||
            id === "minecraft:mycelium" || id === "minecraft:mud" || id === "minecraft:farmland";
    }

    /** 把被甩出去的花瓣留在表层方块上方；只铺在能长草的地表，到期花瓣消失、原方块回来。 */
    function petalblizzardScatter(world: CombatWorld, point: CombatPoint, radius: number, ticks: number, cap: number): number {
        const cells: any[] = [], seen: { [key: string]: boolean } = {};
        const baseX = Math.floor(point.x()), baseY = Math.floor(point.y()), baseZ = Math.floor(point.z());
        const limit = Math.max(8, Math.round(cap)), r = Math.ceil(radius);
        for (let dx = -r; dx <= r && cells.length < limit; dx++) for (let dz = -r; dz <= r && cells.length < limit; dz++) {
            if (Math.sqrt(dx * dx + dz * dz) > radius) continue;
            const x = baseX + dx, z = baseZ + dz;
            for (let dy = 2; dy >= -3; dy--) {
                const y = baseY + dy, block = world.block(WorldCombat.point(x, y, z));
                if (block === null) break;
                const id = String(block.id());
                if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
                if (!petalblizzardSoil(id)) break;
                const py = y + 1, above = world.block(WorldCombat.point(x, py, z));
                if (above !== null) {
                    const surface = String(above.id()), key = x + "," + py + "," + z;
                    if ((surface === "minecraft:air" || surface === "minecraft:cave_air" || surface === "minecraft:void_air") && !seen[key]) {
                        seen[key] = true;
                        cells.push({ x: x, y: py, z: z, block: "minecraft:pink_petals" });
                    }
                }
                break;
            }
        }
        if (!cells.length) return 0;
        try { world.terrain(JSON.stringify({ cells: cells, linger: true }), ticks); }
        catch (error) { return 0; }
        return cells.length;
    }

    define({
        id: "petalblizzard",
        name: "Petal Blizzard",
        description: "原地转起一阵落英旋风：第一阵把身周的花瓣与敌人朝自己卷拢，其后的几阵把花瓣与面前的东西一起甩开；每一阵都割伤圈内的敌人，站出圈外就不再被割。被甩出去的花瓣会落在地面。回旋式更窄更重、多甩一阵。",
        uses: ["被围住时一次割到一圈并把人甩开", "把冲上来的人拽进再甩出去", "打断贴身的围攻", "在草地上留下落瓣的痕迹"],
        kind: "self",
        range: 4.0,
        maxRange: 6.6,
        prepare: 12,
        active: 0,
        recover: 10,
        cooldown: 34,
        style: "petalstorm",
        defaults: { cyclone: false, ai: { maxChase: 8, minFoes: 2 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("petalblizzard", "stormRadius", pokemon), geometry: "area", style: "petalstorm",
                color: 0xE98BB0, label: config && config.cyclone === true ? "回旋式" : "广旋式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["petalblizzard"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const cyclone = !!(config && config.cyclone);
            return {
                prepare: Math.round(p("petalblizzard", "prepare", context) + (cyclone ? 3 : 0)),
                recover: Math.round(p("petalblizzard", "recover", context)),
                cooldown: Math.round(p("petalblizzard", "cooldown", context) + (cyclone ? 8 : -2)),
                active: skills["petalblizzard"].active,
                range: p("petalblizzard", "stormRadius", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("petalblizzard:gather", petalblizzardScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", area: p("petalblizzard", "stormRadius", action),
                    petals: Math.round(p("petalblizzard", "petals", action) * 0.5), cyclone: config && config.cyclone === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const body = world.observe(action.actor());
            const centre = body !== null ? body.position() : action.origin();
            const radius = Math.max(2.4, p("petalblizzard", "stormRadius", action));
            const power = p("petalblizzard", "petal", action);
            const draw = p("petalblizzard", "draw", action);
            const lash = p("petalblizzard", "lash", action);
            const gusts = Math.max(2, Math.min(4, Math.round(p("petalblizzard", "gusts", action))));
            const interval = Math.max(7, Math.round(p("petalblizzard", "gustTicks", action)));
            const petals = Math.max(12, Math.round(p("petalblizzard", "petals", action)));
            const settleTicks = Math.max(140, Math.round(p("petalblizzard", "settleTicks", action)));
            const cap = Math.max(1, Math.round(p("petalblizzard", "maxTargets", action)));
            const scale = radius / 4.0;
            const touched: { [ref: string]: boolean } = {};
            let index = 0, targets = 0, hits = 0, settled = false;

            /** 一阵风：向内收束（第一阵）或向外甩开（其后）；圈内敌人各挨一次并被带着挪位。 */
            function gust(current: CombatAction): void {
                if (settled) return;
                if (index >= gusts) { finish(current); return; }
                const scope = current.world(), inward = index === 0;
                WorldFeedback.emit(scope, petalblizzardScene, 1, centre,
                    { moment: inward ? "draw" : "lash", radius: radius, scale: scale, petals: petals, pass: index + 1,
                        flow: Math.round(50 + radius * 24), intensity: Math.max(0.5, Math.min(1.8, power / 34)) }, 24);
                WorldGeometry.selectEnemies(scope, WorldGeometry.ring(centre, 0, radius, { below: 2.5, above: 3 }), function (enemy, facts) {
                    const ref = String(enemy.ref());
                    if (ref === String(current.actor().ref())) return;
                    if (!touched[ref]) { if (targets >= cap) return; touched[ref] = true; targets++; }
                    if (!hurt(current, enemy, "petalblizzard", power, { damage: damageSpec("petalblizzard", "petal"), slice: true })) return;
                    hits++;
                    const away = facts.position().minus(centre);
                    if (scope.valid(enemy) && away.length() > 0.15) {
                        const direction = WorldCombat.point(away.x(), 0, away.z()).unit();
                        scope.displace(enemy, inward ? direction.scale(-draw) : direction.scale(lash));
                    }
                    WorldFeedback.emit(scope, petalblizzardScene, 1, facts.position(),
                        { moment: "cut", target: ref, scale: scale, petals: Math.max(4, Math.round(petals * 0.4)),
                            count: Math.round(10 + power * 0.3), inward: inward ? 1 : 0 }, 20);
                });
                index++;
                if (index >= gusts) { finish(current); return; }
                current.after(interval, gust);
            }

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                const placed = petalblizzardScatter(scope, centre, radius, settleTicks, petals);
                WorldFeedback.emit(scope, petalblizzardScene, 1, centre,
                    { moment: "settle", radius: radius, cells: placed, petals: petals, flow: Math.round(30 + placed * 1.4) }, 30);
                WorldFeedback.text(scope, centre.plus(WorldCombat.point(0, 1.3, 0)),
                    hits > 0 ? petalblizzardHitText : petalblizzardMissText, hits > 0 ? [hits] : [], 26);
                done(current);
            }

            sound(action, "cobblemon:move.leafstorm.actor");
            sound(action, "cobblemon:impact.grass");
            gust(action);
        }
    });
}
