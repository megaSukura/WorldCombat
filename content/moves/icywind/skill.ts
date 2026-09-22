/**
 * 冰冻之风 / icywind 的出手方式。
 *
 * 核心念头：从嘴边吐出一堵会走的冷气锋——它贴着地面由近及远向前推出一条走廊，把沿途站在地上的人
 * 冻得发僵（速度下降），走过的地方留下一层白霜。锋面的位置就是会被冻到的位置。
 *
 * 三幕：
 *   起（windup，提交前）：嘴边泛起白气、霜点聚拢的预告。
 *   推（front → swept → hit）：提交后冷气锋从脚边起向前推进，一圈圈扫过走廊；每一步把
 *       走廊那一段内的敌人各冻一次（伤害 + 速度下降 `slowStages` 级），同一目标只冻一次。
 *   痕（rimes）：锋推到尽头后，走过的地表铺上一层白霜，停留 `frostTicks` 后原方块回来。
 *
 * 配置 `deepfreeze`（深寒式）由 resolve 改时序、由公式改射程与威力：开启＝收短、更冷、多降一级速度，
 * 冷却更长；关闭＝吹得更远更广。
 *
 * 只命中走廊带内的目标；走廊以外的敌人安全，这是这招可被读出的范围。
 */
namespace PokemonSkills {
    const icywindScene = "world_combat:move_icywind";
    const icywindHitText = "world_combat.move.icywind.text.hit";
    const icywindMissText = "world_combat.move.icywind.text.miss";

    /** 在冷气锋走过的走廊地表铺一层白霜：逐列找地表，在其上方放雪层（租借，到期归还原方块）。 */
    function icywindRime(world: CombatWorld, origin: CombatPoint, heading: CombatPoint, reach: number, halfWidth: number, ticks: number, cap: number): number {
        const side = WorldCombat.point(-heading.z(), 0, heading.x());
        const cells: any[] = [];
        const limit = Math.max(8, Math.round(cap));
        const r = Math.ceil(reach);
        const baseX = Math.floor(origin.x()), baseZ = Math.floor(origin.z()), baseY = Math.floor(origin.y());
        for (let dx = -r; dx <= r && cells.length < limit; dx++) for (let dz = -r; dz <= r && cells.length < limit; dz++) {
            const along = dx * heading.x() + dz * heading.z();
            if (along < 0.5 || along > reach) continue;
            const across = dx * side.x() + dz * side.z();
            const width = halfWidth * (0.7 + 0.6 * along / Math.max(0.5, reach));
            if (Math.abs(across) > width) continue;
            const x = baseX + dx, z = baseZ + dz;
            for (let dy = 2; dy >= -3; dy--) {
                const ground = world.block(WorldCombat.point(x, baseY + dy, z));
                if (ground === null) break;
                const id = String(ground.id());
                if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
                if (id === "minecraft:water" || id === "minecraft:lava" || id === "minecraft:bedrock" || id === "minecraft:barrier") break;
                // 冻的是地面本身：把表层方块换成雪块，脚印踩上去就是冻过的那条走廊。
                if (id !== "minecraft:snow_block") cells.push({ x: x, y: baseY + dy, z: z, block: "minecraft:snow_block" });
                break;
            }
        }
        if (!cells.length) return 0;
        try { world.terrain(JSON.stringify({ cells: cells, replace: true, linger: true }), Math.max(40, Math.round(ticks))); }
        catch (error) { return 0; }
        return cells.length;
    }

    define({
        id: "icywind",
        name: "Icy Wind",
        description: "从嘴边吐出一堵会走的冷气锋，贴着地面向前推出整条走廊：被扫到的敌人挨冻并降低速度，走过的地方留下一层白霜。深寒式收短更冷、多降一级速度；广域式吹得更远更广。",
        uses: ["一次冻到排成一条线的几个敌人", "削掉冲过来的快目标的速度", "用锋面的走向把一条通道封住", "隔着距离先手减速，再交给队友处理"],
        kind: "enemy",
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
            const at = action.targetPosition();
            const flat = WorldCombat.point(at.x() - origin.x(), 0, at.z() - origin.z());
            const heading = flat.length() < 0.01 ? WorldCombat.point(action.direction().x(), 0, action.direction().z()) : flat.unit();
            const side = WorldCombat.point(-heading.z(), 0, heading.x());
            const reach = Math.max(3.5, p("icywind", "reach", action));
            const halfWidth = Math.max(0.9, p("icywind", "halfWidth", action));
            const power = p("icywind", "frost", action);
            const stages = Math.max(1, Math.round(p("icywind", "slowStages", action)));
            const steps = Math.max(3, Math.round(p("icywind", "travelTicks", action)));
            const frostTicks = Math.max(60, Math.round(p("icywind", "frostTicks", action)));
            const cells = Math.max(20, Math.round(p("icywind", "frostCells", action)));
            const cap = Math.max(1, Math.round(p("icywind", "maxTargets", action)));
            const scale = reach / 6.0;
            const hit: { [ref: string]: boolean } = {};
            let step = 0, total = 0, settled = false;

            function settle(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                const placed = icywindRime(scope, origin, heading, reach, halfWidth, frostTicks, cells);
                const l0 = origin.plus(side.scale(halfWidth * 0.7)), r0 = origin.minus(side.scale(halfWidth * 0.7));
                const far = origin.plus(heading.scale(reach));
                const l1 = far.plus(side.scale(halfWidth * 1.3)), r1 = far.minus(side.scale(halfWidth * 1.3));
                WorldFeedback.emit(scope, icywindScene, 1, origin.plus(heading.scale(reach / 2)),
                    { moment: "rimes", radius: reach, halfWidth: halfWidth, cells: placed, scale: scale,
                        path: [[l0.x(), l0.y(), l0.z()], [r0.x(), r0.y(), r0.z()], [r1.x(), r1.y(), r1.z()], [l1.x(), l1.y(), l1.z()]] }, 30);
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
                WorldFeedback.keep(scope, "icywind:front:" + String(current.actor().ref()), icywindScene, 1, centre,
                    { moment: "front", radius: width, progress: progress, flow: Math.round(50 + width * 40), drop: stages, scale: scale,
                        path: [[left.x(), left.y() + 0.4, left.z()], [right.x(), right.y() + 0.4, right.z()]] }, 12);
                step++;
                if (step >= steps) { settle(current); return; }
                current.after(1, function (next: CombatAction) { advance(next); });
            }

            sound(action, "cobblemon:move.powdersnow.actor");
            WorldFeedback.emit(world, icywindScene, 1, origin,
                { moment: "front", radius: halfWidth, progress: 0, flow: Math.round(50 + halfWidth * 40), drop: stages, scale: scale }, 16);
            advance(action);
        }
    });
}
