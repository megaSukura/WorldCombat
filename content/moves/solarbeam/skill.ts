/**
 * 日光束 / solarbeam —— 出手方式。
 *
 * 核心念头：站在有光的地方把日光收进身体，再沿一条线整束放出去；站在强日光下这一发不必蓄，
 *           阴雨与夜里要站着慢慢聚，而且光弱一半。光柱犁过的草地会晒焦一段时间。
 *
 * 两幕（强日光下只有第二幕，当场发射）：
 *   起（gather，提交前）：光点从头顶向施法者收拢、地面压出一圈光环；只播预告，可被打断（打断不花 PP）。
 *   击（beam → pierce / fizzle）：提交后沿瞄准方向量出一条走廊，用与判定同一组顶点画成光带；
 *       走廊内每个非友方依次挨一记 `ray`（按 `pierce` 截断，被墙挡住的不吃），命中点各起一个贯穿点；
 *       同时把走廊下的草地晒成焦土（world.terrain 的 linger 租约，`scorchTicks` 后原地形长回）。
 *
 * 与同族分开：力量宝石是细而长的贯穿光线、破坏光线要付熄火的代价；日光束的身份是「光来自天，
 * 天赐时来得毫无预兆、无光时更弱更慢」，并且它把范围留在地上（焦土），让玩家一眼看出这条线到哪。
 */
namespace PokemonSkills {
    const solarbeamScene = "world_combat:move_solarbeam";
    const solarbeamSunText = "world_combat.move.solarbeam.text.sun";
    const solarbeamHitText = "world_combat.move.solarbeam.text.hit";
    const solarbeamPierceText = "world_combat.move.solarbeam.text.pierce";
    const solarbeamFizzleText = "world_combat.move.solarbeam.text.fizzle";

    /** 以 origin 为起点、朝 direction 长 reach、半宽 half 的走廊四角；判定与表现共用这一组顶点。 */
    function solarbeamLane(origin: CombatPoint, direction: CombatPoint, reach: number, half: number): CombatPoint[] {
        const flat = WorldCombat.point(direction.x(), 0, direction.z());
        const heading = flat.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : flat.unit();
        const side = WorldCombat.point(-heading.z(), 0, heading.x());
        const end = origin.plus(heading.scale(reach));
        return [origin.plus(side.scale(half)), origin.minus(side.scale(half)), end.minus(side.scale(half)), end.plus(side.scale(half))];
    }

    function solarbeamPath(vertices: CombatPoint[]): number[][] {
        return vertices.map(function (point) { return [point.x(), point.y(), point.z()]; });
    }

    /**
     * 把光柱扫过的地面晒焦：沿走廊每格向下找第一块软土（草／土／苔），换成焦土。
     * 交给 world.terrain 的 linger 租约，`ticks` 后原方块自己放回；石头、方块实体与受保护的方块不动。
     */
    function solarbeamScorch(world: CombatWorld, origin: CombatPoint, direction: CombatPoint, reach: number, half: number, ticks: number): number {
        const flat = WorldCombat.point(direction.x(), 0, direction.z());
        const heading = flat.length() > 0.01 ? flat.unit() : WorldCombat.point(1, 0, 0);
        const side = WorldCombat.point(-heading.z(), 0, heading.x());
        const offsets = half >= 0.8 ? [-1, 0, 1] : [0];
        const soft = ["minecraft:grass_block", "minecraft:dirt", "minecraft:moss_block", "minecraft:podzol",
            "minecraft:mycelium", "minecraft:rooted_dirt", "minecraft:coarse_dirt"];
        const cells: any[] = [], seen: { [key: string]: boolean } = Object.create(null);
        const steps = Math.max(1, Math.round(reach));
        let changed = 0;
        for (let i = 1; i <= steps; i++) for (let lane = 0; lane < offsets.length; lane++) {
            const column = origin.plus(heading.scale(i)).plus(side.scale(offsets[lane]));
            for (let dy = 0; dy >= -3; dy--) {
                const y = Math.floor(column.y()) + dy;
                const block = world.block(WorldCombat.point(Math.floor(column.x()), y, Math.floor(column.z())));
                if (block === null) continue;
                const id = String(block.id());
                if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
                if (soft.indexOf(id) < 0) break;
                const cell = block.position(), key = cell.x() + "," + cell.y() + "," + cell.z();
                if (!seen[key]) { seen[key] = true; cells.push({ x: cell.x(), y: cell.y(), z: cell.z(), block: "minecraft:coarse_dirt" }); changed++; }
                break;
            }
        }
        if (!cells.length) return 0;
        try { world.terrain(JSON.stringify({ cells: cells, replace: true, linger: true }), ticks); }
        catch (error) { return 0; }
        return changed;
    }

    define({
        id: "solarbeam",
        name: "日光束",
        description: "站定把日光收进身体，再沿直线放出一束贯穿的光柱，走廊里的敌人依次挨打，光柱犁过的草地会被晒焦一段时间。站在强日光下不用聚光、当场发射；阴雨天光弱一半、聚光更慢。",
        uses: ["在开阔地上贯穿一条线", "晴天里的无预警重击", "把草地晒出一道可见的焦痕"],
        kind: "enemy",
        range: 12,
        maxRange: 20,
        prepare: 24,
        active: 0,
        recover: 9,
        cooldown: 44,
        style: "solar",
        stationary: true,
        defaults: { broad: false, ai: { maxChase: 18, minRange: 3, lineUp: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("solarbeam", "reach", pokemon), geometry: "line", style: "solar", color: 0xFFE9A0,
                label: config && config.broad ? "散光日光束" : "聚焦日光束" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["solarbeam"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            const broad = !!(config && config.broad);
            return {
                prepare: Math.round(p("solarbeam", "charge", context)),
                recover: Math.round(p("solarbeam", "recover", context)) + (broad ? 2 : 0),
                cooldown: Math.round(p("solarbeam", "cooldown", context)) + (broad ? 3 : 0),
                active: skills["solarbeam"].active,
                range: p("solarbeam", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const light = Math.max(6, Math.round(p("solarbeam", "light", action)));
            const instant = p("solarbeam", "charge", action) <= 0 ? 1 : 0;
            action.present("solarbeam:gather", solarbeamScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", windup: prepare, light: light, sun: instant, target: String(action.actor().ref()) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const origin = action.origin();
            const direction = aim(action);
            const reach = Math.max(3, action.range());
            const half = Math.max(0.2, p("solarbeam", "width", action));
            const power = p("solarbeam", "ray", action);
            const pierce = Math.max(1, Math.round(p("solarbeam", "pierce", action)));
            const push = p("solarbeam", "push", action);
            const light = Math.max(6, Math.round(p("solarbeam", "light", action)));
            const scorch = Math.max(20, Math.round(p("solarbeam", "scorchTicks", action)));
            const scale = Math.max(0.6, Math.min(2.2, half / 0.62));
            const intensity = Math.max(0.6, Math.min(2.6, power / 120));
            const vertices = solarbeamLane(origin, direction, reach, half);
            const path = solarbeamPath(vertices);
            let hits = 0;

            sound(action, "minecraft:entity.warden.sonic_boom");
            WorldFeedback.emit(world, solarbeamScene, 1, origin.plus(WorldCombat.point(0, 0.6, 0)),
                { moment: "beam", path: path, direction: [direction.x(), direction.y(), direction.z()],
                    light: light, scale: scale, intensity: intensity, pierce: pierce, reach: reach }, 26);

            const region = WorldGeometry.polygon(vertices, { below: 2, above: 3 });
            const candidates: { actor: CombatActor; at: CombatPoint }[] = [];
            WorldGeometry.selectEnemies(world, region, function (enemy, facts) {
                if (!world.clear(origin, facts.position())) return;
                candidates.push({ actor: enemy, at: facts.position() });
            });
            candidates.sort(function (a, b) { return a.at.minus(origin).length() - b.at.minus(origin).length(); });
            for (let index = 0; index < candidates.length && hits < pierce; index++) {
                const candidate = candidates[index];
                if (!hurt(action, candidate.actor, "solarbeam", power, { damage: damageSpec("solarbeam", "ray") })) continue;
                hits++;
                if (world.valid(candidate.actor)) world.displace(candidate.actor, direction.scale(push));
                WorldFeedback.emit(world, solarbeamScene, 1, candidate.at,
                    { moment: "pierce", target: String(candidate.actor.ref()), light: light, scale: scale,
                        intensity: Math.max(0.6, Math.min(2.6, power / 120)) }, 24);
            }
            solarbeamScorch(world, origin, direction, reach, half, scorch);

            const tip = origin.plus(direction.scale(reach));
            if (hits > 0) {
                WorldFeedback.text(world, tip.plus(WorldCombat.point(0, 0.8, 0)), hits > 1 ? solarbeamPierceText : solarbeamHitText, hits > 1 ? [hits] : [], 28);
                sound(action, "minecraft:block.beacon.activate");
            } else {
                WorldFeedback.emit(world, solarbeamScene, 1, tip, { moment: "fizzle", point: [tip.x(), tip.y(), tip.z()], scale: scale, light: light }, 20);
                WorldFeedback.text(world, tip.plus(WorldCombat.point(0, 0.8, 0)), solarbeamFizzleText, [], 24);
            }
            if (p("solarbeam", "charge", action) <= 0) {
                const body = world.observe(action.actor());
                if (body !== null) WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.5, 0)), solarbeamSunText, [], 26);
            }
            done(action);
        }
    });
}
