/**
 * 精神之牙 / psychicfangs 的出手方式。
 *
 * 核心念头：一对念力牙从身前合拢，逐刻向前延伸，尖端触及**第一处**身体、敌方屏障或墙时上下/左右闭合一次；
 * 闭在身体上就咬实，闭在屏障上就把它吞掉。它不再沿整条走廊每个敌人各咬一口。
 * 三幕：
 *   起（windup，提交前）：口中与身周转起精神力，牙影先在身旁成形。
 *   伸（execute → reach）：提交后牙框从口边向前逐刻延伸；每一前进段都用同一份 3D 几何重新 trace 身体/墙，
 *       并按真实射线与敌方 screen 球面求交，谁在本段更近就先碰到谁——目标横走或屏障在身后都不会被缓存咬到。
 *   咬（body）：碰到的第一个身体挨一记接触咬击；牙路真实接触到的敌方屏障（最多三层）喂给它额外力道。
 *   吞（field）：先碰到屏障时只吞掉沿牙路接触到的敌方屏障，不穿到后面的身体；自家与队友的屏不吃。
 *
 * 瞄准：`kind: "aim"` 接受任意阵营实体或世界点；墙挡牙尖，空咬可消除接触到的屏障。
 * 与同族分开：劈瓦是竖直刀痕的贴身快劈；怒牛是整段位移的冲撞；上菜是带增益的抛投。
 */
namespace PokemonSkills {
    const psychicfangsScene = "world_combat:move_psychicfangs";
    const psychicfangsBreakText = "world_combat.move.psychicfangs.text.break";
    const psychicfangsMissText = "world_combat.move.psychicfangs.text.miss";

    function psychicfangsPoint(point: CombatPoint): number[] { return [point.x(), point.y(), point.z()]; }

    /** 牙框在延伸距离 dist 处的两条牙尖：上下两片，开口随 open 收窄；闭合时并到一处。 */
    function psychicfangsJaws(origin: CombatPoint, heading: CombatPoint, dist: number, open: number): number[][] {
        const tip = origin.plus(heading.scale(dist));
        return [[tip.x(), tip.y() + open, tip.z()], [tip.x(), tip.y() - open, tip.z()]];
    }

    /** 3D 射线与敌方 screen 球面最近的进入距离；在身后或跨层都不算。返回 -1 表示不相交。 */
    function psychicfangsRaySphere(origin: CombatPoint, heading: CombatPoint, centre: CombatPoint, radius: number): number {
        const dx = centre.x() - origin.x(), dy = centre.y() - origin.y(), dz = centre.z() - origin.z();
        const projection = dx * heading.x() + dy * heading.y() + dz * heading.z();
        const perpendicular = dx * dx + dy * dy + dz * dz - projection * projection;
        const inside = radius * radius - perpendicular;
        if (inside < 0) return -1;
        const half = Math.sqrt(inside);
        const near = projection - half;
        if (near >= 0) return near;
        const far = projection + half;
        return far >= 0 ? 0 : -1;
    }

    /** 从施法者自身与队友之外、且沿牙路真实能碰到的 screen 场。 */
    function psychicfangsZones(world: CombatWorld, caster: CombatActor): WorldEffects.Area[] {
        const casterRef = String(caster.ref()), zones = WorldEffects.areasWithTag(world, WorldEffects.categories.screen), result: WorldEffects.Area[] = [];
        for (let i = 0; i < zones.length; i++) {
            const owner = world.actor(String(zones[i].source));
            if (owner !== null && (String(owner.ref()) === casterRef || world.friendly(owner))) continue;
            result.push(zones[i]);
        }
        return result;
    }

    /**
     * 每一前进段重新求第一处接触：先算沿牙路的敌方 screen 球面交点，再让 `trace` 给出本段第一个身体／墙；
     * 身体、屏障与墙同距时取更近的那个（身体优先于同距场）。返回接触类型、沿方向的闭合距离、对象与真实点。
     */
    function psychicfangsContact(action: CombatAction, origin: CombatPoint, heading: CombatPoint, reach: number, half: number): {
        kind: "body" | "field" | "wall" | "none"; along: number; actor: CombatActor | null; area: WorldEffects.Area | null; point: CombatPoint;
    } {
        const world = action.world();
        let kind: "body" | "field" | "wall" | "none" = "none", along = reach, actor: CombatActor | null = null,
            area: WorldEffects.Area | null = null, point = origin.plus(heading.scale(reach));
        const zones = psychicfangsZones(world, action.actor());
        for (let i = 0; i < zones.length; i++) {
            const centre = WorldCombat.point(zones[i].position[0], zones[i].position[1], zones[i].position[2]);
            const entry = psychicfangsRaySphere(origin, heading, centre, zones[i].radius + half);
            if (entry < 0 || entry > reach) continue;
            if (entry < along) { kind = "field"; along = entry; actor = null; area = zones[i]; point = origin.plus(heading.scale(entry)); }
        }
        const trace = action.trace(origin, origin.plus(heading.scale(reach)), half, false);
        const delta = trace.position().minus(origin);
        const stopAlong = Math.max(0, delta.x() * heading.x() + delta.y() * heading.y() + delta.z() * heading.z());
        if (trace.hitEntity() && trace.target() !== null) {
            if (stopAlong <= along + 1e-6) { kind = "body"; along = stopAlong; actor = trace.target(); area = null; point = trace.position(); }
        } else if (trace.blocked() && stopAlong < along) {
            kind = "wall"; along = stopAlong; actor = null; area = null; point = trace.position();
        }
        return { kind: kind, along: along, actor: actor, area: area, point: point };
    }

    /**
     * 咬合处真实清除**沿牙路接触到的敌方屏障**，最多 limit 层：先掀场地，再解被咬身体身上的共享身份。
     * 只处理从 origin→contact 这段牙路真正碰到的场与那个身体，不扫自身、队友或身后目标。
     * 返回实际清除层数与各自位置，碎片只在真正清掉的地方生成。
     */
    function psychicfangsDevour(world: CombatWorld, caster: CombatActor, origin: CombatPoint, contact: CombatPoint, radius: number,
        victim: CombatActor | null, limit: number): { count: number; points: CombatPoint[] } {
        let count = 0;
        const points: CombatPoint[] = [];
        const zones = psychicfangsZones(world, caster);
        for (let i = 0; i < zones.length && count < limit; i++) {
            const area = zones[i];
            const at = WorldCombat.point(area.position[0], area.position[1], area.position[2]);
            if (WorldGeometry.closestOnSegment(at, origin, contact).minus(at).length() > area.radius + radius) continue;
            if (world.operation(area.id, "world_combat:dispel", "{}")) { count++; points.push(at); }
        }
        if (victim !== null && count < limit && world.valid(victim)) {
            const removed = CombatStatus.cureTagged(world, victim, WorldEffects.categories.screen);
            if (removed > 0) {
                count += removed;
                const body = world.observe(victim);
                points.push(body === null ? contact : body.position());
            }
        }
        return { count: count, points: points };
    }

    define({
        id: "psychicfangs",
        cooldownParameter: "recharge",
        name: "精神之牙",
        description: "一对念力牙从身前逐刻合拢，只咬住第一处碰到的东西：碰到身体就咬实，并把沿牙路真实接触到的敌方屏障（最多三层）吞成额外力道；先碰到屏障则只吞屏障，不穿到后面。墙会挡住牙尖，自家与队友的屏障不会被吞。",
        uses: ["在稍远处咬住第一个目标", "把嘴前的敌方屏障咬碎并吞成力道", "屏下敌人露出时先手一口吃掉屏障"],
        kind: "aim",
        range: 3.2,
        maxRange: 5.0,
        prepare: 9,
        active: 20,
        recover: 8,
        cooldown: 30,
        style: "bite",
        defaults: { devour: false, ai: { maxChase: 10, eatBarrier: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p("psychicfangs", "lunge", pokemon) : 3.2, geometry: "line", style: "bite",
                color: 0xE06AC8, label: config && config.devour ? "噬壁式" : "穿刺式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["psychicfangs"], detail: { values: config }, world: world, actor: actor, attributes: attributes };
            return {
                prepare: Math.max(4, Math.round(p("psychicfangs", "tempo", context))),
                recover: Math.max(3, Math.round(p("psychicfangs", "aftercast", context))),
                cooldown: Math.max(12, Math.round(p("psychicfangs", "recharge", context))),
                range: p("psychicfangs", "lunge", context) + 0.4
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_psychicfangs:windup", psychicfangsScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", devour: config && config.devour ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const direction = aim(action);
            const heading = WorldGeometry.flatUnit(direction);
            const origin = action.origin();
            const reach = p("psychicfangs", "lunge", action);
            const half = p("psychicfangs", "fangWidth", action);
            const base = p("psychicfangs", "bite", action);
            const bonus = p("psychicfangs", "devour", action);
            const grip = p("psychicfangs", "wardBreak", action);
            const scale = half / 0.5;
            const step = Math.max(0.25, reach / Math.max(4, Math.round(p("psychicfangs", "tempo", action))));
            const scenes = WorldFeedback.actionScenes(psychicfangsScene);
            let tip = 0;

            sound(action, "cobblemon:move.superfang.target");

            function show(current: CombatAction, dist: number): void {
                const shown = Math.min(reach, dist);
                const point = origin.plus(heading.scale(shown));
                scenes.show(current, "reach", origin, {
                    moment: "reach",
                    point: psychicfangsPoint(point),
                    path: psychicfangsJaws(origin, heading, shown, half),
                    openRadius: half,
                    openLower: -half,
                    direction: [heading.x(), heading.y(), heading.z()],
                    scale: scale
                });
            }
            function devourBurst(current: CombatAction, centre: CombatPoint, result: { count: number; points: CombatPoint[] }): void {
                if (result.count <= 0) return;
                WorldFeedback.emit(current.world(), psychicfangsScene, 1, centre,
                    { moment: "devour", wards: result.count, scale: scale }, 24);
                for (let i = 0; i < result.points.length && i < 6; i++)
                    WorldFeedback.emit(current.world(), psychicfangsScene, 1, result.points[i],
                        { moment: "devour", wards: result.count, scale: scale }, 24);
                sound(current, "cobblemon:impact.psychic");
            }
            function close(current: CombatAction, contact: ReturnType<typeof psychicfangsContact>): void {
                scenes.stop(current, "reach");
                const scope = current.world();
                if (contact.kind === "body" && contact.actor !== null && scope.valid(contact.actor)) {
                    const victim = contact.actor;
                    const body = scope.observe(victim);
                    const centre = body === null ? contact.point : body.position();
                    // 闭口只伤仍在牙体积里的首体：contact 由本刻重新 trace 得到，目标走开就不再是它。
                    const eaten = psychicfangsDevour(scope, current.actor(), origin, contact.point, half + grip, victim, 3);
                    const layers = Math.min(3, eaten.count);
                    const power = base * (1 + bonus * layers);
                    hurt(current, victim, "psychicfangs", power, { damage: damageSpec("psychicfangs", "bite"), contact: true, bite: true });
                    WorldFeedback.emit(scope, psychicfangsScene, 1, contact.point,
                        { moment: "bite", target: String(victim.ref()), power: Math.round(power), wards: eaten.count, scale: scale,
                            path: psychicfangsJaws(origin, heading, Math.min(reach, contact.along), half * 0.05),
                            point: psychicfangsPoint(contact.point), openRadius: half * 0.05, openLower: -half * 0.05 }, 26);
                    devourBurst(current, centre, eaten);
                    if (eaten.count > 0)
                        WorldFeedback.text(scope, centre.plus(WorldCombat.point(0, 1.2, 0)), psychicfangsBreakText, [eaten.count], 30);
                } else if (contact.kind === "field" && contact.area !== null) {
                    const eaten = psychicfangsDevour(scope, current.actor(), origin, contact.point, half + grip, null, 3);
                    WorldFeedback.emit(scope, psychicfangsScene, 1, contact.point,
                        { moment: "bite", wards: eaten.count, scale: scale, point: psychicfangsPoint(contact.point),
                            openRadius: half * 0.05, openLower: -half * 0.05 }, 24);
                    devourBurst(current, contact.point, eaten);
                    if (eaten.count > 0) {
                        WorldFeedback.text(scope, contact.point.plus(WorldCombat.point(0, 1.2, 0)), psychicfangsBreakText, [eaten.count], 30);
                    } else {
                        WorldFeedback.emit(scope, psychicfangsScene, 1, contact.point, { moment: "miss", scale: scale }, 20);
                        WorldFeedback.text(scope, contact.point.plus(WorldCombat.point(0, 1.0, 0)), psychicfangsMissText, [], 22);
                    }
                } else if (contact.kind === "wall") {
                    WorldFeedback.emit(scope, psychicfangsScene, 1, contact.point, { moment: "blocked", scale: scale }, 20);
                } else {
                    WorldFeedback.emit(scope, psychicfangsScene, 1, contact.point, { moment: "miss", scale: scale }, 20);
                    WorldFeedback.text(scope, contact.point.plus(WorldCombat.point(0, 1.0, 0)), psychicfangsMissText, [], 22);
                }
                scenes.finish(current, done);
            }
            function advance(current: CombatAction): void {
                tip = Math.min(reach, tip + step);
                show(current, tip);
                const contact = psychicfangsContact(current, origin, heading, tip, half);
                if (contact.kind !== "none" || tip >= reach - 1e-6) { close(current, contact); return; }
                current.after(1, function (next: CombatAction) { advance(next); });
            }
            advance(action);
        }
    });
}
