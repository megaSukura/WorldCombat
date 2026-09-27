/**
 * 冰旋 / icespinner —— 注册与动作。
 *
 * 核心念头：脚上结起薄冰、**以自身为轴旋转着撞进目标**。旋转把沿途的场地整片刮掉，冲过的地面留下
 *   一圈会自己化掉的冰面。它是本组唯一会移动的接触招，也是唯一会改造地面的招。
 *
 * 三幕（提交前只播预告）：
 *   起（windup）：脚下结冰、身体加速旋转，只播预告。
 *   旋（execute）：提交后贴地旋转着朝瞄准方向冲 `reach` 格——可以朝地面上的一个点划过场地，不要求有敌人；
 *       每刻随身体真实脚点，把接触中的场地清掉、在真实支撑格上铺一格有限冰面；撞上首个敌人即按 `spin` 结算
 *       接触伤害并把它顶开；冲完或受阻则收势。未来整条路不会被提前改地。
 *   定（execute 尾）：旋转收势、站稳（skid，只在已经走过的末端）。
 *
 * 选取：`kind: "aim"`——方向或世界点都能放；`execute` 用 `aim(action)` 读取方向，不因没有目标而提前结束。
 * 与同族分开：疾速转轮是旋转冲撞后**自己减速**的火系招，铁滚轮是**吃场地**、没有场地就不成立；
 *   冰旋是唯一边冲边**刮掉场地**、并在地面留下冰面的冰系旋转招。配置 `slick` 由公式改冲距／冲速／威力／冰面。
 */
namespace PokemonSkills {
    /**
     * 沿实际冲过的地面清场：只结束当前真实脚点所在楼层、接触范围内的场地（与大地波动同一 surfaceTouches 语义）。
     * 每刻随身体真实位置调用一次，不提前抹掉未来整条路。
     */
    function icespinnerSweepAt(world: CombatWorld, actor: CombatActor, sweep: number): number {
        var body = world.observe(actor);
        if (!body || !body.grounded()) return 0;
        var feet = WorldCombat.point(body.position().x(), body.boundsMin().y(), body.position().z());
        var areas = WorldEffects.areasWithTag(world, WorldEffects.categories.terrain), cleared = 0;
        for (var i = 0; i < areas.length; i++) {
            if (!WorldEffects.surfaceTouches(areas[i], feet, sweep, 1)) continue;
            if (world.operation(areas[i].id, "world_combat:dispel", "{}")) cleared++;
        }
        return cleared;
    }

    /**
     * 当前真实脚点下的支撑格租借成冰：先用 SurfacePaths.support 确认那里是真实支撑面（blockFace up），
     * 只在实际站过的地面放，不把草/墙当脚下地面；同一格只租一次。
     */
    function icespinnerFrostCell(world: CombatWorld, feet: CombatPoint, ticks: number, seen: { [key: string]: boolean }): number {
        var support = SurfacePaths.support(world, feet, .05, 1);
        if (support === null) return 0;
        var x = Math.floor(support.x()), z = Math.floor(support.z()), y = Math.floor(support.y() - .01);
        var block = world.block(WorldCombat.point(x + .5, y, z + .5));
        if (block === null || block.id() === "minecraft:air" || block.id() === "minecraft:ice") return 0;
        var key = x + "," + y + "," + z;
        if (seen[key]) return 0;
        seen[key] = true;
        return world.terrain(JSON.stringify({ cells: [{ x: x, y: y, z: z, block: "minecraft:ice" }], replace: true, linger: true }), ticks);
    }

    /** 绕脚冰刃的表现载荷：尺寸用实际判定半径，转速/亮度用旋击强度；每刻在真实身体位置重发。 */
    function icespinnerBlades(at: CombatPoint, radius: number, intensity: number, active = true): any {
        return { moment: "blades", at: [at.x(), at.y(), at.z()], radius: radius,
            spin: 20 + Math.max(0, Math.min(2.2, intensity)) * 26, intensity: intensity, active: active ? 1 : 0 };
    }

    define({
        freeMovement: true,
        id: icespinnerId,
        cooldownParameter: "recharge",
        name: "Ice Spinner",
        description: "脚上结起薄冰，旋转着撞进目标：沿实际冲过的地面把场地刮掉，冲过处留下一圈会滑、会化掉的冰面，命中按接触结算冰系伤害并把目标顶开。冰面式滑得更远留得更久，碎冰式旋得更狠。",
        uses: ["压进一个贴地的目标并把它顶开", "把对手依赖的场地一次刮掉", "在冲过的地面留下一圈临时冰面"],
        kind: "aim",
        range: 3.2,
        maxRange: 5.4,
        prepare: 9,
        active: 0,
        recover: 10,
        cooldown: 30,
        style: "ice",
        defaults: { slick: false, ai: { maxChase: 7, clearTerrain: true } },
        fields: [flag("slick", "冰面")],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(icespinnerId, "radius", pokemon) * 1.6 : 0.9, geometry: "line", style: "ice", color: 0x7FD7F0,
                label: config && config.slick === true ? "冰旋·冰面" : "冰旋·碎冰" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[icespinnerId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(icespinnerId, "tempo", context)),
                recover: Math.round(p(icespinnerId, "aftercast", context)),
                cooldown: Math.round(p(icespinnerId, "recharge", context)),
                active: 0,
                range: p(icespinnerId, "reach", context) + 0.4
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:icespinner:glaze", icespinnerScene, 1, action.origin(),
                JSON.stringify({ moment: "glaze", slick: config && config.slick === true,
                    shards: Math.round(p(icespinnerId, "shards", action)) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const movementScenes = WorldFeedback.actionScenes(icespinnerScene);
            const blades = WorldFeedback.actionScenes(icespinnerBladeScene);
            const world = action.world();
            const actor = action.actor();
            const direction = aim(action);
            const length = p(icespinnerId, "reach", action);
            const step = p(icespinnerId, "rush", action);
            const radius = p(icespinnerId, "radius", action);
            const sweep = p(icespinnerId, "sweep", action);
            const push = p(icespinnerId, "push", action);
            const shards = Math.max(10, Math.round(p(icespinnerId, "shards", action)));
            const frostTicks = Math.max(40, Math.round(p(icespinnerId, "frost", action)));
            const frostCells = Math.max(4, Math.round(p(icespinnerId, "frostCells", action)));
            const scale = Math.max(0.6, Math.min(2.0, radius / 0.55));
            const intensity = Math.max(0.5, Math.min(2.2, p(icespinnerId, "spin", action) / 92));
            const origin = action.origin();
            let travelled = 0, clearedTotal = 0, frostedTotal = 0, frostLeft = frostCells, settled = false;
            const frostSeen: { [key: string]: boolean } = {};

            sound(action, "cobblemon:move.icebeam.actor");
            WorldFeedback.emit(world, icespinnerScene, 1, origin,
                { moment: "glaze", direction: [direction.x(), direction.y(), direction.z()],
                    shards: shards, scale: scale, intensity: intensity }, 30);
            blades.show(action, "blades", origin, icespinnerBlades(origin, radius, intensity));

            function feetAt(scope: CombatWorld, fallback: CombatPoint): CombatPoint {
                const body = scope.observe(actor);
                return body === null ? fallback : WorldCombat.point(body.position().x(), body.boundsMin().y(), body.position().z());
            }
            /** 每刻随真实脚点：只清当前接触的场地、只在真实支撑格上铺一格有限冰面；未来整条路不被提前改地。 */
            function worldStep(scope: CombatWorld, feet: CombatPoint): void {
                const cleared = icespinnerSweepAt(scope, actor, sweep);
                if (cleared > 0) {
                    clearedTotal += cleared;
                    sound(action, "minecraft:block.glass.break");
                    WorldFeedback.emit(scope, icespinnerScene, 1, feet.plus(WorldCombat.point(0, 1.3, 0)),
                        { moment: "clear", scale: scale, intensity: intensity, cleared: cleared }, 22);
                    WorldFeedback.text(scope, feet.plus(WorldCombat.point(0, 1.3, 0)), icespinnerClearText, [cleared], 26);
                }
                if (frostLeft > 0 && icespinnerFrostCell(scope, feet, frostTicks, frostSeen) > 0) { frostedTotal++; frostLeft--; }
            }
            function finish(current: CombatAction, landed: boolean, at: CombatPoint): void {
                if (settled) return; settled = true;
                const scope = current.world(), body = scope.observe(actor);
                const where = body === null ? at : body.position();
                blades.show(current, "blades", where, icespinnerBlades(where, radius, intensity, false));
                WorldFeedback.emit(scope, icespinnerScene, 1, where,
                    { moment: landed ? "skid" : "miss", target: landed ? "hit" : "", shards: shards,
                        scale: scale, intensity: intensity, cleared: clearedTotal, frosted: frostedTotal }, 24);
                if (!landed) WorldFeedback.text(scope, where.plus(WorldCombat.point(0, 1.0, 0)), icespinnerMissText, [], 20);
                blades.stop(current);
                movementScenes.finish(current, done);
            }

            function advance(current: CombatAction): void {
                const scope = current.world(), here = current.origin();
                const move = Math.min(step, Math.max(0, length - travelled));
                if (move <= 0.001) { finish(current, false, here); return; }
                const delta = direction.scale(move);
                const swept = sweepStep(current, delta, radius), hit = swept.hit;
                if (hit.hitEntity()) {
                    const victim = hit.target(), point = hit.position();
                    worldStep(scope, feetAt(scope, here));
                    const landed = victim !== null && scope.valid(victim) && !scope.friendly(victim)
                        ? impact(current, hit, icespinnerId, p(icespinnerId, "spin", current), { damage: damageSpec(icespinnerId, "spin"), contact: true }) : false;
                    blades.show(current, "blades", point, icespinnerBlades(point, radius, intensity, false));
                    WorldFeedback.emit(scope, icespinnerScene, 1, point,
                        { moment: "impact", target: victim === null ? "" : String(victim.ref()), shards: shards,
                            scale: scale, intensity: intensity, cleared: clearedTotal }, 28);
                    if (landed && victim !== null && scope.valid(victim)) {
                        sound(current, "cobblemon:impact.ice");
                        scope.hitDisplace(victim, direction.scale(push));
                        WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.2, 0)), icespinnerHitText, [], 24);
                        finish(current, true, point);
                    } else {
                        finish(current, false, point);
                    }
                    return;
                }
                travelled += swept.moved;
                const feet = feetAt(scope, current.origin());
                worldStep(scope, feet);
                blades.show(current, "blades", feet, icespinnerBlades(feet, radius, intensity));
                movementScenes.show(current, "spin", here, { moment: "spin", direction: [direction.x(), 0, direction.z()], shards: shards, scale: scale, intensity: intensity });
                if (hit.blocked() || swept.moved < 0.05 || travelled >= length) { finish(current, false, current.origin()); return; }
                current.after(1, function (next: CombatAction) { advance(next); });
            }

            advance(action);
        }
    });
}
