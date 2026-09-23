/**
 * 大爆炸 / explosion 的出手方式。
 *
 * 核心念头：压地蓄力，地面从脚下裂开、光从缝里漏出，然后一次放手炸成一朵顶天立地的火球——
 *   外圈冲击环贴着地面横扫出去，圈里所有人被狠狠掀飞、抛起，尘埃落定后留下一片焦黑弹坑。
 *   它和自爆是同一件事的两个量级：更大、更慢、掀得更远、还留坑。
 *
 * 与同族分开：自爆更小更快、反应时间更短、几乎不留东西；大爆炸的蓄爆窗口长到对手有机会打断，
 *   换来最重的一击与最远的掀飞，以及一个会留一会儿的弹坑。
 *
 * 三幕：
 *   起（windup，提交前）：地面从脚下裂开、光从缝里漏出、尘絮向内收——只播预告，可被打断。
 *   爆（detonate → shock → hit）：提交后原地炸开；圈内的非友方各挨一次 `blast`，被向外掀飞 `knock`、
 *       向上抛起 `lift`；地面按 `craterCells` 留下焦黑弹坑（租借，到期原方块回来）。
 *   坑（crater / miss）：尘与余烬落下；一个人都没炸到也照样倒下——原生 `selfdestruct: "always"`。
 *
 * 提交即结清 PP 与冷却；收招为 0，倒下即动作结束。
 */
namespace PokemonSkills {
    const explosionScene = "world_combat:move_explosion";
    const explosionHitText = "world_combat.move.explosion.text.hit";
    const explosionMissText = "world_combat.move.explosion.text.miss";

    /** 弹坑形态：可炸的表层一律烧成黑石，水／岩浆／基岩不动。 */
    function explosionCharred(id: string): string {
        if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") return "";
        if (id === "minecraft:bedrock" || id === "minecraft:barrier" || id === "minecraft:water" || id === "minecraft:lava") return "";
        return "minecraft:blackstone";
    }

    /** 从爆点向外把地表烧成一个弹坑；只动表层可换方块，租借 `linger`，到期原方块回来。 */
    function explosionCrater(world: CombatWorld, point: CombatPoint, radius: number, ticks: number, cap: number): number {
        const cells: any[] = [], seen: { [key: string]: boolean } = {};
        const baseX = Math.floor(point.x()), baseY = Math.floor(point.y()), baseZ = Math.floor(point.z());
        const limit = Math.max(6, Math.round(cap)), r = Math.ceil(radius);
        for (let dx = -r; dx <= r && cells.length < limit; dx++) for (let dz = -r; dz <= r && cells.length < limit; dz++) {
            if (dx * dx + dz * dz > radius * radius) continue;
            const x = baseX + dx, z = baseZ + dz;
            for (let dy = 1; dy >= -2; dy--) {
                const y = baseY + dy, block = world.block(WorldCombat.point(x, y, z));
                if (block === null) break;
                const id = String(block.id());
                if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
                const key = x + "," + y + "," + z;
                const charred = explosionCharred(id);
                if (charred !== "" && charred !== id && !seen[key]) { seen[key] = true; cells.push({ x: x, y: y, z: z, block: charred }); }
                break;
            }
        }
        if (!cells.length) return 0;
        try { return JSON.parse(world.terrainResult(JSON.stringify({ cells: cells, replace: true, linger: true, bestEffort: true }), ticks)).placed.length; }
        catch (error) { return 0; }
    }

    define({
        id: "explosion",
        cooldownParameter: "recharge",
        name: "Explosion",
        description: "引发大爆炸，攻击自己周围所有的宝可梦，使用后自己陷入濒死。圈内的敌人被狠狠掀飞、抛起，地面留下焦黑弹坑；即使一个人都没炸到，使用者也会倒下。蓄爆式更大更久但起手更长，瞬爆式更快。",
        uses: ["用一条命把一圈人炸成重伤", "把贴身的整圈对手远远掀飞", "在对手来不及走开的窗口里赌最重的一击", "在倒下前留下一个会留一会儿的弹坑"],
        kind: "self",
        range: 5.6,
        maxRange: 8.4,
        prepare: 16,
        active: 0,
        recover: 0,
        cooldown: 90,
        style: "detonation",
        defaults: { charged: false, ai: { maxChase: 7, minFoes: 2, cornered: 0.3 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("explosion", "blastRadius", pokemon), geometry: "area", style: "detonation",
                color: 0xF0A94E, label: config && config.charged === true ? "蓄爆式" : "瞬爆式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["explosion"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.max(6, Math.round(p("explosion", "tempo", context))),
                recover: 0,
                cooldown: Math.max(40, Math.round(p("explosion", "recharge", context))),
                active: skills["explosion"].active,
                range: p("explosion", "blastRadius", context)
            };
        },
        windup: function (action, config, prepare) {
            const body = action.sense().observe(action.actor());
            action.present("explosion:charge", explosionScene, 1, action.origin(), JSON.stringify({
                moment: "charge", charged: config && config.charged === true,
                radius: p("explosion", "blastRadius", action),
                full: body === null || body.maxHealth() <= 0 ? 1 : body.health() / body.maxHealth()
            }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor();
            const body = world.observe(self);
            if (body === null) { done(action); return; }
            const centre = body.position();
            const radius = Math.max(3.4, p("explosion", "blastRadius", action));
            const power = p("explosion", "blast", action);
            const knock = p("explosion", "knock", action);
            const lift = p("explosion", "lift", action);
            const debris = Math.max(16, Math.round(p("explosion", "debris", action)));
            const craterTicks = Math.max(40, Math.round(p("explosion", "craterTicks", action)));
            const craterCells = Math.max(10, Math.round(p("explosion", "craterCells", action)));
            const cap = Math.max(1, Math.round(p("explosion", "maxTargets", action)));
            const scale = radius / 5.6;
            let hits = 0;

            sound(action, "minecraft:entity.generic.explode");
            WorldFeedback.emit(world, explosionScene, 1, centre,
                { moment: "detonate", radius: radius, debris: debris, scale: scale,
                    intensity: Math.max(0.7, Math.min(2.8, power / 250)) }, 36);

            WorldGeometry.selectEnemies(world, WorldGeometry.ring(centre, 0, radius, { below: radius * 0.85, above: radius * 0.85 }),
                function (enemy, facts) {
                    if (hits >= cap) return;
                    if (!hurt(action, enemy, "explosion", power, { damage: damageSpec("explosion", "blast"), area: true })) return;
                    hits++;
                    const away = facts.position().minus(centre);
                    if (world.valid(enemy)) {
                        if (away.length() > 0.2) world.displace(enemy, WorldCombat.point(away.x(), 0, away.z()).unit().scale(knock));
                        if (lift > 0) world.motion(enemy, WorldCombat.point(0, lift, 0), true);
                    }
                    WorldFeedback.emit(world, explosionScene, 1, facts.position(),
                        { moment: "hit", target: String(enemy.ref()), scale: scale, debris: debris }, 26);
                });

            WorldFeedback.emit(world, explosionScene, 1, centre,
                { moment: "shock", radius: radius, scale: scale, debris: debris }, 24);
            const placed = explosionCrater(world, centre, radius, craterTicks, craterCells);
            WorldFeedback.emit(world, explosionScene, 1, centre,
                { moment: hits > 0 ? "crater" : "miss", radius: radius, cells: placed, debris: debris, scale: scale, hits: hits }, 34);
            WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 1.3, 0)),
                hits > 0 ? explosionHitText : explosionMissText, hits > 0 ? [hits] : [], 30);

            // 原生 selfdestruct: "always"——有没有炸到，使用者都用完即陷入濒死。放在最后，倒下即结束。
            const last = world.observe(self);
            if (last !== null) world.health(self, -last.health(), "world_combat:explosion_cost");
            done(action);
        }
    });
}
