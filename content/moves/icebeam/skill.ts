/**
 * 冰冻光束 / icebeam 的出手方式。
 *
 * 核心念头：把冷气压成一束笔直、瞬间贯穿的光——它不飞、等不了，沿着瞄准线整条烧过去；被穿过的每个人
 *   各挨一次冻伤并可能被冻住，光束尽头的地表留下一道会滑的冰。
 *
 * 两幕（一击完成）：
 *   起（windup，提交前）：嘴边聚起冷雾的预告（action.present）。
 *   击（beam → impact → rime）：提交后瞬发——沿瞄准线整条走廊一次结算，按距离取最前面的 pierce 个敌人，
 *       各结算一次冰属性特殊伤害并按 freezeChance 掷冰冻；光束停留 linger 刻；地面沿同一组顶点冻出冰线，
 *       停留 frostTicks 后原方块回来。
 *
 * 反制：光束只沿一条窄线，站在线外安全；冰冻是概率，不是必定。走位或掩体能读出并躲开这条线。
 * 配置 focus（聚焦式）：更窄更短、单体更重、冰冻概率更高，但穿透更少、起手与冷却更久。
 */
namespace PokemonSkills {
    const icebeamScene = "world_combat:move_icebeam";
    const icebeamHitText = "world_combat.move.icebeam.text.hit";
    const icebeamMissText = "world_combat.move.icebeam.text.miss";

    function icebeamCoords(point: CombatPoint): number[] { return [point.x(), point.y(), point.z()]; }

    /** 沿光束的地面冻出一道冰线（租借，linger，到期原方块回来）。 */
    function icebeamRime(world: CombatWorld, origin: CombatPoint, heading: CombatPoint, length: number, halfWidth: number, ticks: number, cap: number): number {
        const side = WorldCombat.point(-heading.z(), 0, heading.x());
        const cells: any[] = [];
        const limit = Math.max(6, Math.round(cap));
        const steps = Math.ceil(length), spread = Math.max(0, Math.round(halfWidth));
        const baseY = Math.floor(origin.y());
        for (let i = 0; i <= steps && cells.length < limit; i++) {
            const centre = origin.plus(heading.scale(i));
            for (let s = -spread; s <= spread && cells.length < limit; s++) {
                const at = centre.plus(side.scale(s));
                const x = Math.floor(at.x()), z = Math.floor(at.z());
                for (let dy = 1; dy >= -3; dy--) {
                    const y = baseY + dy;
                    const block = world.block(WorldCombat.point(x, y, z));
                    if (block === null) break;
                    const id = String(block.id());
                    if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
                    if (id === "minecraft:water" || id === "minecraft:lava" || id === "minecraft:bedrock" || id === "minecraft:barrier") break;
                    const above = world.block(WorldCombat.point(x, y + 1, z));
                    const over = above === null ? "" : String(above.id());
                    if (over === "minecraft:air" || over === "minecraft:cave_air" || over === "minecraft:void_air")
                        cells.push({ x: x, y: y, z: z, block: "minecraft:ice" });
                    break;
                }
            }
        }
        if (!cells.length) return 0;
        try { world.terrain(JSON.stringify({ cells: cells, replace: true, linger: true }), Math.max(40, Math.round(ticks))); }
        catch (error) { return 0; }
        return cells.length;
    }

    define({
        id: "icebeam",
        cooldownParameter: "wait",
        name: "Ice Beam",
        description: "把冷气压成一束笔直贯穿的光，瞬间烧过整条瞄准线：被穿过的每个敌人各挨一次冰属性伤害并可能被冻住，沿途地面留下一道湿滑冰线。聚焦式收窄换更重的一束，扩散式更宽更远。",
        uses: ["隔空贯穿排成一条线的敌人", "对远处的高威胁目标先手点名", "用地面冰线把一条通道铺滑"],
        kind: "enemy",
        range: 13,
        maxRange: 18,
        prepare: 10,
        active: 1,
        recover: 8,
        cooldown: 44,
        style: "frost",
        defaults: { focus: false, ai: { maxChase: 16, preferLines: true } },
        fields: [flag("focus", "聚焦式")],
        indicator: function (config, pokemon) {
            return { radius: p("icebeam", "beamLength", pokemon), geometry: "line", style: "frost", color: 0x9FD8F0,
                label: config && config.focus === true ? "冰冻光束·聚焦" : "冰冻光束·扩散" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["icebeam"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p("icebeam", "tempo", context)),
                recover: Math.round(p("icebeam", "aftermath", context)),
                cooldown: Math.round(p("icebeam", "wait", context)),
                active: skills["icebeam"].active,
                range: p("icebeam", "beamLength", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("icebeam:windup", icebeamScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", focus: config && config.focus === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            const origin = body === null ? action.origin() : body.position();
            const at = action.targetPosition();
            const flat = WorldCombat.point(at.x() - origin.x(), 0, at.z() - origin.z());
            const heading = flat.length() < 0.3 ? aim(action) : flat.unit();
            const length = Math.max(4, p("icebeam", "beamLength", action));
            const halfWidth = Math.max(0.2, p("icebeam", "beamWidth", action));
            const power = p("icebeam", "beam", action);
            const maxTargets = Math.max(1, Math.round(p("icebeam", "pierce", action)));
            const freezeChance = Math.max(0, Math.min(1, p("icebeam", "freezeChance", action)));
            const beamTicks = Math.max(4, Math.round(p("icebeam", "linger", action)));
            const frostTicks = Math.max(40, Math.round(p("icebeam", "frostTicks", action)));
            const rimeCells = Math.max(6, Math.round(p("icebeam", "rimeCells", action)));
            const end = origin.plus(heading.scale(length));
            const scale = length / 13.0;
            const intensity = Math.max(0.6, Math.min(2.4, power / 85));
            const hit: { [ref: string]: boolean } = {};
            const target = action.target();
            const targetRef = target === null ? "" : String(target.ref());
            let hits = 0, settled = false;
            const direction = [heading.x(), heading.y(), heading.z()];
            // 冰线在提交后立刻铺下（租借，linger）：动作结束时租约不会随动作被收回。
            const placed = icebeamRime(world, origin, heading, length, halfWidth, frostTicks, rimeCells);

            function settle(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                WorldFeedback.emit(scope, icebeamScene, 1, origin.plus(heading.scale(length / 2)),
                    { moment: "rime", path: [icebeamCoords(origin), icebeamCoords(end)], cells: placed, scale: scale }, 26);
                WorldFeedback.text(scope, origin.plus(WorldCombat.point(0, 1.3, 0)),
                    hits > 0 ? icebeamHitText : icebeamMissText, hits > 0 ? [hits] : [], 26);
                sound(current, "cobblemon:impact.ice");
                done(current);
            }

            function sweep(current: CombatAction, remaining: number): void {
                const scope = current.world();
                const region = WorldGeometry.lane(origin, heading, length, halfWidth, { below: 2, above: 3 });
                const candidates: { actor: CombatActor; at: CombatPoint }[] = [];
                WorldGeometry.selectEnemies(scope, region, function (enemy, facts) {
                    if (hit[String(enemy.ref())]) return;
                    candidates.push({ actor: enemy, at: facts.position() });
                });
                candidates.sort(function (a, b) { return a.at.minus(origin).length() - b.at.minus(origin).length(); });
                for (let i = 0; i < candidates.length && hits < maxTargets; i++) {
                    const victim = candidates[i].actor;
                    hit[String(victim.ref())] = true;
                    hits++;
                    if (!hurt(current, victim, "icebeam", power,
                        { damage: damageSpec("icebeam", "beam"), status: "frozen", chance: freezeChance })) continue;
                    WorldFeedback.emit(scope, icebeamScene, 1, candidates[i].at,
                        { moment: "impact", target: String(victim.ref()), intensity: intensity, scale: scale }, 24);
                    WorldFeedback.text(scope, candidates[i].at.plus(WorldCombat.point(0, 1.35, 0)), icebeamHitText, [hits], 22);
                    sound(current, "cobblemon:move.icebeam.target_1");
                }
                if (remaining > 1 && hits < maxTargets) {
                    current.after(Math.max(3, Math.floor(beamTicks / 2)), function (next) { sweep(next, remaining - 1); });
                    return;
                }
                settle(current);
            }

            sound(action, "cobblemon:move.icebeam.actor");
            WorldFeedback.emit(world, icebeamScene, 1, origin,
                { moment: "beam", target: targetRef, direction: direction, length: length, width: halfWidth, beamTicks: beamTicks,
                    path: [icebeamCoords(origin), icebeamCoords(end)], pierce: maxTargets, intensity: intensity, scale: scale, hits: 0,
                    rate: Math.round(90 + power * 0.7), shardRate: Math.round(20 + power * 0.2), impactCount: Math.round(14 + power * 0.3),
                    rimeRate: Math.round(18 + rimeCells * 1.4) }, beamTicks + 16);
            sweep(action, 2);
        }
    });
}
