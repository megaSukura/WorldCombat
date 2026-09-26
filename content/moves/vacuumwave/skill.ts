/**
 * 真空波 / vacuumwave 的出手方式。
 *
 * 核心念头：抡拳把空气抽空，一道真空波贴着地面向前推；它不接触、按特攻结算，波面经过的敌人被抽向施法者——
 *   能把逃开的人拉回近身、把散开的敌人扫成一堆。它身位不动，是这一族里唯一的远程与特殊招。
 *
 * 两幕：
 *   起（windup，提交前）：双拳在身前抡起、空气向内收拢，只播预告（present charge）。
 *   推（execute）：提交后波面从身前逐刻向前推进；整条走廊被同一组顶点铺出（present lane），
 *       波面每到一段就把那段走廊里的非友方结算一次 wave 特殊伤害，并按实际位移把他们朝施法者抽回（suck）；
 *       中心线上的第一块方块会把整道波切短（地形遮挡切掉后续），一路推到尽头没碰到人就只是把空气推空（whiff）。
 *
 * 选取：`kind: "aim"`——朝方向或世界点都能推，提交后可空放；命中权限仍由命中层按敌我关系判断。
 * 反制：波面沿一条走廊，站到走廊外或躲到墙后安全；吸力只把目标拉向施法者，越轻的身板被拽得越远。
 */
namespace PokemonSkills {
    function vacuumwaveCoords(point: CombatPoint): number[] { return [point.x(), point.y(), point.z()]; }

    define({
        id: vacuumwaveId,
        cooldownParameter: "recharge",
        name: "Vacuum Wave",
        description: "抡拳掀起一道贴地的真空波：不接触、按特攻结算，沿走廊扫过每个敌人的同时把他们朝自己抽回来。身位不动，是这一族里唯一的远程与特殊招；地形会挡住后续，空波也能放。扩散式波面更宽、覆盖更多人，但每一下更轻、射得更短、吸力被摊薄。",
        uses: ["远程先手扫过一条走廊", "把逃开的敌人抽回近身", "把散开的敌人扫成一堆再打"],
        kind: "aim",
        range: 7.5,
        maxRange: 13,
        prepare: 2,
        active: 0,
        recover: 6,
        cooldown: 18,
        style: "wind",
        defaults: { wide: false, ai: { maxChase: 12, pullRunners: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(vacuumwaveId, "reach", pokemon) : 7.5, geometry: "line", style: "wind", color: 0xCFE8E0,
                label: config && config.wide === true ? "真空波·扩散" : "真空波" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[vacuumwaveId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(vacuumwaveId, "tempo", context)),
                recover: Math.round(p(vacuumwaveId, "settle", context)),
                cooldown: Math.round(p(vacuumwaveId, "recharge", context)),
                active: 0,
                range: p(vacuumwaveId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("vacuumwave:charge", vacuumwaveScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", windup: prepare, gust: Math.round(p(vacuumwaveId, "gust", action)),
                    wide: config && config.wide === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const motionScenes = WorldFeedback.actionScenes(vacuumwaveScene);
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            const origin = body === null ? action.origin() : body.position();
            const at = action.targetPosition();
            const flat = WorldCombat.point(at.x() - origin.x(), 0, at.z() - origin.z());
            const heading = flat.length() < 0.3 ? WorldGeometry.flatUnit(aim(action)) : flat.unit();
            const reach = Math.max(3, p(vacuumwaveId, "reach", action));
            const halfWidth = Math.max(0.3, p(vacuumwaveId, "halfWidth", action));
            const pace = Math.max(0.3, p(vacuumwaveId, "pace", action));
            const power = p(vacuumwaveId, "wave", action);
            const pull = Math.max(0.1, p(vacuumwaveId, "pull", action));
            const gust = Math.max(14, Math.round(p(vacuumwaveId, "gust", action)));
            const wide = !!(config && config.wide);
            const scale = Math.max(0.6, Math.min(2.0, halfWidth / 0.7));
            const intensity = Math.max(0.6, Math.min(2.2, power / 60));
            const side = WorldCombat.point(-heading.z(), 0, heading.x());
            // 地形截断：波面沿中心线走，第一块方块把整道波切短，后面的目标不再被扫到。
            const probe = WorldCombat.point(0, 0.35, 0);
            let travel = reach;
            const clip = world.clipBlocks(origin.plus(probe), origin.plus(heading.scale(reach)).plus(probe));
            if (clip !== null && clip.blocked()) {
                const wall = clip.blockPosition();
                if (wall !== null) travel = Math.max(1.5, Math.min(reach, wall.minus(origin).length()));
            }
            const end = origin.plus(heading.scale(travel));
            const lanePath = [vacuumwaveCoords(origin.plus(side.scale(halfWidth))), vacuumwaveCoords(origin.minus(side.scale(halfWidth))),
                vacuumwaveCoords(end.minus(side.scale(halfWidth))), vacuumwaveCoords(end.plus(side.scale(halfWidth)))];
            const direction = [heading.x(), heading.y(), heading.z()];
            const caught: { [ref: string]: boolean } = {};
            let front = 0, hits = 0, settled = false;

            sound(action, "cobblemon:move.gust.actor");
            WorldFeedback.emit(world, vacuumwaveScene, 1, origin,
                { moment: "lane", path: lanePath, direction: direction, halfWidth: halfWidth, reach: travel,
                    gust: gust, scale: scale, intensity: intensity }, Math.max(20, Math.round(travel / pace) + 20));

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                if (hits === 0) {
                    WorldFeedback.emit(scope, vacuumwaveScene, 1, end, { moment: "whiff", gust: gust, scale: scale }, 22);
                    WorldFeedback.text(scope, end.plus(WorldCombat.point(0, 1.05, 0)), vacuumwaveMissText, [], 22);
                    scope.sound("minecraft:entity.breeze.wind_burst", end, 14, "{}");
                }
                motionScenes.finish(current, done);
            }

            function advance(current: CombatAction): void {
                const scope = current.world();
                front = Math.min(travel, front + pace);
                const frontPoint = origin.plus(heading.scale(front));
                motionScenes.show(current, "wave", frontPoint,
                    { moment: "wave", direction: direction, gust: gust, scale: scale, intensity: intensity });
                WorldGeometry.selectEnemies(scope, WorldGeometry.lane(origin, heading, front, halfWidth, { below: 1.2, above: 3.0 }),
                    function (victim: CombatActor, facts: CombatObservation): void {
                        const ref = String(victim.ref());
                        if (caught[ref]) return;
                        caught[ref] = true;
                        if (!scope.clear(origin, facts.position())) return;
                        const landed = hurt(current, victim, vacuumwaveId, power, { damage: damageSpec(vacuumwaveId, "wave") });
                        if (!landed) return;
                        hits++;
                        const caster = scope.observe(current.actor());
                        const casterPoint = caster === null ? origin : caster.position();
                        const toward = casterPoint.minus(facts.position());
                        const length = toward.length();
                        let drag = 0, applied = 0;
                        if (length > 0.05) {
                            const bulk = Math.max(0.6, facts.width() * facts.height());
                            const resist = Math.max(0.35, Math.min(1.6, 1.15 / bulk));
                            drag = pull * resist;
                            if (scope.valid(victim)) applied = scope.displace(victim, toward.unit().scale(drag));
                        }
                        const moved = applied > 0.01;
                        // 回吸只按实际位移反馈：拉不动（如 Boss）时不出满屏吸尘，伤害照常结算。
                        WorldFeedback.emit(scope, vacuumwaveScene, 1, facts.position(),
                            { moment: "suck", target: ref, direction: [toward.x(), toward.y(), toward.z()],
                                drag: Math.round(applied * 100) / 100,
                                suck: moved ? Math.max(6, Math.round(gust * Math.min(1, applied / Math.max(0.01, drag)))) : 0,
                                gust: gust, scale: scale, intensity: intensity }, 22);
                        scope.sound("cobblemon:impact.fighting", facts.position(), 14, "{}");
                        if (hits === 1) WorldFeedback.text(scope, facts.position().plus(WorldCombat.point(0, 1.05, 0)), vacuumwaveHitText, [], 22);
                    });
                if (front >= travel - 0.001) { finish(current); return; }
                current.after(1, advance);
            }
            advance(action);
        }
    });
}
