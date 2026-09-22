/**
 * 自爆 / selfdestruct 的出手方式。
 *
 * 核心念头：把身体当场炸成一颗紧凑的白热球——起手身体急涨、缝里透光，提交后从原地炸开，
 *   圈里所有人各挨一记、被向外掀开，施法者自己随之倒下。它是用一条命换来的一记近身重击。
 *
 * 与同族分开：大爆炸更大更慢、炸完留焦黑弹坑；搏命只打贴身一个、伤害等于自己当前生命；
 *   临别礼物不打伤害、把命换成削弱与遗念。自爆是三者里最快的、范围最小的一颗。
 *
 * 三幕：
 *   起（windup，提交前）：身体急涨、裂开发光的缝，只播预告（可被打断，打断则不花任何代价）。
 *   爆（detonate → hit）：提交后原地炸开；圈内的非友方各挨一次 `blast`，被向外掀开 `knock`、
 *       向上抛起 `lift`；地面按 `scorchCells` 留下炸焦的痕迹（租借，到期原方块回来）。
 *   落（scorch / miss）：尘落定；一个人都没炸到也照样倒下——原生 `selfdestruct: "always"`。
 *
 * 提交即结清 PP 与冷却；收招为 0，倒下即动作结束。
 */
namespace PokemonSkills {
    const selfdestructScene = "world_combat:move_selfdestruct";
    const selfdestructHitText = "world_combat.move.selfdestruct.text.hit";
    const selfdestructMissText = "world_combat.move.selfdestruct.text.miss";

    /** 被炸开的地表形态：泥土类炸成粗土，石头类崩成圆石，深板岩崩成深板岩碎石，沙地炸成砂岩。 */
    function selfdestructScorched(id: string): string {
        if (id === "minecraft:grass_block" || id === "minecraft:dirt" || id === "minecraft:coarse_dirt" ||
            id === "minecraft:podzol" || id === "minecraft:rooted_dirt" || id === "minecraft:moss_block") return "minecraft:coarse_dirt";
        if (id === "minecraft:deepslate" || id === "minecraft:cobbled_deepslate") return "minecraft:cobbled_deepslate";
        if (id === "minecraft:stone" || id === "minecraft:granite" || id === "minecraft:diorite" ||
            id === "minecraft:andesite" || id === "minecraft:tuff" || id === "minecraft:gravel") return "minecraft:cobblestone";
        if (id === "minecraft:sand" || id === "minecraft:red_sand") return "minecraft:sandstone";
        return "";
    }

    /** 把爆点周围的地表炸焦；只动地表的可换方块，租借 `linger`，到期原方块回来。 */
    function selfdestructScorch(world: CombatWorld, point: CombatPoint, radius: number, ticks: number, cap: number): number {
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
                if (id === "minecraft:bedrock" || id === "minecraft:barrier" || id === "minecraft:water" || id === "minecraft:lava") break;
                const key = x + "," + y + "," + z;
                if (!seen[key]) {
                    const scorched = selfdestructScorched(id);
                    if (scorched !== "" && scorched !== id) { seen[key] = true; cells.push({ x: x, y: y, z: z, block: scorched }); }
                }
                break;
            }
        }
        if (!cells.length) return 0;
        try { return JSON.parse(world.terrainResult(JSON.stringify({ cells: cells, replace: true, linger: true, bestEffort: true }), ticks)).placed.length; }
        catch (error) { return 0; }
    }

    define({
        id: "selfdestruct",
        name: "Self-Destruct",
        description: "引发爆炸，攻击自己周围所有的宝可梦，使用后自己陷入濒死。圈内的敌人被向外掀开、抛起一点，地面留下炸焦的痕迹；即使一个人都没炸到，使用者也会倒下。聚爆式更狠更窄，扩散式更广更快。",
        uses: ["被围住时用一条命炸开一圈人", "把贴身的对手连同身位一起掀飞", "在极短起手里抢在对手走开前炸响", "在倒下前最后一次重创对手"],
        kind: "self",
        range: 4.0,
        maxRange: 6.4,
        prepare: 12,
        active: 0,
        recover: 0,
        cooldown: 70,
        style: "blast",
        defaults: { focus: false, ai: { maxChase: 6, minFoes: 2, cornered: 0.35 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("selfdestruct", "blastRadius", pokemon), geometry: "area", style: "blast",
                color: 0xE8A24A, label: config && config.focus === true ? "聚爆式" : "扩散式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["selfdestruct"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.max(4, Math.round(p("selfdestruct", "tempo", context))),
                recover: 0,
                cooldown: Math.max(30, Math.round(p("selfdestruct", "recharge", context))),
                active: skills["selfdestruct"].active,
                range: p("selfdestruct", "blastRadius", context)
            };
        },
        windup: function (action, config, prepare) {
            const body = action.sense().observe(action.actor());
            action.present("selfdestruct:swell", selfdestructScene, 1, action.origin(), JSON.stringify({
                moment: "swell", focus: config && config.focus === true,
                radius: p("selfdestruct", "blastRadius", action),
                full: body === null || body.maxHealth() <= 0 ? 1 : body.health() / body.maxHealth()
            }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor();
            const body = world.observe(self);
            if (body === null) { done(action); return; }
            const centre = body.position();
            const radius = Math.max(2.4, p("selfdestruct", "blastRadius", action));
            const power = p("selfdestruct", "blast", action);
            const knock = p("selfdestruct", "knock", action);
            const lift = p("selfdestruct", "lift", action);
            const debris = Math.max(10, Math.round(p("selfdestruct", "debris", action)));
            const scorchTicks = Math.max(30, Math.round(p("selfdestruct", "scorchTicks", action)));
            const scorchCells = Math.max(6, Math.round(p("selfdestruct", "scorchCells", action)));
            const cap = Math.max(1, Math.round(p("selfdestruct", "maxTargets", action)));
            const scale = radius / 4.0;
            let hits = 0;

            sound(action, "minecraft:entity.generic.explode");
            WorldFeedback.emit(world, selfdestructScene, 1, centre,
                { moment: "detonate", radius: radius, debris: debris, scale: scale,
                    intensity: Math.max(0.6, Math.min(2.6, power / 200)) }, 32);

            WorldGeometry.selectEnemies(world, WorldGeometry.ring(centre, 0, radius, { below: radius * 0.8, above: radius * 0.8 }),
                function (enemy, facts) {
                    if (hits >= cap) return;
                    if (!hurt(action, enemy, "selfdestruct", power, { damage: damageSpec("selfdestruct", "blast"), area: true })) return;
                    hits++;
                    const away = facts.position().minus(centre);
                    if (world.valid(enemy)) {
                        if (away.length() > 0.2) world.displace(enemy, WorldCombat.point(away.x(), 0, away.z()).unit().scale(knock));
                        if (lift > 0) world.motion(enemy, WorldCombat.point(0, lift, 0), true);
                    }
                    WorldFeedback.emit(world, selfdestructScene, 1, facts.position(),
                        { moment: "hit", target: String(enemy.ref()), scale: scale, debris: debris }, 24);
                });

            const placed = selfdestructScorch(world, centre, radius, scorchTicks, scorchCells);
            WorldFeedback.emit(world, selfdestructScene, 1, centre,
                { moment: hits > 0 ? "scorch" : "miss", radius: radius, cells: placed, debris: debris, scale: scale, hits: hits }, 30);
            WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 1.2, 0)),
                hits > 0 ? selfdestructHitText : selfdestructMissText, hits > 0 ? [hits] : [], 28);

            // 原生 selfdestruct: "always"——有没有炸到，使用者都用完即陷入濒死。放在最后，倒下即结束。
            const last = world.observe(self);
            if (last !== null) world.health(self, -last.health(), "world_combat:selfdestruct_cost");
            done(action);
        }
    });
}
