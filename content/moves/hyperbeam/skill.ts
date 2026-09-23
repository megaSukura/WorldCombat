/**
 * 破坏光线 / hyperbeam 的出手方式。
 *
 * 核心念头：把全部能量压成一条笔直的光柱射出去，光柱一直贯穿到尽头——挡在前面的每一个活体都会被打穿，
 * 所以挤成一条线是危险的；射完之后施法者的核心熄灭一段时间，无法行动、无法移动。
 *
 * 三幕：
 *   起：身前收束光点、脚下起尘，光点越聚越亮（windup，提交前）。
 *   击：提交的一刻光柱沿瞄准方向射出——用与表现同一组顶点围出的走廊做判定，走廊内每个敌人各挨一记
 *       `beam` 伤害（按「贯穿上限」截断，撞墙即挡下），命中点各起一个贯穿点（pierce）。
 *   收：光柱熄灭，施法者挂上 `world_combat:status/mustrecharge` 熄火（本单元效果）：无法行动也无法移动；
 *       **贯穿的活体越多，熄火越久**，由 `pierceCost` 逐体累加。力竭期间由 mob_effect_tick 维持低密度余烬。
 *
 * 「无法行动」由一条 CombatStatus.actions 门禁实现；「无法移动」由效果自带的速度归零与 rooted 补上。
 */
namespace PokemonSkills {
    const hyperbeamScene = "world_combat:move_hyperbeam";
    const hyperbeamSpentEffect = "world_combat:hyperbeam_spent";
    const hyperbeamPierceText = "world_combat.move.hyperbeam.text.pierce";
    const hyperbeamSpentText = "world_combat.move.hyperbeam.text.spent";
    const hyperbeamFizzleText = "world_combat.move.hyperbeam.text.fizzle";

    /** 以 origin 为起点、朝 direction 长 reach、半宽 half 的走廊四角；判定与表现共用这一组顶点。 */
    function hyperbeamLane(origin: CombatPoint, direction: CombatPoint, reach: number, half: number): CombatPoint[] {
        const flat = WorldCombat.point(direction.x(), 0, direction.z());
        const heading = flat.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : flat.unit();
        const side = WorldCombat.point(-heading.z(), 0, heading.x());
        const end = origin.plus(heading.scale(reach));
        return [origin.plus(side.scale(half)), origin.minus(side.scale(half)), end.minus(side.scale(half)), end.plus(side.scale(half))];
    }
    function hyperbeamPath(vertices: CombatPoint[]): number[][] {
        return vertices.map(function (point) { return [point.x(), point.y(), point.z()]; });
    }

    /** 光柱熄灭：挂上熄火状态（共享身份 mustrecharge）并停步，播放收场表现与浮字。 */
    function hyperbeamSpent(action: CombatAction, ticks: number, hits: number, intensity: number): void {
        const world = action.world();
        MobEffects.apply(world, action.actor(), hyperbeamSpentEffect, ticks, 0);
        WorldEffects.apply(world, action.actor(), "rooted", {}, ticks);
        world.stopMovement(action.actor());
        const body = world.observe(action.actor());
        if (body !== null) {
            WorldFeedback.emit(world, hyperbeamScene, 1, body.position(),
                { moment: "spent", scale: intensity, seconds: ticks / 20, hits: hits, count: Math.round(10 + (ticks / 20) * 5) }, 30);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.5, 0)), hyperbeamSpentText,
                [Math.round(ticks / 20 * 10) / 10], 30);
        }
        sound(action, "minecraft:block.beacon.deactivate");
        sound(action, "minecraft:block.fire.extinguish");
    }

    define({
        freeMovement: true,
        id: "hyperbeam",
        name: "Hyper Beam",
        description: "把全部能量压成一条贯穿的直线光柱射出去：走廊里的敌人被一起打穿，排队站得越密越吃亏；放完自己熄火一段时间，无法行动也无法移动。",
        uses: ["一条贯穿的直线光柱", "把排成一条线的敌人一起打穿", "用较久的熄火换一次穿透"],
        kind: "enemy",
        range: 11,
        maxRange: 22,
        prepare: 13,
        active: 24,
        recover: 8,
        cooldown: 68,
        style: "beam",
        stationary: true,
        defaults: { focus: false, ai: { minLine: 1, minHealth: 0.35 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("hyperbeam", "reach", pokemon), geometry: "line", style: "beam", color: 0xCFF4FF, label: "破坏光线" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["hyperbeam"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p("hyperbeam", "charge", context)),
                recover: 8,
                cooldown: Math.round(p("hyperbeam", "exhaust", context)) + 16,
                range: p("hyperbeam", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const target = action.targetPosition();
            action.present("world_combat:move_hyperbeam:windup", hyperbeamScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", windup: prepare, point: [target.x(), target.y(), target.z()] }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const origin = action.origin();
            const direction = aim(action);
            const reach = p("hyperbeam", "reach", action);
            const half = p("hyperbeam", "width", action);
            const power = p("hyperbeam", "beam", action);
            const pierce = Math.max(1, Math.round(p("hyperbeam", "pierce", action)));
            const base = Math.max(1, Math.round(p("hyperbeam", "exhaust", action)));
            const surcharge = Math.max(0, Math.round(p("hyperbeam", "pierceCost", action)));
            const scale = half / 0.7;
            const intensity = Math.max(0.6, Math.min(2.6, power / 150));
            const vertices = hyperbeamLane(origin, direction, reach, half);
            const path = hyperbeamPath(vertices);
            let hits = 0;

            sound(action, "cobblemon:move.aurorabeam.actor_1");
            WorldFeedback.emit(world, hyperbeamScene, 1, origin,
                { moment: "beam", path: path, direction: [direction.x(), direction.y(), direction.z()],
                    scale: scale, intensity: intensity, pierce: pierce, reach: reach, notes: Math.round(20 + power * 0.6) }, 26);

            if (half > 0.01) {
                const region = WorldGeometry.polygon(vertices, { below: 2, above: 3 });
                const candidates: { actor: CombatActor; at: CombatPoint }[] = [];
                WorldGeometry.selectEnemies(world, region, function (enemy, facts) {
                    if (!world.clear(origin, facts.position())) return;
                    candidates.push({ actor: enemy, at: facts.position() });
                });
                candidates.sort(function (a, b) { return a.at.minus(origin).length() - b.at.minus(origin).length(); });
                for (let index = 0; index < candidates.length && hits < pierce; index++) {
                    const candidate = candidates[index];
                    if (hurt(action, candidate.actor, "hyperbeam", power, { damage: damageSpec("hyperbeam", "beam") })) hits++;
                    WorldFeedback.emit(world, hyperbeamScene, 1, candidate.at,
                        { moment: "pierce", point: [candidate.at.x(), candidate.at.y(), candidate.at.z()],
                            target: String(candidate.actor.ref()), scale: scale, intensity: intensity }, 24);
                }
            }

            const tip = origin.plus(direction.scale(reach));
            if (hits > 0) {
                WorldFeedback.text(world, tip.plus(WorldCombat.point(0, 0.8, 0)), hyperbeamPierceText, [hits], 28);
                sound(action, "cobblemon:move.aurorabeam.target");
            } else {
                WorldFeedback.emit(world, hyperbeamScene, 1, tip, { moment: "fizzle", point: [tip.x(), tip.y(), tip.z()], scale: scale }, 20);
                WorldFeedback.text(world, tip.plus(WorldCombat.point(0, 0.8, 0)), hyperbeamFizzleText, [], 24);
            }

            hyperbeamSpent(action, Math.max(1, Math.min(240, base + surcharge * Math.max(0, hits - 1))), hits, intensity);
            done(action);
        }
    });

    // 熄火的共享身份门禁：带着 mustrecharge 的人在窗口内不能开始新动作；伤害阶段不受影响。
    CombatStatus.actions.define({ id: "world_combat:hyperbeam/exhaust-gate", applies: function (context) { return context.phase !== "damage"; }, apply: function (context) {
        if (CombatStatus.has(context.world, context.actor, "mustrecharge")) context.blocked.exhausted = true;
    } });

    // 熄火挂上的一刻立刻停步，避免带着残余动量滑出去。
    WorldCombat.on("world_combat:move_hyperbeam/exhaust-halt", "world_combat:mob_effect_added", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== hyperbeamSpentEffect) return;
        event.world().stopMovement(event.actor());
    });

    // 熄火期间把导航速度归零：让「无法移动」对所有活体（含宝可梦的脚本导航）成立。
    WorldCombat.on("world_combat:move_hyperbeam/roots", "world_combat:navigate", "", function (event) {
        if (event.world().mobEffect(event.actor(), hyperbeamSpentEffect) === null) return;
        const data = JSON.parse(String(event.data()));
        data.speed = 0;
        event.data(JSON.stringify(data));
    });

    // 熄火期间维持低密度的余烬：少而稳，靠近脚边，让玩家看清目标。
    WorldCombat.on("world_combat:move_hyperbeam/linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== hyperbeamSpentEffect || event.world().tick() % 20 !== 0) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "world_combat:move_hyperbeam/recharge/" + String(actor.ref()), hyperbeamScene, 1,
            body.position(), { moment: "recharge", target: String(actor.ref()) }, 40);
    });
}
