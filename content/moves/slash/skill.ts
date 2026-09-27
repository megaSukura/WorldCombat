/**
 * 劈开 / slash 的出手方式。
 *
 * 核心念头：站定、把刃举到头顶，朝身前一道窄而高的斜压刀面压下去——慢、稳，最容易劈中要害。
 * 判定与画面共用同一道薄面：举起点在上、落点在前，刃尖在 3 刻里从高处斜下推进到落点；每刻只结算
 * 当前扫过的那一小段；墙先把够不到的刃段裁掉，墙后不受伤。
 *
 * 三幕：
 *   起（windup，提交前）：举刃过头，刃尖聚起一道亮线。
 *   劈（blade → strike / wall）：提交后刃尖从身体上方 `depth` 高处斜下、推进 `reach` 格到落点；每一刻都用
 *       **当前身体**重新量一次真实可达的刀面——先查身体到举刃点（顶棚/身位）够不够，再让刀面全宽（左缘、中线、
 *       右缘）各自沿瞄准方向裁到第一堵墙，取最短的一段；命中的非友方各结算一次接触斩击，候选接触再从刀段出发
 *       复核一次墙。抬不起刀、或整片刀面被墙截到近零，就直接收招，不再恢复成全长。
 *   要害（crit，可选）：共享结算判定为暴击时，由本单元的监听器在落点补一发亮白标记与浮字。
 *
 * 选取：`kind: "aim"` 接受任意阵营实体或世界点；竖直瞄准用稳定局部侧轴，不压成水平。
 * 与同族分开：居合斩是一趟贴地的宽弧并割草，连斩是越接越多刀的攒节奏；劈开是唯一「慢、窄、高、期待要害」的单点重劈。
 */
namespace PokemonSkills {
    /** 举起点：身体中心正上方 `depth` 格。 */
    function slashRaised(origin: CombatPoint, depth: number): CombatPoint {
        return origin.plus(WorldCombat.point(0, depth, 0));
    }

    /** 一段斜压刀面的四个顶点：上沿 prev、下沿 tip，沿稳定侧轴各展开 `edge` 半宽；判定与表现共用。 */
    function slashQuad(prev: CombatPoint, tip: CombatPoint, side: CombatPoint, edge: number): CombatPoint[] {
        return [prev.plus(side.scale(edge)), prev.minus(side.scale(edge)), tip.minus(side.scale(edge)), tip.plus(side.scale(edge))];
    }

    /** 刀面平面的单位法线（由同一组顶点算出）。 */
    function slashNormal(vertices: CombatPoint[]): CombatPoint {
        const first = vertices[1].minus(vertices[0]), second = vertices[3].minus(vertices[0]);
        return WorldCombat.point(first.y() * second.z() - first.z() * second.y(),
            first.z() * second.x() - first.x() * second.z(),
            first.x() * second.y() - first.y() * second.x()).unit();
    }

    function slashPath(vertices: CombatPoint[]): number[][] {
        return vertices.map(function (point) { return [point.x(), point.y(), point.z()]; });
    }

    export interface SlashBlade { top: CombatPoint; bottom: CombatPoint; quad: CombatPoint[]; normal: CombatPoint; }

    /**
     * 从当前本体量出这一记真实可达的斜压刀面：先查身体到举刃点（顶棚/身位），再从举刃点沿瞄准方向让刀面全宽
     * （左缘、中线、右缘）各自裁到第一堵墙并取最短的一段。返回同一组顶点供判定与画面共用；抬不起或近零返回 null。
     */
    export function slashBlade(world: CombatWorld, origin: CombatPoint, depth: number, forward: CombatPoint,
                               reach: number, side: CombatPoint, edge: number): SlashBlade | null {
        const top = slashRaised(origin, depth);
        if (WorldGeometry.blockHit(world, origin, top) !== null) return null;
        const wanted = origin.plus(forward.scale(reach)), span = wanted.minus(top), length = span.length();
        if (!(length > 0)) return null;
        let ratio = 1;
        [-1, 0, 1].forEach(function (lateral) {
            const offset = side.scale(edge * lateral);
            const wall = WorldGeometry.blockHit(world, top.plus(offset), wanted.plus(offset));
            if (wall !== null) ratio = Math.min(ratio, wall.position().minus(top.plus(offset)).length() / length);
        });
        if (!(ratio > 0)) return null;
        const bottom = top.plus(span.scale(ratio));
        const quad = slashQuad(top, bottom, side, edge);
        return { top: top, bottom: bottom, quad: quad, normal: slashNormal(quad) };
    }

    define({
        id: slashId,
        cooldownParameter: "recharge",
        name: "Slash",
        description: "站定、举刃过头，朝身前一道窄而高的斜压刀面压下去：刃尖从高处斜下推进，扫到的对手各吃一记接触斩击，命中处就是刃面真正接触身体的位置；墙会先把够不到的刃段截短，墙后不受伤。它天生更容易劈中要害，只有真正劈中要害时落点才会再闪一记亮白标记——疾刃更快更宽、重刃更慢更重。",
        uses: ["站定一记压下去的重劈", "更容易劈中要害", "慢、窄、高、准"],
        kind: "aim",
        range: 2.4,
        maxRange: 2.9,
        prepare: 9,
        active: 16,
        recover: 9,
        cooldown: 34,
        style: "slash",
        defaults: { heavy: false, ai: { maxChase: 5, finishLow: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(slashId, "reach", pokemon), geometry: "line", style: "slash", color: 0xF0F0F0,
                label: config && config.heavy === true ? "重刃劈开" : "劈开" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[slashId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(slashId, "tempo", context)),
                recover: Math.round(p(slashId, "aftercast", context)),
                cooldown: Math.round(p(slashId, "recharge", context)),
                active: skills[slashId].active,
                range: p(slashId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_slash:windup", slashScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", heavy: config && config.heavy === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const scenes = WorldFeedback.actionScenes(slashScene);
            const world = action.world();
            const caster = action.actor();
            const direction = aim(action);
            const reach = p(slashId, "reach", action);
            const edge = p(slashId, "edge", action);
            const depth = p(slashId, "depth", action);
            const power = p(slashId, "cleave", action);
            const notes = Math.round(p(slashId, "notes", action));
            const frame = WorldGeometry.basis(direction, action.direction());
            const side = frame.right;
            const steps = 3;
            const thickness = Math.max(0.08, Math.min(0.22, edge * 0.25));
            const bladeFloor = 0.12;
            const scale = Math.max(0.6, Math.min(2.0, edge / slashReference));
            const intensity = Math.max(0.6, Math.min(2.4, power / 70));
            const selfRef = String(caster.ref());
            const hitRefs: { [ref: string]: boolean } = {};
            let hits = 0, settled = false;

            sound(action, "minecraft:entity.player.attack.strong");

            function finish(current: CombatAction, at: CombatPoint): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                if (hits === 0) {
                    WorldFeedback.emit(scope, slashScene, 1, at, { moment: "miss", scale: scale }, 18);
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 0.9, 0)), slashMissText, [], 20);
                }
                scenes.finish(current, done);
            }

            /** 刀面在这刻抬不起来或已被墙截到近零：不再补全长，直接收招。 */
            function stop(current: CombatAction, at: CombatPoint): void {
                if (settled) return;
                const scope = current.world();
                WorldFeedback.emit(scope, slashScene, 1, at, { moment: "wall", scale: scale }, 18);
                scope.sound("minecraft:block.deepslate.break", at, 14, "{}");
                finish(current, at);
            }

            /** 当前一刻：只结算刚刚扫过的那一小段真实刀面，命中的目标各一次。 */
            function advance(current: CombatAction, index: number): void {
                if (settled) return;
                const scope = current.world();
                const moved = scope.observe(caster);
                const base = moved === null ? current.origin() : moved.position();
                // 每刻以当前本体重新校验真实可达子段；表现与判定都读这一组被裁过的顶点。
                const blade = slashBlade(scope, base, depth, frame.forward, reach, side, edge);
                if (blade === null || blade.bottom.minus(blade.top).length() <= bladeFloor) {
                    stop(current, slashRaised(base, depth));
                    return;
                }
                const axis = blade.bottom.minus(blade.top);
                const from = blade.top.plus(axis.scale(index / steps));
                const to = blade.top.plus(axis.scale((index + 1) / steps));
                const quad = slashQuad(from, to, side, edge);

                const region = WorldGeometry.bodyPrism(quad, slashNormal(quad), thickness);
                WorldGeometry.selectBodies(scope, region, function (victim, facts) {
                    const ref = String(victim.ref());
                    if (facts.friendly() || ref === selfRef || hitRefs[ref]) return;
                    const contact = scope.closestPoint(victim, WorldGeometry.closestOnSegment(facts.position(), blade.top, blade.bottom));
                    // 候选接触复核墙：刀段到身体之间还有实墙就不结算。
                    if (WorldGeometry.blockHit(scope, from, contact) !== null) return;
                    if (!hurt(current, victim, slashId, power,
                        { damage: damageSpec(slashId, "cleave"), contact: true, slice: true })) return;
                    hitRefs[ref] = true; hits++;
                    WorldFeedback.emit(scope, slashScene, 1, contact,
                        { moment: "strike", point: [contact.x(), contact.y(), contact.z()], target: ref,
                            notes: notes, scale: scale, intensity: intensity }, 18);
                });

                scenes.show(current, "blade", base, { moment: "blade", path: slashPath(quad),
                    step: index + 1, notes: notes, motes: Math.round(notes * 4), hits: hits,
                    scale: scale, intensity: intensity, direction: [direction.x(), direction.y(), direction.z()] });

                if (index + 1 < steps) {
                    current.after(1, function (next: CombatAction) { advance(next, index + 1); });
                    return;
                }
                finish(current, blade.bottom);
            }

            advance(action, 0);
        }
    });

    // 要害标记：共享结算判定为暴击后，在落点补一记亮白强调与浮字（暴击率来自原生 critRatio 2）。
    // 普通命中不触发这里——只有真实 damage_applied 回执里 critical 为真、且实际伤害大于 0 时才有这一闪。
    WorldCombat.on("world_combat:move_slash/weak", "world_combat:damage_applied", "", function (event) {
        const data = JSON.parse(String(event.data()));
        const action = event.action();
        const fromAction = action !== null && String(action.content()) === "world_combat:" + slashId;
        if (String(data.move || "") !== slashId && !fromAction) return;
        if (data.critical !== true || !(data.actual > 0)) return;
        const world = event.world(), target = event.target();
        if (target === null || typeof data.x !== "number") return;
        const at = WorldCombat.point(data.x, data.y, data.z);
        WorldFeedback.emit(world, slashScene, 1, at,
            { moment: "crit", target: String(target.ref()), marks: Math.max(1, Math.round(Math.min(3, (data.actual || 0) / 12))),
                scale: Math.max(0.7, Math.min(2.2, (data.actual || 0) / 12)) }, 24);
        WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.2, 0)), slashWeakText, [], 30);
        world.sound("minecraft:entity.player.attack.crit", at, 14, "{}");
    });
}
