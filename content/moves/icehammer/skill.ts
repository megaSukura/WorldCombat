/**
 * 冰锤 / icehammer 的出手方式。
 *
 * 核心念头：**裹冰重锤的一记垂直下砸**——拳面结出厚冰、举起来后自由瞄准砸下；沿真实短拳路先碰到谁就砸谁，
 *   冰壳在目标身上炸开，把它冻得一滞（挂上共享身份 `world_combat:status/chilled`），拳面真实接触点的下方可达
 *   自然地表结出一片会留一会儿、真会打滑的整块冰；自己同样因惯性按实际事实降速。对已经冰缓的目标，冰壳
 *   碎得更彻底，伤害更高。
 *
 * 三幕（提交前只播预告）：
 *   起（hoist）：拳面凝冰、冰屑向拳心收拢，长前摇、可被打断，只播预告。
 *   砸（swing → slam/wall/miss）：提交后自由瞄准，沿真实短拳路 `trace` 首个接触；先碰实体且伤害成立才把目标
 *       砸退 `knock`、挂 `chillTicks` 的冰缓；碰真墙只在墙面碎冰，不伤墙后的人。
 *   冻（frost → stagger）：拳面真实接触点下方可达的**自然暴露地表**结出 `frostRadius` 的冰（terrain 租借，
 *       按 `terrainResult` 真实结果计数，机器／容器等非自然地材不动），自己按实际事实降速。没有地面就只碎冰。
 *
 * 与臂锤分开：臂锤是斗气横挥、砸退更远、留真实接触地材尘线；冰锤是裹冰垂直下砸、砸退小、留冰面并给目标冰缓。
 *
 * 配置 `glaciate` 由公式改威力／冰缓／冰面／时序，由本文件决定结冰与冰缓结算；提交后才触碰世界。
 */
namespace PokemonSkills {
    const icehammerScene = "world_combat:move_icehammer";
    const icehammerChilled = "world_combat:icehammer_chilled";
    const icehammerChillText = "world_combat.move.icehammer.text.chill";
    const icehammerStaggerText = "world_combat.move.icehammer.text.stagger";
    const icehammerMissText = "world_combat.move.icehammer.text.miss";

    /** 拳面接触点下方可达的真实地表；没有地面（空中目标）返回值 null。 */
    function icehammerSurface(world: CombatWorld, at: CombatPoint): CombatPoint | null {
        const bx = Math.floor(at.x()), bz = Math.floor(at.z()), by = Math.floor(at.y()) + 1;
        for (let dy = by; dy >= by - 4; dy--) {
            const block = world.block(WorldCombat.point(bx, dy, bz));
            if (block === null) return null;
            const id = String(block.id());
            if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
            if (id === "minecraft:water" || id === "minecraft:lava" || id === "minecraft:bedrock" || id === "minecraft:barrier") return null;
            return WorldCombat.point(bx, dy, bz);
        }
        return null;
    }

    /** 正式允许的自然暴露地表：只在这些支持格上结冰，机器、容器等非自然地材一律不动。 */
    function icehammerSurfaceAllowed(block: CombatBlock | null): boolean {
        if (block === null) return false;
        if (block.tagged("minecraft:dirt") || block.tagged("minecraft:base_stone_overworld")
            || block.tagged("minecraft:sand") || block.tagged("minecraft:snow")
            || block.tagged("minecraft:terracotta") || block.tagged("minecraft:substrate_overworld")) return true;
        const id = String(block.id());
        return id === "minecraft:grass_block" || id === "minecraft:podzol" || id === "minecraft:mycelium"
            || id === "minecraft:moss_block" || id === "minecraft:snow_block" || id === "minecraft:gravel"
            || id === "minecraft:packed_ice" || id === "minecraft:ice" || id === "minecraft:clay";
    }

    /** 在真实接触地表的周围铺整块冰；只换正式允许的自然支持格，租借，按 terrain 真实结果计数。 */
    function icehammerFrost(world: CombatWorld, centre: CombatPoint, radius: number, ticks: number): number {
        const cells: any[] = [], r = Math.ceil(radius), limit = Math.max(4, Math.min(48, Math.ceil(Math.PI * radius * radius)));
        const baseX = Math.floor(centre.x()), baseY = Math.floor(centre.y()), baseZ = Math.floor(centre.z());
        for (let dx = -r; dx <= r && cells.length < limit; dx++) for (let dz = -r; dz <= r && cells.length < limit; dz++) {
            if (dx * dx + dz * dz > radius * radius) continue;
            const x = baseX + dx, z = baseZ + dz;
            for (let dy = 1; dy >= -2; dy--) {
                const ground = world.block(WorldCombat.point(x, baseY + dy, z));
                if (ground === null) break;
                const id = String(ground.id());
                if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
                if (id === "minecraft:water" || id === "minecraft:lava" || id === "minecraft:bedrock" || id === "minecraft:barrier") break;
                if (id !== "minecraft:ice" && id !== "minecraft:frosted_ice" && id !== "minecraft:packed_ice"
                    && icehammerSurfaceAllowed(ground)) cells.push({ x: x, y: baseY + dy, z: z, block: "minecraft:ice" });
                break;
            }
        }
        if (!cells.length) return 0;
        try {
            const receipt = JSON.parse(String(world.terrainResult(JSON.stringify({ cells: cells, replace: true, linger: true }), Math.max(40, Math.round(ticks)))));
            return receipt && receipt.placed && receipt.placed.length ? receipt.placed.length : 0;
        } catch (error) { return 0; }
    }

    define({
        id: "icehammer",
        cooldownParameter: "recharge",
        name: "Ice Hammer",
        description: "自由瞄准一记裹冰重锤：沿真实短拳路先碰到谁就砸谁，命中把目标砸退、给它挂上冰缓（移动速度降低 15%），拳面真实接触点下方可达的自然地表结出一圈会打滑的整块冰留一会儿；自己按实际事实降速。对已经冰缓的目标，这一记伤害更高。没有地面就只碎冰；机器与容器等非自然地材不会被换冰。积冰式冰缓更久、冰面更大，代价是单发更轻、出手更慢。",
        uses: ["用一记裹冰重砸打硬目标，顺带把它冻慢", "在真实接触点的自然地表结冰逼对手走位", "对已经冰缓的目标补一记更重的碎冰"],
        kind: "aim",
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
            return { radius: pokemon ? p("icehammer", "reach", pokemon) : 2.6, geometry: "line", style: "icehammer",
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
            if (body === null) { done(action); return; }
            const centre = body.position();
            const dir = aim(action);
            const reach = Math.max(1.8, action.range());
            const knock = p("icehammer", "knock", action);
            const frostRadius = Math.max(0.8, p("icehammer", "frostRadius", action));
            const frostTicks = Math.max(40, Math.round(p("icehammer", "frostTicks", action)));
            const chillTicks = Math.max(40, Math.round(p("icehammer", "chillTicks", action)));
            const shards = Math.max(6, Math.round(p("icehammer", "shards", action)));
            const speedLoss = Math.max(0, Math.round(p("icehammer", "speedLoss", action)));
            const scale = Math.max(0.6, Math.min(2.0, frostRadius / 1.5));
            const baseIntensity = Math.max(0.6, Math.min(2.2, p("icehammer", "hammer", action) / 100));
            const gauge = Math.max(0.3, Math.min(1.0, body.width() * 0.5));
            const start = centre.plus(dir.scale(0.15));
            const rawEnd = centre.plus(dir.scale(reach));

            /** 真实接触点下方可达地表结冰；按 terrain 真实结果计数，没铺成就不报冰面。 */
            function freeze(current: CombatAction, at: CombatPoint): number {
                if (!world.valid(actor)) return 0;
                const surface = icehammerSurface(world, at);
                if (surface === null) return 0;
                const cells = icehammerFrost(current.world(), surface, frostRadius, frostTicks);
                if (cells > 0) {
                    WorldFeedback.emit(current.world(), icehammerScene, 1, surface,
                        { moment: "frost", cells: cells, radius: frostRadius, shards: shards, scale: scale }, 26);
                    current.world().sound("minecraft:block.glass.place", surface, 14, "{}");
                }
                return cells;
            }

            /** 命中且真的降了速才显示实际降级；已在最低速时不报固定降 1。 */
            function stagger(current: CombatAction): void {
                const scope = current.world();
                const applied = NativeEffects.boost(scope, actor, "spe", -speedLoss);
                if (applied === 0) return;
                const after = scope.observe(actor);
                const above = (after === null ? centre : after.position()).plus(WorldCombat.point(0, 1.3, 0));
                WorldFeedback.emit(scope, icehammerScene, 1, above,
                    { moment: "stagger", speedLoss: Math.abs(applied), fatigue: Math.round(10 + Math.abs(applied) * 8), intensity: baseIntensity }, 20);
                WorldFeedback.text(scope, above, icehammerStaggerText, [Math.abs(applied)], 28);
            }

            // 真实短拳路：从身体沿瞄准方向（含俯仰）伸出，首碰实体或真墙即止；判定与表现共用同一终点。
            const contact = action.trace(start, rawEnd, gauge, true);
            const end = contact.hitEntity() || contact.blocked() ? contact.position() : rawEnd;
            WorldFeedback.emit(world, icehammerScene, 1, start,
                { moment: "swing", path: [[start.x(), start.y(), start.z()], [end.x(), end.y(), end.z()]],
                    direction: [dir.x(), dir.y(), dir.z()], shards: shards, scale: scale, intensity: baseIntensity }, 18);

            if (contact.hitEntity()) {
                let victim = contact.target();
                if (victim !== null && (String(victim.ref()) === String(actor.ref()) || world.friendly(victim))) victim = null;
                if (victim === null) { done(action); return; }
                // 冰缓加成在实际受击者当前状态上求值，而不是提交时选中的那一个。
                const power = p("icehammer", "hammer", withTarget(factContext(action), victim));
                const landed = hurt(action, victim, "icehammer", power,
                    { damage: damageSpec("icehammer", "hammer"), contact: true, punch: true });
                const body1 = world.observe(victim);
                const point = body1 === null ? contact.position() : body1.position();
                if (landed) {
                    WorldFeedback.emit(world, icehammerScene, 1, point,
                        { moment: "slam", target: String(victim.ref()), shards: shards, scale: scale, intensity: Math.max(0.6, Math.min(2.2, power / 100)) }, 22);
                    world.sound("cobblemon:impact.ice", point, 15, "{}");
                    if (world.valid(victim)) {
                        const away = WorldCombat.point(point.x() - centre.x(), 0, point.z() - centre.z());
                        if (away.length() >= 0.05) world.hitDisplace(victim, away.unit().scale(knock));
                    }
                    // 冰缓真的挂上才报冻结；被控免拒绝时不谎称冻住。
                    if (world.valid(victim) && MobEffects.apply(world, victim, icehammerChilled, chillTicks, 0) !== null) {
                        WorldFeedback.emit(world, icehammerScene, 1, point,
                            { moment: "chill", target: String(victim.ref()), shards: shards, scale: scale, intensity: Math.max(0.6, Math.min(2.2, power / 100)) }, 22);
                        WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1.2, 0)), icehammerChillText, [], 28);
                        sound(action, "cobblemon:move.iceshard.actor_1");
                    }
                    freeze(action, point);
                    stagger(action);
                } else {
                    WorldFeedback.emit(world, icehammerScene, 1, point, { moment: "blocked", target: String(victim.ref()), scale: scale }, 20);
                    sound(action, "minecraft:entity.player.attack.nodamage");
                }
                done(action);
                return;
            }

            if (contact.blocked()) {
                const cell = contact.blockPosition();
                const at = cell === null ? contact.position() : cell;
                WorldFeedback.emit(world, icehammerScene, 1, at,
                    { moment: "wall", face: contact.blockFace(), shards: shards, scale: scale }, 22);
                world.sound("cobblemon:impact.ice", at, 14, "{}");
                freeze(action, at);
                done(action);
                return;
            }

            WorldFeedback.emit(world, icehammerScene, 1, rawEnd, { moment: "miss", shards: shards, scale: scale }, 20);
            WorldFeedback.text(world, rawEnd.plus(WorldCombat.point(0, 1.0, 0)), icehammerMissText, [], 22);
            sound(action, "minecraft:block.glass.break");
            done(action);
        }
    });
}
