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
 *   砸（swing → slam/wall/miss）：提交后自由瞄准，先查瞄准点正上方的举拳空间，再沿**垂直短落拳路**逐刻 `trace`
 *       当前真实子段；首碰实体且伤害成立才把目标砸退 `knock`（按**实际受害者体重**）、挂 `chillTicks` 的冰缓；
 *       碰真墙用真实接触位置/面碎冰，不伤墙后的人。
 *   冻（frost → stagger）：拳面真实接触点下方可达的**自然支撑顶面**结出 `frostRadius` 的冰（逐格碰撞支撑取真实
 *       顶面、expectedState 与 `terrainResult` 的 placed 回执，机器／容器等非自然地材不动；天花板不会被当脚下地面），
 *       自己按实际事实降速。没有地面就只碎冰。
 *
 * 与臂锤分开：臂锤是斗气横挥、砸退更远、留真实接触地材尘线；冰锤是裹冰垂直下砸、砸退小、留冰面并给目标冰缓。
 *
 * 配置 `glaciate` 由公式改威力／冰缓／冰面／时序，由本文件决定结冰与冰缓结算；提交后才触碰世界。
 */
namespace PokemonSkills {
    const icehammerScene = "world_combat:move_icehammer";
    const icehammerFistScene = "world_combat:move_icehammer/fist";
    const icehammerChilled = "world_combat:icehammer_chilled";
    const icehammerChillText = "world_combat.move.icehammer.text.chill";
    const icehammerStaggerText = "world_combat.move.icehammer.text.stagger";
    const icehammerMissText = "world_combat.move.icehammer.text.miss";

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

    /** 在真实接触点下方可达的自然支撑面上租借整块冰：逐格用碰撞支撑取真实顶面、expectedState 与实际 placed 回执。
     * 支撑必须是向上的顶面（`SurfacePaths.support` 只认 blockFace "up"），天花板不会被当成脚下地面。 */
    function icehammerFrost(world: CombatWorld, at: CombatPoint, radius: number, ticks: number): number {
        const surface = SurfacePaths.support(world, at, 1.5, 4);
        if (surface === null) return 0;
        const cells: any[] = [], r = Math.ceil(radius), limit = Math.max(4, Math.min(48, Math.ceil(Math.PI * radius * radius)));
        const baseX = Math.floor(surface.x()), baseZ = Math.floor(surface.z());
        for (let dx = -r; dx <= r && cells.length < limit; dx++) for (let dz = -r; dz <= r && cells.length < limit; dz++) {
            if (dx * dx + dz * dz > radius * radius) continue;
            const column = SurfacePaths.support(world, WorldCombat.point(baseX + dx + 0.5, surface.y() + 1.0, baseZ + dz + 0.5), 1, 4);
            if (column === null) continue;
            const x = Math.floor(column.x()), z = Math.floor(column.z());
            let y = Math.floor(column.y()), ground = world.block(WorldCombat.point(x, y, z));
            if (ground === null || !icehammerSurfaceAllowed(ground)) { y = y - 1; ground = world.block(WorldCombat.point(x, y, z)); }
            if (ground === null || !icehammerSurfaceAllowed(ground)) continue;
            const id = String(ground.id());
            if (id === "minecraft:ice" || id === "minecraft:frosted_ice" || id === "minecraft:packed_ice") continue;
            cells.push({ x: x, y: y, z: z, block: "minecraft:ice", expectedState: String(ground.state()) });
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
            const height = body.height();
            const dir = aim(action);
            const heading = WorldGeometry.flatUnit(dir, WorldCombat.point(0, 0, 1));
            const forward = WorldCombat.point(heading.x(), 0, heading.z());
            const up = WorldCombat.point(0, 1, 0);
            const reach = Math.max(1.8, action.range());
            const frostRadius = Math.max(0.8, p("icehammer", "frostRadius", action));
            const frostTicks = Math.max(40, Math.round(p("icehammer", "frostTicks", action)));
            const chillTicks = Math.max(40, Math.round(p("icehammer", "chillTicks", action)));
            const shards = Math.max(6, Math.round(p("icehammer", "shards", action)));
            const speedLoss = Math.max(0, Math.round(p("icehammer", "speedLoss", action)));
            const scale = Math.max(0.6, Math.min(2.0, frostRadius / 1.5));
            const baseIntensity = Math.max(0.6, Math.min(2.2, p("icehammer", "hammer", action) / 100));
            const gauge = Math.max(0.3, Math.min(1.0, body.width() * 0.5));
            // 垂直短拳路：以瞄准点正上方为起点、直下扫过接触点；先查正上方举拳空间，矮顶会挡住落锤。
            const aimPoint = action.targetPosition();
            const delta = aimPoint.minus(centre);
            const distance = Math.max(Math.max(1.2, body.width() * 0.5 + 0.6),
                Math.min(reach, delta.length() < 0.01 ? reach : delta.length()));
            const contactPoint = centre.plus((delta.length() < 0.01 ? forward : delta.unit()).scale(distance));
            const raise = height * 0.9 + 0.7;
            const ceiling = WorldGeometry.blockHit(world, contactPoint.plus(up.scale(0.15)), contactPoint.plus(up.scale(raise)));
            const top = ceiling !== null && ceiling.blocked() ? ceiling.position().minus(up.scale(0.08)) : contactPoint.plus(up.scale(raise));
            const bottom = contactPoint.minus(up.scale(0.3));
            const sweepTicks = Math.max(2, Math.min(6, Math.round(raise + 1)));
            const scenes = WorldFeedback.actionScenes(icehammerScene);
            const fistKey = "icehammer:fist:" + action.id();
            let settled = false;

            function tipAt(t: number): CombatPoint { return top.plus(bottom.minus(top).scale(t)); }
            function finish(current: CombatAction): void { if (!settled) { settled = true; scenes.finish(current, done); } }
            /** 停止当前拳形的客户端绘制。 */
            function stopFist(current: CombatAction, at: CombatPoint): void {
                current.present(fistKey, icehammerFistScene, 1, at,
                    JSON.stringify({ lifecycle: { reason: "settled", tick: current.sense().tick() } }));
            }

            /** 真实接触点下方可达支撑面结冰；按 terrain 真实 placed 计数，没铺成就不报冰面，霜圈画在真实铺成的那个面。 */
            function freeze(current: CombatAction, at: CombatPoint): number {
                if (!world.valid(actor)) return 0;
                const scope = current.world();
                const cells = icehammerFrost(scope, at, frostRadius, frostTicks);
                if (cells > 0) {
                    const surface = SurfacePaths.support(scope, at, 1.5, 4);
                    const where = surface !== null ? surface : at;
                    WorldFeedback.emit(scope, icehammerScene, 1, where,
                        { moment: "frost", cells: cells, radius: frostRadius, shards: shards, scale: scale }, 26);
                    scope.sound("minecraft:block.glass.place", where, 14, "{}");
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

            /** 命中首个实体：按**实际受害者体重**砸退、挂冰缓，并在真实接触点下方自然支撑面结冰。 */
            function landEntity(current: CombatAction, hit: CombatImpact): void {
                const scope = current.world();
                const victim = hit.target();
                if (victim === null || String(victim.ref()) === String(actor.ref()) || scope.friendly(victim)) { stopFist(current, hit.position()); finish(current); return; }
                // 冰缓加成与砸退都在实际受击者当前状态/体重上求值，而不是提交时选中的那一个。
                const power = p("icehammer", "hammer", withTarget(factContext(current), victim));
                const victimKnock = p("icehammer", "knock", withTarget(factContext(current), victim));
                const intensity = Math.max(0.6, Math.min(2.2, power / 100));
                const landed = hurt(current, victim, "icehammer", power,
                    { damage: damageSpec("icehammer", "hammer"), contact: true, punch: true });
                const body1 = scope.observe(victim);
                const point = body1 === null ? hit.position() : body1.position();
                if (landed) {
                    WorldFeedback.emit(scope, icehammerScene, 1, point,
                        { moment: "slam", target: String(victim.ref()), shards: shards, scale: scale, intensity: intensity }, 22);
                    scope.sound("cobblemon:impact.ice", point, 15, "{}");
                    if (scope.valid(victim)) {
                        const away = WorldCombat.point(point.x() - centre.x(), 0, point.z() - centre.z());
                        if (away.length() >= 0.05) scope.hitDisplace(victim, away.unit().scale(victimKnock));
                    }
                    // 冰缓真的挂上才报冻结；被控免拒绝时不谎称冻住。
                    if (scope.valid(victim) && MobEffects.apply(scope, victim, icehammerChilled, chillTicks, 0) !== null) {
                        WorldFeedback.emit(scope, icehammerScene, 1, point,
                            { moment: "chill", target: String(victim.ref()), shards: shards, scale: scale, intensity: intensity }, 22);
                        WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.2, 0)), icehammerChillText, [], 28);
                        sound(current, "cobblemon:move.iceshard.actor_1");
                    }
                    freeze(current, point);
                    stagger(current);
                } else {
                    WorldFeedback.emit(scope, icehammerScene, 1, point, { moment: "blocked", target: String(victim.ref()), scale: scale }, 20);
                    sound(current, "minecraft:entity.player.attack.nodamage");
                }
                stopFist(current, point);
                finish(current);
            }

            /** 撞墙碎冰：用真实接触位置/面，不改用方块格坐标。 */
            function landWall(current: CombatAction, hit: CombatImpact): void {
                const scope = current.world();
                const at = hit.position();
                WorldFeedback.emit(scope, icehammerScene, 1, at,
                    { moment: "wall", face: hit.blockFace(), shards: shards, scale: scale }, 22);
                scope.sound("cobblemon:impact.ice", at, 14, "{}");
                freeze(current, at);
                stopFist(current, at);
                finish(current);
            }

            /** 沿真实垂直短拳路逐刻 trace：每刻发当前真实子段，首碰实体/真墙即止，一次命中。 */
            function drop(current: CombatAction, tick: number, from: CombatPoint): void {
                const progress = sweepTicks <= 1 ? 1 : Math.min(1, (tick + 1) / sweepTicks);
                const tip = tipAt(progress);
                scenes.show(current, "swing", tip,
                    { moment: "swing", path: [[from.x(), from.y(), from.z()], [tip.x(), tip.y(), tip.z()]],
                        direction: [dir.x(), dir.y(), dir.z()], shards: shards, scale: scale, intensity: baseIntensity });
                current.present(fistKey, icehammerFistScene, 1, tip,
                    JSON.stringify({ moment: "fist", point: [tip.x(), tip.y(), tip.z()], from: [from.x(), from.y(), from.z()],
                        direction: [dir.x(), dir.y(), dir.z()], progress: progress, scale: scale, intensity: baseIntensity }));
                const hit = current.trace(from, tip, gauge, true);
                if (hit.hitEntity()) { landEntity(current, hit); return; }
                if (hit.blocked()) { landWall(current, hit); return; }
                if (progress >= 1) {
                    WorldFeedback.emit(current.world(), icehammerScene, 1, tip, { moment: "miss", shards: shards, scale: scale }, 20);
                    WorldFeedback.text(current.world(), tip.plus(WorldCombat.point(0, 1.0, 0)), icehammerMissText, [], 22);
                    sound(current, "minecraft:block.glass.break");
                    stopFist(current, tip);
                    finish(current);
                    return;
                }
                current.after(1, function (next: CombatAction) { drop(next, tick + 1, tip); });
            }

            drop(action, 0, top);
        }
    });
}
