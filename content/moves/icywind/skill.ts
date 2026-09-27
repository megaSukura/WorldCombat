/**
 * 冰冻之风 / icywind 的出手方式。
 *
 * 核心念头：从嘴边吐出一堵会走的冷气锋——它由近及远向前推出一整条走廊，把沿途站在走廊里的人冻得发僵
 * （速度下降）。锋面的位置就是会被冻到的位置；每一条纵向射线都用真实墙面截断，墙后不会越过墙受冻。
 *
 * 三幕：
 *   起（windup，提交前）：嘴边泛起白气、霜点聚拢的预告。
 *   推（front → swept → hit）：提交后冷气锋从脚边起向前推进，一圈圈扫过走廊；每一步把走廊那一段内、
 *       与起点真实通视的敌人各冻一次（伤害 + 速度下降 `slowStages` 级，反馈按实际降下的级数），同一目标只冻一次。
 *   痕（rimes）：锋推到尽头后，走过的地表只浮起一层很快退去的细霜——不替换地面方块。
 *
 * 判定：`kind: "aim"`——可瞄方向、瞄实体或向空处空放，提交时不要求存在敌人。锋面从嘴边沿水平方向推出，
 * 主轴先做一次真实方块射线截断射程；每一段再用 `bodyPolygon`＋真实实体箱选中走廊里的身体，隔墙的不受。
 *
 * 配置 `deepfreeze`（深寒式）由 resolve 改时序、由公式改射程与威力：开启＝收短、更冷、多降一级速度，
 * 冷却更长；关闭＝吹得更远更广。
 */
namespace PokemonSkills {
    const icywindScene = "world_combat:move_icywind";
    /** 冷气锋的真实上下边界短雪帘由自定义场景按当刻锋线绘制（与判定同源）。 */
    const icywindFrontScene = "world_combat:move_icywind_front";
    const icywindHitText = "world_combat.move.icywind.text.hit";
    const icywindMissText = "world_combat.move.icywind.text.miss";

    /** 冷气锋主轴实际能推多远：前方有方块就截到真实接触面，否则到射程尽头。 */
    function icywindTravel(world: CombatWorld, mouth: CombatPoint, heading: CombatPoint, reach: number): number {
        const wall = WorldGeometry.blockHit(world, mouth, mouth.plus(heading.scale(reach)));
        return wall === null ? reach : Math.max(1.0, Math.min(reach, wall.position().minus(mouth).length()));
    }

    /** 当刻被墙截短的一段走廊：横向取样若干列，每列前缘取真实墙面与 `outer` 的近者，内缘取 `inner`。 */
    function icywindSlab(world: CombatWorld, origin: CombatPoint, heading: CombatPoint, side: CombatPoint, inner: number, outer: number, width: number, samples: number): { front: CombatPoint[]; slab: CombatPoint[] } {
        const front: CombatPoint[] = [], back: CombatPoint[] = [];
        for (let i = 0; i <= samples; i++) {
            const lateral = side.scale(width * (-1 + 2 * i / samples));
            const base = origin.plus(lateral);
            const wall = WorldGeometry.blockHit(world, base, base.plus(heading.scale(outer)));
            const limit = wall === null ? outer : Math.max(0, wall.position().minus(base).length());
            front.push(base.plus(heading.scale(limit)));
            back.push(base.plus(heading.scale(Math.min(inner, limit))));
        }
        return { front: front, slab: back.concat(front.slice().reverse()) };
    }

    function icywindPath(points: CombatPoint[]): number[][] {
        return points.map(function (point) { return [point.x(), point.y(), point.z()]; });
    }

    define({
        id: "icywind",
        name: "Icy Wind",
        description: "从嘴边吐出一堵会走的冷气锋，向前推出整条走廊：被扫到的敌人挨冻并降低速度；每条纵向射线都被真实墙面截断，墙后不会越过墙受冻。深寒式收短更冷、多降一级速度；广域式吹得更远更广。",
        uses: ["一次冻到排成一条线的几个敌人", "削掉冲过来的快目标的速度", "用锋面的走向把一条通道封住", "隔着距离先手减速，再交给队友处理"],
        kind: "aim",
        range: 6.0,
        maxRange: 9.5,
        prepare: 10,
        active: 14,
        recover: 8,
        cooldown: 26,
        style: "frostfront",
        defaults: { deepfreeze: false, ai: { maxChase: 10, cluster: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("icywind", "reach", pokemon), geometry: "area", style: "frostfront",
                color: 0xBFE9FF, label: config && config.deepfreeze === true ? "深寒冰冻之风" : "广域冰冻之风" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["icywind"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const deep = !!(config && config.deepfreeze);
            return {
                prepare: p("icywind", "tempo", context),
                recover: p("icywind", "recover", context),
                cooldown: p("icywind", "cooldown", context) + (deep ? 6 : 0),
                active: skills["icywind"].active,
                range: p("icywind", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("icywind:gather", icywindScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", deep: config && config.deepfreeze === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const body = world.observe(action.actor());
            if (body === null) { done(action); return; }
            const origin = body.position();
            const mouth = origin.plus(WorldCombat.point(0, 0.55, 0));
            const heading = WorldGeometry.flatUnit(action.targetPosition().minus(mouth), action.direction());
            const side = WorldCombat.point(-heading.z(), 0, heading.x());
            const bandBase = body.boundsMin().y(), bandTop = body.boundsMax().y() + Math.max(0.4, body.height() * 0.5);
            const requested = Math.max(3.5, p("icywind", "reach", action));
            const reach = icywindTravel(world, mouth, heading, requested);
            const halfWidth = Math.max(0.9, p("icywind", "halfWidth", action));
            const power = p("icywind", "frost", action);
            const stages = Math.max(1, Math.round(p("icywind", "slowStages", action)));
            const steps = Math.max(3, Math.round(p("icywind", "travelTicks", action)));
            const frostCells = Math.max(12, Math.round(p("icywind", "frostCells", action)));
            const cap = Math.max(1, Math.round(p("icywind", "maxTargets", action)));
            const samples = Math.max(4, Math.round(halfWidth * 3));
            const scale = reach / 6.0;
            const front = WorldFeedback.actionScenes(icywindScene);
            const curtain = WorldFeedback.actionScenes(icywindFrontScene);
            const hit: { [ref: string]: boolean } = {};
            let step = 0, total = 0, settled = false;

            function settle(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                front.stop(current, "front");
                curtain.stop(current);
                const far = origin.plus(heading.scale(reach));
                const l0 = origin.plus(side.scale(-halfWidth * 0.7)), r0 = origin.plus(side.scale(halfWidth * 0.7));
                const l1 = far.plus(side.scale(-halfWidth * 1.3)), r1 = far.plus(side.scale(halfWidth * 1.3));
                // 只在走过的地方浮起一层很快退去的细霜：不替换任何地面方块。
                WorldFeedback.emit(scope, icywindScene, 1, origin.plus(heading.scale(reach / 2)),
                    { moment: "rimes", radius: reach, halfWidth: halfWidth, cells: frostCells, scale: scale,
                        path: [[l0.x(), l0.y(), l0.z()], [r0.x(), r0.y(), r0.z()], [r1.x(), r1.y(), r1.z()], [l1.x(), l1.y(), l1.z()]] }, 26);
                WorldFeedback.text(scope, origin.plus(WorldCombat.point(0, 1.2, 0)),
                    total > 0 ? icywindHitText : icywindMissText, total > 0 ? [total] : [], 26);
                sound(current, "cobblemon:impact.ice");
                done(current);
            }

            function advance(current: CombatAction): void {
                const scope = current.world();
                const progress = (step + 1) / steps;
                const outer = reach * progress, inner = Math.max(0, reach * step / steps - 0.4);
                const width = halfWidth * (0.7 + 0.6 * progress);
                const centre = origin.plus(heading.scale((inner + outer) / 2));
                const slab = icywindSlab(scope, origin, heading, side, inner, outer, width, samples);
                // 走廊由真实实体箱取人，并逐人再做一次通视：侧翼与主轴都按真实墙截断。
                WorldGeometry.selectBodies(scope, WorldGeometry.bodyPolygon(slab.slab, bandBase, bandTop), function (enemy, facts) {
                    const ref = String(enemy.ref());
                    if (ref === String(current.actor().ref()) || facts.friendly() || hit[ref] || total >= cap) return;
                    if (!scope.clear(origin, facts.position())) return;
                    hit[ref] = true;
                    const distance = facts.position().minus(origin).length();
                    const gain = Math.max(0.7, 1 - (distance / Math.max(1, reach)) * 0.3);
                    if (!hurt(current, enemy, "icywind", power * gain, { damage: damageSpec("icywind", "frost") })) return;
                    total++;
                    const dropped = -NativeEffects.boost(scope, enemy, "spe", -stages);
                    if (dropped > 0)
                        WorldFeedback.emit(scope, icywindScene, 1, facts.position(),
                            { moment: "swept", target: ref, count: Math.round(14 + power * 0.3), drop: dropped, scale: scale,
                                intensity: Math.max(0.5, Math.min(2, power / 60)) }, 24);
                });
                const frontPath = icywindPath(slab.front);
                // 判定用的 inner/outer/width 与画出来的锋线端点来自同一组数，锋到哪、哪才会挨冻。
                front.show(current, "front", centre,
                    { moment: "front", radius: width, progress: progress, flow: Math.round(50 + width * 40), drop: stages, scale: scale,
                        path: frontPath });
                curtain.show(current, "front", centre,
                    { moment: "front", edge: frontPath, base: bandBase, top: bandTop, progress: progress,
                        flow: Math.round(50 + width * 40), scale: scale, intensity: Math.max(0.5, Math.min(2, power / 60)) });
                step++;
                if (step >= steps) { settle(current); return; }
                current.after(1, function (next: CombatAction) { advance(next); });
            }

            sound(action, "cobblemon:move.powdersnow.actor");
            advance(action);
        }
    });
}
