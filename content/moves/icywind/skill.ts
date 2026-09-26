/**
 * 冰冻之风 / icywind 的出手方式。
 *
 * 核心念头：从嘴边吐出一堵会走的冷气锋——它贴着地面由近及远向前推出一条走廊，把沿途站在地上的人
 * 冻得发僵（速度下降）。锋面的位置就是会被冻到的位置；墙会把这堵风截断在墙前。
 *
 * 三幕：
 *   起（windup，提交前）：嘴边泛起白气、霜点聚拢的预告。
 *   推（front → swept → hit）：提交后冷气锋从脚边起向前推进，一圈圈扫过走廊；每一步把
 *       走廊那一段内的敌人各冻一次（伤害 + 速度下降 `slowStages` 级），同一目标只冻一次。
 *   痕（rimes）：锋推到尽头后，走过的地表只浮起一层很快退去的细霜——不替换地面方块。
 *
 * 判定：`kind: "aim"`——可瞄方向、瞄实体或向空处空放，提交时不要求存在敌人。锋面从嘴边沿水平方向推出，
 * 先做一次 `action.trace` 取得真实首碰点；首碰是方块就按它截断射程，否则再逐段 `world.clear` 找墙，
 * 让走廊在墙前停下。走廊以外的敌人安全，这条范围能读出来。
 *
 * 配置 `deepfreeze`（深寒式）由 resolve 改时序、由公式改射程与威力：开启＝收短、更冷、多降一级速度，
 * 冷却更长；关闭＝吹得更远更广。
 */
namespace PokemonSkills {
    const icywindScene = "world_combat:move_icywind";
    const icywindHitText = "world_combat.move.icywind.text.hit";
    const icywindMissText = "world_combat.move.icywind.text.miss";

    /** 冷气锋实际能推多远：首碰是方块就截到那里；否则逐段通视，遇到墙就在墙前停下。 */
    function icywindTravel(action: CombatAction, mouth: CombatPoint, heading: CombatPoint, reach: number): number {
        const world = action.world();
        const full = mouth.plus(heading.scale(reach));
        const probe = action.trace(mouth, full, 0.35, false);
        if (probe.blocked()) {
            const at = probe.blockPosition();
            if (at !== null) return Math.max(1.0, Math.min(reach, at.minus(mouth).length()));
        }
        const samples = Math.max(4, Math.ceil(reach / 0.5));
        for (let i = 1; i <= samples; i++) {
            const distance = reach * i / samples;
            if (!world.clear(mouth, mouth.plus(heading.scale(distance)))) return distance;
        }
        return reach;
    }

    define({
        id: "icywind",
        name: "Icy Wind",
        description: "从嘴边吐出一堵会走的冷气锋，贴着地面向前推出整条走廊：被扫到的敌人挨冻并降低速度；墙会把风截断在墙前。深寒式收短更冷、多降一级速度；广域式吹得更远更广。",
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
            const origin = body !== null ? body.position() : action.origin();
            const mouth = origin.plus(WorldCombat.point(0, 0.55, 0));
            const heading = WorldGeometry.flatUnit(action.targetPosition().minus(mouth), action.direction());
            const side = WorldCombat.point(-heading.z(), 0, heading.x());
            const requested = Math.max(3.5, p("icywind", "reach", action));
            const reach = icywindTravel(action, mouth, heading, requested);
            const halfWidth = Math.max(0.9, p("icywind", "halfWidth", action));
            const power = p("icywind", "frost", action);
            const stages = Math.max(1, Math.round(p("icywind", "slowStages", action)));
            const steps = Math.max(3, Math.round(p("icywind", "travelTicks", action)));
            const frostTicks = Math.max(40, Math.round(p("icywind", "frostTicks", action)));
            const frostCells = Math.max(12, Math.round(p("icywind", "frostCells", action)));
            const cap = Math.max(1, Math.round(p("icywind", "maxTargets", action)));
            const scale = reach / 6.0;
            const front = WorldFeedback.actionScenes(icywindScene);
            const hit: { [ref: string]: boolean } = {};
            let step = 0, total = 0, settled = false;

            function settle(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                front.stop(current, "front");
                const far = origin.plus(heading.scale(reach));
                const l0 = origin.plus(side.scale(-halfWidth * 0.7)), r0 = origin.plus(side.scale(halfWidth * 0.7));
                const l1 = far.plus(side.scale(-halfWidth * 1.3)), r1 = far.plus(side.scale(halfWidth * 1.3));
                // 只在走过的地方浮起一层很快退去的细霜：不替换任何地面方块。
                WorldFeedback.emit(scope, icywindScene, 1, origin.plus(heading.scale(reach / 2)),
                    { moment: "rimes", radius: reach, halfWidth: halfWidth, cells: frostCells, scale: scale, linger: frostTicks,
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
                const region = WorldGeometry.box(centre, heading, WorldCombat.point(Math.max(0.5, (outer - inner) / 2 + 0.3), 0, width), { below: 2, above: 3 });
                WorldGeometry.selectEnemies(scope, region, function (enemy, facts) {
                    const ref = String(enemy.ref());
                    if (ref === String(current.actor().ref()) || hit[ref] || total >= cap) return;
                    hit[ref] = true;
                    const distance = facts.position().minus(origin).length();
                    const gain = Math.max(0.7, 1 - (distance / Math.max(1, reach)) * 0.3);
                    if (!hurt(current, enemy, "icywind", power * gain, { damage: damageSpec("icywind", "frost") })) return;
                    total++;
                    NativeEffects.boost(scope, enemy, "spe", -stages);
                    WorldFeedback.emit(scope, icywindScene, 1, facts.position(),
                        { moment: "swept", target: ref, count: Math.round(14 + power * 0.3), drop: stages, scale: scale,
                            intensity: Math.max(0.5, Math.min(2, power / 60)) }, 24);
                });
                const left = origin.plus(heading.scale(outer)).plus(side.scale(width));
                const right = origin.plus(heading.scale(outer)).minus(side.scale(width));
                // 判定用的 outer/width 与画出来的锋线端点来自同一组数，锋到哪、哪才会挨冻。
                front.show(current, "front", centre,
                    { moment: "front", radius: width, progress: progress, flow: Math.round(50 + width * 40), drop: stages, scale: scale,
                        path: [[left.x(), left.y(), left.z()], [right.x(), right.y(), right.z()]] });
                step++;
                if (step >= steps) { settle(current); return; }
                current.after(1, function (next: CombatAction) { advance(next); });
            }

            sound(action, "cobblemon:move.powdersnow.actor");
            advance(action);
        }
    });
}
