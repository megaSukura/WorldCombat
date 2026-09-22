/**
 * 臂锤 / hammerarm 的出手方式。
 *
 * 核心念头：**过顶横挥的一记重锤**——把整条手臂抡过头顶、借上身重量砸在单个目标身上；砸实那一下把目标
 *   砸退，拳面落地处把地面砸出放射状裂痕，自己则因惯性踉跄、速度降一级。这一记卖的是「一次最重的
 *   原地单体交换」。
 *
 * 三幕（提交前只播预告）：
 *   起（hoist）：手臂高举过顶、拳边聚起斗气，长前摇、可被打断，只播预告。
 *   砸（slam → cleft）：提交后一记下砸结算正面目标（接触＋拳击 `hammer`），把目标沿挥击方向砸退 `knock`；
 *       拳面落点把地面裂出 `cleft` 半径的痕（terrain 租借，linger，到期原方块回来）。
 *   沉（stagger）：命中后自身速度 −`speedLoss` 级并浮字；落空只留扑空的尘。
 *
 * 与同族分开：狂舞挥打是原地转整圈的覆盖、疾速转轮是贴地旋转冲进、冰锤是裹冰垂直下砸留冰面；
 *   臂锤是唯一「横挥斗气重拳 + 砸退 + 地面留裂痕」的原地单体重砸。
 *
 * 配置 `followthrough` 由公式改威力／砸退／裂痕／时序，由本文件决定裂地结算；提交后才触碰世界。
 */
namespace PokemonSkills {
    const hammerarmScene = "world_combat:move_hammerarm";
    const hammerarmStaggerText = "world_combat.move.hammerarm.text.stagger";
    const hammerarmMissText = "world_combat.move.hammerarm.text.miss";

    /** 拳面砸出的裂痕形态：泥土类砸成粗土，石类砸成裂石；其余不动。 */
    function hammerarmBroken(id: string): string {
        if (id === "minecraft:grass_block" || id === "minecraft:dirt" || id === "minecraft:coarse_dirt" ||
            id === "minecraft:podzol" || id === "minecraft:rooted_dirt" || id === "minecraft:moss_block") return "minecraft:coarse_dirt";
        if (id === "minecraft:stone" || id === "minecraft:granite" || id === "minecraft:diorite" ||
            id === "minecraft:andesite" || id === "minecraft:tuff" || id === "minecraft:deepslate" ||
            id === "minecraft:gravel" || id === "minecraft:cobblestone") return "minecraft:cracked_stone_bricks";
        if (id === "minecraft:sand" || id === "minecraft:red_sand") return "minecraft:sandstone";
        return "";
    }

    /** 在落点周围把表层的可换方块砸裂；只动地表，租借，`linger` 活过招式，到期原方块回来。 */
    function hammerarmCleft(world: CombatWorld, centre: CombatPoint, radius: number, ticks: number, cap: number): number {
        const cells: any[] = [], r = Math.ceil(radius), limit = Math.max(4, Math.round(cap));
        const baseX = Math.floor(centre.x()), baseY = Math.floor(centre.y()), baseZ = Math.floor(centre.z());
        for (let dx = -r; dx <= r && cells.length < limit; dx++) for (let dz = -r; dz <= r && cells.length < limit; dz++) {
            if (dx * dx + dz * dz > radius * radius) continue;
            const x = baseX + dx, z = baseZ + dz;
            for (let dy = 1; dy >= -3; dy--) {
                const block = world.block(WorldCombat.point(x, baseY + dy, z));
                if (block === null) break;
                const id = String(block.id());
                if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
                if (id === "minecraft:bedrock" || id === "minecraft:barrier" || id === "minecraft:water" || id === "minecraft:lava") break;
                const surface = hammerarmBroken(id);
                if (surface !== "" && surface !== id) cells.push({ x: x, y: baseY + dy, z: z, block: surface });
                break;
            }
        }
        if (!cells.length) return 0;
        try { return world.terrain(JSON.stringify({ cells: cells, replace: true, linger: true }), Math.max(40, Math.round(ticks))); }
        catch (error) { return 0; }
    }

    define({
        id: "hammerarm",
        name: "Hammer Arm",
        description: "The user swings its strong, heavy fist at the target to inflict damage. This also lowers the user's Speed stat.",
        uses: ["用一记过顶重砸换掉一个硬目标", "把目标砸出阵地、砸退到队友够得到的地方", "砸裂落点地面，留下短命的痕"],
        kind: "enemy",
        range: 2.6,
        maxRange: 3.6,
        prepare: 14,
        active: 0,
        recover: 11,
        cooldown: 34,
        maximumTicks: 200,
        style: "armhammer",
        defaults: { followthrough: false, ai: { maxChase: 6, finish: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p("hammerarm", "reach", pokemon) : 2.6, geometry: "circle", style: "armhammer",
                color: 0xC46A3A, label: config && config.followthrough === true ? "顺势式" : "屏息式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["hammerarm"], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("hammerarm", "tempo", context)),
                recover: Math.round(p("hammerarm", "aftercast", context)),
                cooldown: Math.round(p("hammerarm", "recharge", context)),
                active: 0,
                range: p("hammerarm", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("hammerarm:hoist", hammerarmScene, 1, action.origin(),
                JSON.stringify({ moment: "hoist", windup: prepare, followthrough: config && config.followthrough === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            const centre = body === null ? action.origin() : body.position();
            const reach = Math.max(1.8, action.range());
            const power = p("hammerarm", "hammer", action);
            const knock = p("hammerarm", "knock", action);
            const cleft = Math.max(0.6, p("hammerarm", "cleft", action));
            const dents = Math.max(4, Math.round(p("hammerarm", "dents", action)));
            const speedLoss = Math.max(0, Math.round(p("hammerarm", "speedLoss", action)));
            const scale = Math.max(0.6, Math.min(2.0, cleft / 1.1));
            const intensity = Math.max(0.6, Math.min(2.2, power / 100));
            const target = action.target();
            let at = action.targetPosition();
            let landed = false;

            if (target !== null && world.valid(target)) {
                const foe = world.observe(target);
                if (foe !== null) at = foe.position();
                if (foe !== null && foe.position().minus(centre).length() <= reach + 0.7) {
                    if (hurt(action, target, "hammerarm", power, { damage: damageSpec("hammerarm", "hammer"), contact: true, punch: true })) {
                        landed = true;
                        const point = world.observe(target) === null ? at : world.observe(target)!.position();
                        WorldFeedback.emit(world, hammerarmScene, 1, point,
                            { moment: "slam", target: String(target.ref()), dents: dents, scale: scale, intensity: intensity }, 22);
                        world.sound("cobblemon:impact.fighting", point, 15, "{}");
                        const away = point.minus(centre);
                        if (world.valid(target) && away.length() >= 0.05) world.displace(target, away.unit().scale(knock));
                        at = point;
                    }
                }
            }

            if (landed) {
                const cells = hammerarmCleft(world, at, cleft, 100, dents);
                WorldFeedback.emit(world, hammerarmScene, 1, at,
                    { moment: "cleft", cells: cells, radius: cleft, dents: dents, scale: scale, intensity: intensity }, 24);
                sound(action, "minecraft:block.deepslate.break");
                NativeEffects.boost(world, actor, "spe", -speedLoss);
                const after = world.observe(actor);
                const above = (after === null ? centre : after.position()).plus(WorldCombat.point(0, 1.3, 0));
                WorldFeedback.emit(world, hammerarmScene, 1, above,
                    { moment: "stagger", speedLoss: speedLoss, fatigue: Math.round(10 + speedLoss * 8), intensity: intensity }, 20);
                WorldFeedback.text(world, above, hammerarmStaggerText, [speedLoss], 28);
            } else {
                WorldFeedback.emit(world, hammerarmScene, 1, at, { moment: "miss", dents: dents, scale: scale }, 20);
                WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.0, 0)), hammerarmMissText, [], 22);
                sound(action, "minecraft:entity.player.attack.weak");
            }
            done(action);
        }
    });
}
