/**
 * 精神之牙 / psychicfangs 的出手方式。
 *
 * 核心念头：一对念力牙从身前合拢，逐刻向前延伸，尖端触及**第一处**身体或屏障时上下/左右闭合一次；
 * 闭在身体上就咬实，闭在屏障上就把它吞掉。它不再沿整条走廊每个敌人各咬一口。
 * 三幕：
 *   起（windup，提交前）：口中与身周转起精神力，牙影先在身旁成形。
 *   伸（execute → reach）：提交后牙框从口边向前逐刻延伸；`trace` 同时盯着第一处身体／墙，场地屏障
 *       则按射线进入屏障圆盘的距离一起比较，谁更近就先碰到谁。
 *   咬（body）：碰到的第一个身体挨一记接触咬击；闭合处真实清除的屏障（最多三层）喂给它额外力道。
 *   吞（field）：先碰到屏障时只吞掉这一处屏障，不穿到后面的身体。
 *
 * 瞄准：`kind: "aim"` 接受任意阵营实体或世界点；墙挡牙尖，空咬可消除接触到的屏障。
 * 与同族分开：劈瓦是竖直刀痕的贴身快劈；怒牛是整段位移的冲撞；上菜是带增益的抛投。
 */
namespace PokemonSkills {
    const psychicfangsScene = "world_combat:move_psychicfangs";
    const psychicfangsBreakText = "world_combat.move.psychicfangs.text.break";
    const psychicfangsMissText = "world_combat.move.psychicfangs.text.miss";

    /** 牙框在延伸距离 dist 处的两条牙尖：闭合前分居方向两侧，闭合时并到一处。 */
    function psychicfangsJaws(origin: CombatPoint, heading: CombatPoint, dist: number, half: number): number[][] {
        const tip = origin.plus(heading.scale(dist));
        const side = WorldCombat.point(-heading.z(), 0, heading.x());
        const left = tip.plus(side.scale(half)), right = tip.minus(side.scale(half));
        return [[left.x(), left.y(), left.z()], [right.x(), right.y(), right.z()]];
    }
    /**
     * 第一处接触：先算每个屏障场地圆盘被射线进入的距离，再让 `trace` 给出第一个身体／墙；
     * 身体与屏障同距时取身体。返回沿方向的闭合距离、接触类型与对象。
     */
    function psychicfangsContact(action: CombatAction, origin: CombatPoint, heading: CombatPoint, reach: number, half: number): {
        kind: "body" | "field" | "wall" | "none"; along: number; actor: CombatActor | null; areaPoint: CombatPoint | null;
    } {
        const world = action.world();
        let kind: "body" | "field" | "wall" | "none" = "none", along = reach, actor: CombatActor | null = null, areaPoint: CombatPoint | null = null;
        const zones = WorldEffects.areasWithTag(world, WorldEffects.categories.screen);
        for (let i = 0; i < zones.length; i++) {
            const area = zones[i];
            const centre = WorldCombat.point(area.position[0], area.position[1], area.position[2]);
            const delta = centre.minus(origin);
            const proj = WorldGeometry.dot(delta, heading);
            const perp = Math.sqrt(Math.max(0, delta.x() * delta.x() + delta.z() * delta.z() - proj * proj));
            if (perp > area.radius + half) continue;
            const span = Math.sqrt(Math.max(0, area.radius * area.radius - perp * perp));
            const entry = Math.max(0, proj - span);
            if (entry > reach) continue;
            if (entry < along) { kind = "field"; along = entry; actor = null; areaPoint = centre; }
        }
        const trace = action.trace(origin, origin.plus(heading.scale(reach)), half, false);
        const stopAlong = Math.max(0, WorldGeometry.dot(trace.position().minus(origin), heading));
        if (trace.hitEntity() && trace.target() !== null) {
            if (stopAlong <= along + 1e-6) { kind = "body"; along = stopAlong; actor = trace.target(); areaPoint = null; }
        } else if (trace.blocked() && stopAlong < along) {
            kind = "wall"; along = stopAlong; actor = null; areaPoint = null;
        }
        return { kind: kind, along: along, actor: actor, areaPoint: areaPoint };
    }
    /**
     * 咬合处真实清除屏障，最多 limit 层：先掀场地，再解身上的共享身份；都要求从 centre 通视。
     * 返回实际清除层数与各自位置，碎片只在真正清掉的地方生成。
     */
    function psychicfangsDevour(world: CombatWorld, centre: CombatPoint, radius: number, limit: number): { count: number; points: CombatPoint[] } {
        let count = 0;
        const points: CombatPoint[] = [];
        const zones = WorldEffects.areasWithTag(world, WorldEffects.categories.screen);
        for (let i = 0; i < zones.length && count < limit; i++) {
            const area = zones[i];
            const at = WorldCombat.point(area.position[0], area.position[1], area.position[2]);
            if (at.minus(centre).length() > radius + area.radius) continue;
            if (!world.clear(centre, at)) continue;
            if (world.operation(area.id, "world_combat:dispel", "{}")) { count++; points.push(at); }
        }
        const actors: CombatActor[] = world.query(centre, radius, false).slice();
        actors.push(world.source());
        const seen: { [ref: string]: boolean } = {};
        for (let i = 0; i < actors.length && count < limit; i++) {
            const actor = actors[i];
            if (!actor || !world.valid(actor)) continue;
            const ref = String(actor.ref());
            if (seen[ref]) continue;
            seen[ref] = true;
            const body = world.observe(actor);
            if (body === null || !world.clear(centre, body.position())) continue;
            const removed = CombatStatus.cureTagged(world, actor, WorldEffects.categories.screen);
            if (removed > 0) { count += removed; points.push(body.position()); }
        }
        return { count: count, points: points };
    }

    define({
        id: "psychicfangs",
        cooldownParameter: "recharge",
        name: "精神之牙",
        description: "一对念力牙从身前逐刻合拢，只咬住第一处碰到的东西：碰到身体就咬实，并把闭合处真实能清掉的屏障（最多三层）吞成额外力道；先碰到屏障则只吞屏障，不穿到后面。墙会挡住牙尖，空咬也能消除接触到的屏障。",
        uses: ["在稍远处咬住第一个目标", "把嘴前的屏障咬碎并吞成力道", "屏下敌人露出时先手一口吃掉屏障"],
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
            const wardBreak = p("psychicfangs", "wardBreak", action);
            const scale = half / 0.5;
            const step = Math.max(0.25, reach / Math.max(4, Math.round(p("psychicfangs", "tempo", action))));
            const contact = psychicfangsContact(action, origin, heading, reach, half);
            const scenes = WorldFeedback.actionScenes(psychicfangsScene);
            let tip = 0, settled = false;

            sound(action, "cobblemon:move.superfang.target");

            function show(current: CombatAction, dist: number): void {
                const shown = Math.min(reach, dist);
                const point = origin.plus(heading.scale(shown));
                scenes.show(current, "reach", origin, {
                    moment: "reach",
                    point: [point.x(), point.y(), point.z()],
                    path: psychicfangsJaws(origin, heading, shown, half),
                    openRadius: half * Math.max(0, 1 - shown / Math.max(0.001, reach)),
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
            function close(current: CombatAction): void {
                if (settled) return;
                settled = true;
                scenes.stop(current, "reach");
                const scope = current.world();
                const at = origin.plus(heading.scale(Math.min(reach, contact.along)));
                if (contact.kind === "body" && contact.actor !== null && scope.valid(contact.actor)) {
                    const victim = contact.actor;
                    const body = scope.observe(victim);
                    const centre = body === null ? at : body.position();
                    const eaten = psychicfangsDevour(scope, centre, wardBreak, 3);
                    const layers = Math.min(3, eaten.count);
                    const power = base * (1 + bonus * layers);
                    const landed = hurt(current, victim, "psychicfangs", power,
                        { damage: damageSpec("psychicfangs", "bite"), contact: true, bite: true });
                    WorldFeedback.emit(scope, psychicfangsScene, 1, centre,
                        { moment: "bite", target: String(victim.ref()), power: Math.round(power), wards: eaten.count, scale: scale,
                            path: psychicfangsJaws(origin, heading, Math.min(reach, contact.along), half),
                            point: [centre.x(), centre.y(), centre.z()], openRadius: half * 0.05 }, 26);
                    devourBurst(current, centre, eaten);
                    if (landed && eaten.count > 0)
                        WorldFeedback.text(scope, centre.plus(WorldCombat.point(0, 1.2, 0)), psychicfangsBreakText, [eaten.count], 30);
                } else if (contact.kind === "field") {
                    const eaten = psychicfangsDevour(scope, at, wardBreak, 3);
                    devourBurst(current, at, eaten);
                    if (eaten.count > 0) {
                        WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.2, 0)), psychicfangsBreakText, [eaten.count], 30);
                    } else {
                        WorldFeedback.emit(scope, psychicfangsScene, 1, at, { moment: "miss", scale: scale }, 20);
                        WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.0, 0)), psychicfangsMissText, [], 22);
                    }
                } else if (contact.kind === "wall") {
                    WorldFeedback.emit(scope, psychicfangsScene, 1, at, { moment: "blocked", scale: scale }, 20);
                } else {
                    WorldFeedback.emit(scope, psychicfangsScene, 1, at, { moment: "miss", scale: scale }, 20);
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.0, 0)), psychicfangsMissText, [], 22);
                }
                scenes.finish(current, done);
            }
            function advance(current: CombatAction): void {
                tip = Math.min(reach, tip + step);
                show(current, tip);
                if (contact.kind !== "none" && tip >= contact.along - 1e-6) { close(current); return; }
                if (tip >= reach - 1e-6) { close(current); return; }
                current.after(1, function (next: CombatAction) { advance(next); });
            }
            advance(action);
        }
    });
}
