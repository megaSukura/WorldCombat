/**
 * 冰旋 / icespinner —— 注册与动作。
 *
 * 核心念头：脚上结起薄冰、**以自身为轴旋转着撞进目标**。旋转把沿途的场地整片刮掉，冲过的地面留下
 *   一圈会自己化掉的冰面。它是本组唯一会移动的接触招，也是唯一会改造地面的招。
 *
 * 三幕（提交前只播预告）：
 *   起（windup）：脚下结冰、身体加速旋转，只播预告。
 *   旋（execute）：提交后贴地旋转着朝目标方向冲 `reach` 格；先刮掉路径周围 `sweep` 半径内的所有场地，
 *       再在冲过的地面铺一圈冰面；撞上首个敌人即按 `spin` 结算接触伤害并把它顶开；冲完或受阻则收势。
 *   定（execute 尾）：旋转收势、站稳（skid）。
 *
 * 与同族分开：疾速转轮是旋转冲撞后**自己减速**的火系招，铁滚轮是**吃场地**、没有场地就不成立；
 *   冰旋是唯一边冲边**刮掉场地**、并在地面留下冰面的冰系旋转招。配置 `slick` 由公式改冲距／冲速／威力／冰面。
 */
namespace PokemonSkills {
    /**
     * 沿冲击线把场地刮掉：按生产者声明的场地类别读取，不枚举规则 id，新场地自动可刮。
     * 路径 `sweep` 半径内的场地逐条结束（它们的成员身份随 leave 一起被收回）。
     */
    function icespinnerSweepFields(world: CombatWorld, from: CombatPoint, to: CombatPoint, sweep: number): number {
        var cleared = 0, areas = WorldEffects.areasWithTag(world, WorldEffects.categories.terrain);
        for (var i = 0; i < areas.length; i++) {
            var area = areas[i];
            var centre = WorldCombat.point(area.position[0], area.position[1], area.position[2]);
            var closest = WorldGeometry.closestOnSegment(centre, from, to);
            var dx = centre.x() - closest.x(), dz = centre.z() - closest.z();
            if (Math.sqrt(dx * dx + dz * dz) <= sweep + area.radius
                && world.operation(area.id, "world_combat:dispel", "{}")) cleared++;
        }
        return cleared;
    }

    /** 冲过之处留下一圈短命冰面：沿路径在地表租借 `minecraft:ice`，到期原方块回来。 */
    function icespinnerTrail(world: CombatWorld, from: CombatPoint, direction: CombatPoint, length: number, cells: number, ticks: number): number {
        var flat = WorldCombat.point(direction.x(), 0, direction.z());
        var step = flat.length() > 0.01 ? flat.unit() : WorldCombat.point(1, 0, 0);
        var side = WorldCombat.point(-step.z(), 0, step.x());
        var count = Math.max(2, Math.round(cells));
        var spacing = Math.max(0.6, length / count);
        var placed: any[] = [], used: string[] = [];
        for (var i = 0; i <= count; i++) {
            for (var w = -1; w <= 1; w++) {
                var probe = from.plus(step.scale(i * spacing)).plus(side.scale(w * 0.9));
                var x = Math.floor(probe.x()), z = Math.floor(probe.z()), y = Math.floor(probe.y());
                var ground: CombatBlock | null = null;
                for (var k = 0; k < 4; k++) {
                    var block = world.block(WorldCombat.point(x + 0.5, y, z + 0.5));
                    if (block !== null && block.id() !== "minecraft:air") { ground = block; break; }
                    y -= 1;
                }
                if (ground === null) continue;
                var key = x + "," + y + "," + z;
                if (used.indexOf(key) >= 0) continue;
                used.push(key);
                placed.push({ x: x, y: y, z: z, block: "minecraft:ice" });
            }
        }
        return placed.length ? world.terrain(JSON.stringify({ cells: placed, replace: true, linger: true }), ticks) : 0;
    }

    define({
        freeMovement: true,
        id: icespinnerId,
        cooldownParameter: "recharge",
        name: "Ice Spinner",
        description: "脚上结起薄冰，旋转着撞进目标：沿途把场地整片刮掉，冲过的地面留下一圈会滑、会化掉的冰面，命中按接触结算冰系伤害并把目标顶开。冰面式滑得更远留得更久，碎冰式旋得更狠。",
        uses: ["压进一个贴地的目标并把它顶开", "把对手依赖的场地一次刮掉", "在冲过的地面留下一圈临时冰面"],
        kind: "enemy",
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
            const pathEnd = origin.plus(direction.scale(length));
            let travelled = 0;

            sound(action, "cobblemon:move.icebeam.actor");

            // 世界改造：刮场地、铺冰面，都在提交后一次算清（冲刺路径是确定的）。
            const cleared = icespinnerSweepFields(world, origin, pathEnd, sweep);
            const frosted = icespinnerTrail(world, origin, direction, length, frostCells, frostTicks);
            WorldFeedback.emit(world, icespinnerScene, 1, origin,
                { moment: "glaze", direction: [direction.x(), direction.y(), direction.z()],
                    shards: shards, scale: scale, intensity: intensity, cleared: cleared, frosted: frosted }, 30);
            if (cleared > 0) {
                sound(action, "minecraft:block.glass.break");
                WorldFeedback.text(world, origin.plus(WorldCombat.point(0, 1.3, 0)), icespinnerClearText, [cleared], 26);
            }

            function finish(current: CombatAction, landed: boolean, at: CombatPoint): void {
                const scope = current.world();
                const body = scope.observe(actor);
                const where = body === null ? at : body.position();
                WorldFeedback.emit(scope, icespinnerScene, 1, where,
                    { moment: landed ? "skid" : "miss", target: landed ? "hit" : "", shards: shards,
                        scale: scale, intensity: intensity, cleared: cleared }, 24);
                if (!landed) WorldFeedback.text(scope, where.plus(WorldCombat.point(0, 1.0, 0)), icespinnerMissText, [], 20);
                done(current);
            }

            function advance(current: CombatAction): void {
                const scope = current.world(), here = current.origin();
                const move = Math.min(step, Math.max(0, length - travelled));
                if (move <= 0.001) { finish(current, false, here); return; }
                const delta = direction.scale(move);
                const hit = current.trace(here, here.plus(delta.scale(1.2)), radius);
                if (hit.hitEntity()) {
                    const victim = hit.target(), point = hit.position();
                    const landed = victim !== null && scope.valid(victim) && !scope.friendly(victim)
                        ? impact(current, hit, icespinnerId, p(icespinnerId, "spin", current), { damage: damageSpec(icespinnerId, "spin"), contact: true }) : false;
                    WorldFeedback.emit(scope, icespinnerScene, 1, point,
                        { moment: "impact", target: victim === null ? "" : String(victim.ref()), shards: shards,
                            scale: scale, intensity: intensity, cleared: cleared }, 28);
                    if (landed && victim !== null && scope.valid(victim)) {
                        sound(current, "cobblemon:impact.ice");
                        scope.displace(victim, direction.scale(push));
                        WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.2, 0)), icespinnerHitText, [], 24);
                        finish(current, true, point);
                    } else {
                        finish(current, false, point);
                    }
                    return;
                }
                const moved = scope.displace(actor, delta);
                travelled += moved;
                WorldFeedback.keep(scope, "icespinner:spin:" + String(current.actor().ref()), icespinnerScene, 1, here,
                    { moment: "spin", direction: [direction.x(), 0, direction.z()], shards: shards, scale: scale, intensity: intensity }, 8);
                if (hit.blocked() || moved < 0.05 || travelled >= length) { finish(current, false, here.plus(delta)); return; }
                current.after(1, function (next: CombatAction) { advance(next); });
            }

            advance(action);
        }
    });
}
