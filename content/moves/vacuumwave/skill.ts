/**
 * 真空波 / vacuumwave 的出手方式。
 *
 * 核心念头：抡拳把空气抽空，一道低压空气波沿瞄准方向向前推进；它不接触、按特攻结算，只在**本刻新扫过的
 *   一段有限厚带**里结算，波面经过的敌人被抽向施法者——能把逃开的人拉回近身、把散开的敌人扫成一堆。
 *   它身位不动，是这一族里唯一的远程与特殊招。
 *
 * 两幕：
 *   起（windup，提交前）：双拳在身前抡起、空气向内收拢，只播预告（present charge）。
 *   推（execute）：提交后波面从身前逐刻向前推进。每一刻只在「上一刻前沿 → 当刻前沿」这段实心厚带里用
 *       `WorldGeometry.bodyPolygon` 做真实身体箱判定：被扫到的非友方按 `wave` 特殊伤害结算一次，
 *       并按**实际位移**朝施法者抽回（`hitDisplace`，保留原生抗击退与事件，拉不动时不出满屏吸尘）。
 *       中心线在**真实接触面**被方块截断（`WorldGeometry.blockHit` 的接触点，不用方块格坐标、不留固定最短长）。
 *       表现与判定共用同一条厚带的端点：波后空出来的地方不再有害。lane 只是紧随前沿的短预告，随动作收束。
 *   收（whiff）：一路推到尽头没碰到人就只是把空气推空。
 *
 * 选取：`kind: "aim"`——朝方向或世界点都能推，提交后可空放；命中权限仍由命中层按敌我关系判断。
 * 反制：站到走廊外、躲到墙后，或等波面过去后再进走廊都安全；吸力只把目标拉向施法者，越轻的身板被拽得越远。
 */
namespace PokemonSkills {
    function vacuumwaveCoords(point: CombatPoint): number[] { return [point.x(), point.y(), point.z()]; }

    define({
        id: vacuumwaveId,
        cooldownParameter: "recharge",
        name: "Vacuum Wave",
        description: "抡拳掀起一道低压空气波：不接触、按特攻结算，只在本刻新扫过的一段厚带里结算，并把扫到的敌人朝自己抽回来。身位不动，是这一族里唯一的远程与特殊招；地形会挡住后续，空波也能放。扩散式波面更宽、覆盖更多人，但每一下更轻、射得更短、吸力被摊薄。",
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
            const scenes = WorldFeedback.actionScenes(vacuumwaveScene);
            const frontScenes = WorldFeedback.actionScenes(vacuumwaveFrontScene);
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            const origin = body === null ? action.origin() : body.position();
            const aimed = action.targetPosition().minus(origin);
            const heading = WorldGeometry.flatUnit(aimed.length() < 0.05 ? action.direction() : aimed, action.direction());
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
            const direction = [heading.x(), heading.y(), heading.z()];
            // 中心线真实接触面截断：波停在墙面实际接触点，不按方块格坐标、也不留固定最短长。
            const probe = WorldCombat.point(0, 0.35, 0);
            let travel = reach;
            const wall = WorldGeometry.blockHit(world, origin.plus(probe), origin.plus(heading.scale(reach)).plus(probe));
            if (wall !== null) {
                const distance = wall.position().minus(origin).length();
                if (isFinite(distance)) travel = Math.max(0.5, Math.min(reach, distance));
            }
            const caught: { [ref: string]: boolean } = Object.create(null);
            let front = 0, hits = 0, settled = false;

            function bandPoints(a: CombatPoint, b: CombatPoint): CombatPoint[] {
                const al = a.minus(side.scale(halfWidth)), ar = a.plus(side.scale(halfWidth));
                const bl = b.minus(side.scale(halfWidth)), br = b.plus(side.scale(halfWidth));
                return [al, ar, br, bl];
            }
            function bandPath(points: CombatPoint[]): number[][] { return points.map(vacuumwaveCoords); }
            /** 波前短横弧：在垂直于推进方向的平面里，按真实半宽从一侧向另一侧张开的弧。 */
            function frontArc(center: CombatPoint): number[][] {
                const points: number[][] = [], samples = 9;
                for (let index = 0; index < samples; index++) {
                    const theta = Math.PI * (0.9 - 0.8 * index / (samples - 1));
                    points.push(vacuumwaveCoords(center.plus(side.scale(Math.cos(theta) * halfWidth))
                        .plus(WorldCombat.point(0, Math.sin(theta) * halfWidth, 0))));
                }
                return points;
            }

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                const end = origin.plus(heading.scale(travel));
                if (hits === 0) {
                    WorldFeedback.emit(scope, vacuumwaveScene, 1, end, { moment: "whiff", gust: gust, scale: scale }, 22);
                    WorldFeedback.text(scope, end.plus(WorldCombat.point(0, 1.05, 0)), vacuumwaveMissText, [], 22);
                    scope.sound("minecraft:entity.breeze.wind_burst", end, 14, "{}");
                }
                frontScenes.stop(current);
                scenes.finish(current, done);
            }

            function advance(current: CombatAction): void {
                const scope = current.world();
                const previous = front;
                front = Math.min(travel, front + pace);
                const from = origin.plus(heading.scale(previous));
                const to = origin.plus(heading.scale(front));
                const band = bandPoints(from, to), bandDraw = bandPath(band);
                scenes.show(current, "wave", to,
                    { moment: "wave", path: bandDraw, direction: direction, halfWidth: halfWidth,
                        gust: gust, scale: scale, intensity: intensity });
                frontScenes.show(current, "wave", to,
                    { moment: "wave", path: bandDraw, arc: frontArc(to), halfWidth: halfWidth, scale: scale, intensity: intensity });
                // lane 只做紧随前沿的短预告，走到尽头自然收束（且随动作清理），不再铺出整条走廊的长危险图。
                const look = Math.min(travel, Math.max(halfWidth * 2.5, 2.0));
                const lane = bandPath(bandPoints(to, origin.plus(heading.scale(Math.min(travel, front + look)))));
                scenes.show(current, "lane", to,
                    { moment: "lane", path: lane, direction: direction, halfWidth: halfWidth,
                        gust: gust, scale: scale, intensity: intensity });
                frontScenes.show(current, "lane", to, { moment: "lane", path: lane, scale: scale, intensity: intensity });
                if (front > previous + 1e-4) {
                    // 只在本刻新扫过的厚带里判定；波后与波前尚未到达的地方都安全。
                    const region = WorldGeometry.bodyPolygon(band, origin.y() - halfWidth, origin.y() + halfWidth);
                    WorldGeometry.selectBodies(scope, region, function (victim: CombatActor, facts: CombatObservation): void {
                        if (scope.friendly(victim)) return;
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
                            // 原生抗击退/事件在此生效；Boss 等高抗推目标可能只被挪动一点甚至不动。
                            if (scope.valid(victim)) applied = scope.hitDisplace(victim, toward.unit().scale(drag));
                        }
                        const moved = applied > 0.01;
                        WorldFeedback.emit(scope, vacuumwaveScene, 1, facts.position(),
                            { moment: "suck", target: ref, direction: [toward.x(), toward.y(), toward.z()],
                                drag: Math.round(applied * 100) / 100,
                                suck: moved ? Math.max(6, Math.round(gust * Math.min(1, applied / Math.max(0.01, drag)))) : 0,
                                gust: gust, scale: scale, intensity: intensity }, 22);
                        scope.sound("cobblemon:impact.fighting", facts.position(), 14, "{}");
                        if (hits === 1) WorldFeedback.text(scope, facts.position().plus(WorldCombat.point(0, 1.05, 0)), vacuumwaveHitText, [], 22);
                    });
                }
                if (front >= travel - 0.001) { finish(current); return; }
                current.after(1, advance);
            }

            sound(action, "cobblemon:move.gust.actor");
            advance(action);
        }
    });
}
