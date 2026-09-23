/**
 * 冰锤 / icehammer 的出手方式。
 *
 * 核心念头：**裹冰重锤的一记垂直下砸**——拳面结出厚冰、举起来后垂直砸下；命中时冰壳在目标身上炸开，
 *   把它冻得一滞（挂上共享身份 `world_combat:status/chilled`），落地处结出一片会留一会儿的薄冰；
 *   自己同样因惯性踉跄、速度降一级。对已经冰缓的目标，冰壳碎得更彻底，伤害更高。
 *
 * 三幕（提交前只播预告）：
 *   起（hoist）：拳面凝冰、冰屑向拳心收拢，长前摇、可被打断，只播预告。
 *   砸（slam → chill）：提交后垂直下砸结算正面目标（接触＋拳击 `hammer`），把目标砸退 `knock`；
 *       命中给目标挂上 `chillTicks` 的冰缓（`world_combat:icehammer_chilled`），并浮字。
 *   冻（frost → stagger）：落点结出 `frostRadius` 的薄冰（terrain 租借，linger，到期原方块回来）；
 *       自身速度 −`speedLoss` 级。落空只留扑空的冰屑。
 *
 * 与臂锤分开：臂锤是斗气横挥、砸退更远、地面留裂痕；冰锤是裹冰垂直下砸、砸退小、留冰面并给目标冰缓。
 *
 * 配置 `glaciate` 由公式改威力／冰缓／冰面／时序，由本文件决定结冰与冰缓结算；提交后才触碰世界。
 */
namespace PokemonSkills {
    const icehammerScene = "world_combat:move_icehammer";
    const icehammerChilled = "world_combat:icehammer_chilled";
    const icehammerChillText = "world_combat.move.icehammer.text.chill";
    const icehammerStaggerText = "world_combat.move.icehammer.text.stagger";
    const icehammerMissText = "world_combat.move.icehammer.text.miss";

    /** 在落点把表层换成冰；逐列找地表，只换可换的方块，租借，到期原方块回来（冰面原生会打滑）。 */
    function icehammerFrost(world: CombatWorld, centre: CombatPoint, radius: number, ticks: number): number {
        const cells: any[] = [], r = Math.ceil(radius);
        const baseX = Math.floor(centre.x()), baseY = Math.floor(centre.y()), baseZ = Math.floor(centre.z());
        for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
            if (dx * dx + dz * dz > radius * radius) continue;
            const x = baseX + dx, z = baseZ + dz;
            for (let dy = 2; dy >= -3; dy--) {
                const ground = world.block(WorldCombat.point(x, baseY + dy, z));
                if (ground === null) break;
                const id = String(ground.id());
                if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
                if (id === "minecraft:water" || id === "minecraft:lava" || id === "minecraft:bedrock" || id === "minecraft:barrier") break;
                if (id !== "minecraft:ice" && id !== "minecraft:frosted_ice" && id !== "minecraft:packed_ice") cells.push({ x: x, y: baseY + dy, z: z, block: "minecraft:ice" });
                break;
            }
        }
        if (!cells.length) return 0;
        try { return world.terrain(JSON.stringify({ cells: cells, replace: true, linger: true }), Math.max(40, Math.round(ticks))); }
        catch (error) { return 0; }
    }

    define({
        id: "icehammer",
        cooldownParameter: "recharge",
        name: "Ice Hammer",
        description: "The user swings its strong, heavy fist at the target to inflict damage. This also lowers the user's Speed stat.",
        uses: ["用一记裹冰重砸打硬目标，顺带把它冻慢", "在落点结冰逼对手走位", "对已经冰缓的目标补一记更重的碎冰"],
        kind: "enemy",
        range: 2.6,
        maxRange: 3.6,
        prepare: 15,
        active: 0,
        recover: 11,
        cooldown: 36,
        maximumTicks: 200,
        style: "icehammer",
        defaults: { glaciate: false, ai: { maxChase: 6, chill: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p("icehammer", "reach", pokemon) : 2.6, geometry: "circle", style: "icehammer",
                color: 0x4FA8D8, label: config && config.glaciate === true ? "积冰式" : "碎冰式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["icehammer"], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("icehammer", "tempo", context)),
                recover: Math.round(p("icehammer", "aftercast", context)),
                cooldown: Math.round(p("icehammer", "recharge", context)),
                active: 0,
                range: p("icehammer", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("icehammer:hoist", icehammerScene, 1, action.origin(),
                JSON.stringify({ moment: "hoist", windup: prepare, glaciate: config && config.glaciate === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            const centre = body === null ? action.origin() : body.position();
            const reach = Math.max(1.8, action.range());
            const power = p("icehammer", "hammer", action);
            const knock = p("icehammer", "knock", action);
            const frostRadius = Math.max(0.8, p("icehammer", "frostRadius", action));
            const frostTicks = Math.max(40, Math.round(p("icehammer", "frostTicks", action)));
            const chillTicks = Math.max(40, Math.round(p("icehammer", "chillTicks", action)));
            const shards = Math.max(6, Math.round(p("icehammer", "shards", action)));
            const speedLoss = Math.max(0, Math.round(p("icehammer", "speedLoss", action)));
            const scale = Math.max(0.6, Math.min(2.0, frostRadius / 1.5));
            const intensity = Math.max(0.6, Math.min(2.2, power / 100));
            const target = action.target();
            let at = action.targetPosition();
            let landed = false;

            if (target !== null && world.valid(target)) {
                const foe = world.observe(target);
                if (foe !== null) at = foe.position();
                if (foe !== null && foe.position().minus(centre).length() <= reach + 0.7) {
                    if (hurt(action, target, "icehammer", power, { damage: damageSpec("icehammer", "hammer"), contact: true, punch: true })) {
                        landed = true;
                        const point = world.observe(target) === null ? at : world.observe(target)!.position();
                        WorldFeedback.emit(world, icehammerScene, 1, point,
                            { moment: "slam", target: String(target.ref()), shards: shards, scale: scale, intensity: intensity }, 22);
                        world.sound("cobblemon:impact.ice", point, 15, "{}");
                        const away = point.minus(centre);
                        if (world.valid(target) && away.length() >= 0.05) world.displace(target, away.unit().scale(knock));
                        if (world.valid(target) && MobEffects.apply(world, target, icehammerChilled, chillTicks, 0) !== null) {
                            WorldFeedback.emit(world, icehammerScene, 1, point,
                                { moment: "chill", target: String(target.ref()), shards: shards, scale: scale, intensity: intensity }, 22);
                            WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1.2, 0)), icehammerChillText, [], 28);
                            sound(action, "cobblemon:move.iceshard.actor_1");
                        }
                        at = point;
                    }
                }
            }

            if (landed) {
                const cells = icehammerFrost(world, at, frostRadius, frostTicks);
                WorldFeedback.emit(world, icehammerScene, 1, at,
                    { moment: "frost", cells: cells, radius: frostRadius, shards: shards, scale: scale, intensity: intensity }, 26);
                if (cells > 0) sound(action, "minecraft:block.glass.place");
                NativeEffects.boost(world, actor, "spe", -speedLoss);
                const after = world.observe(actor);
                const above = (after === null ? centre : after.position()).plus(WorldCombat.point(0, 1.3, 0));
                WorldFeedback.emit(world, icehammerScene, 1, above,
                    { moment: "stagger", speedLoss: speedLoss, fatigue: Math.round(10 + speedLoss * 8), intensity: intensity }, 20);
                WorldFeedback.text(world, above, icehammerStaggerText, [speedLoss], 28);
            } else {
                WorldFeedback.emit(world, icehammerScene, 1, at, { moment: "miss", shards: shards, scale: scale }, 20);
                WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.0, 0)), icehammerMissText, [], 22);
                sound(action, "minecraft:block.glass.break");
            }
            done(action);
        }
    });
}
