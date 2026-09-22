/**
 * 真空波 / vacuumwave 的出手方式。
 *
 * 核心念头：抡拳把空气抽空，一道真空波贴着地面向前推；它不接触、按特攻结算，波面经过的敌人被抽向施法者——
 *   能把逃开的人拉回近身、把散开的敌人扫成一堆。它身位不动，是这一族里唯一的远程与特殊招。
 *
 * 两幕：
 *   起（windup，提交前）：双拳在身前抡起、空气向内收拢，只播预告（present charge）。
 *   推（execute）：提交后波面从身前逐刻向前推进；整条走廊被同一组顶点铺出（present lane），
 *       波面每到一段就把那段走廊里的非友方结算一次 wave 特殊伤害，并把他们朝施法者抽回（suck，按体型换算）；
 *       一路推到尽头没碰到人就只是把空气推空（whiff）。
 *
 * 反制：波面沿一条走廊，站到走廊外安全；吸力只把目标拉向施法者，离得越远越难被一次拽到。
 */
namespace PokemonSkills {
    function vacuumwaveCoords(point: CombatPoint): number[] { return [point.x(), point.y(), point.z()]; }

    define({
        id: vacuumwaveId,
        name: "Vacuum Wave",
        description: "Whirl your fists to send a wave of pure vacuum at the target. This move always goes first.",
        uses: ["远程先手扫过一条走廊", "把逃开的敌人抽回近身", "把散开的敌人扫成一堆再打"],
        kind: "enemy",
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
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            const origin = body === null ? action.origin() : body.position();
            const at = action.targetPosition();
            const flat = WorldCombat.point(at.x() - origin.x(), 0, at.z() - origin.z());
            const heading = flat.length() < 0.3 ? aim(action) : flat.unit();
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
            const end = origin.plus(heading.scale(reach));
            const lanePath = [vacuumwaveCoords(origin.plus(side.scale(halfWidth))), vacuumwaveCoords(origin.minus(side.scale(halfWidth))),
                vacuumwaveCoords(end.minus(side.scale(halfWidth))), vacuumwaveCoords(end.plus(side.scale(halfWidth)))];
            const direction = [heading.x(), heading.y(), heading.z()];
            const caught: { [ref: string]: boolean } = {};
            let front = 0, hits = 0, settled = false;

            sound(action, "cobblemon:move.gust.actor");
            WorldFeedback.emit(world, vacuumwaveScene, 1, origin,
                { moment: "lane", path: lanePath, direction: direction, halfWidth: halfWidth, reach: reach,
                    gust: gust, scale: scale, intensity: intensity }, Math.max(20, Math.round(reach / pace) + 20));
            WorldFeedback.emit(world, vacuumwaveScene, 1, origin,
                { moment: "wave", direction: direction, gust: gust, scale: scale, intensity: intensity }, 20);

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                if (hits === 0) {
                    const where = origin.plus(heading.scale(reach));
                    WorldFeedback.emit(scope, vacuumwaveScene, 1, where, { moment: "whiff", gust: gust, scale: scale }, 22);
                    WorldFeedback.text(scope, where.plus(WorldCombat.point(0, 1.05, 0)), vacuumwaveMissText, [], 22);
                    scope.sound("minecraft:entity.breeze.wind_burst", where, 14, "{}");
                }
                done(current);
            }

            function advance(current: CombatAction): void {
                const scope = current.world();
                front = Math.min(reach, front + pace);
                const frontPoint = origin.plus(heading.scale(front));
                WorldFeedback.keep(scope, "vacuumwave:front:" + current.id(), vacuumwaveScene, 1, frontPoint,
                    { moment: "wave", direction: direction, gust: gust, scale: scale, intensity: intensity }, 20);
                WorldGeometry.selectEnemies(scope, WorldGeometry.lane(origin, heading, front, halfWidth, { below: 1.2, above: 3.0 }),
                    function (victim: CombatActor, facts: CombatObservation): void {
                        const ref = String(victim.ref());
                        if (caught[ref]) return;
                        caught[ref] = true;
                        const landed = hurt(current, victim, vacuumwaveId, power, { damage: damageSpec(vacuumwaveId, "wave") });
                        if (!landed) return;
                        hits++;
                        const caster = scope.observe(current.actor());
                        const casterPoint = caster === null ? origin : caster.position();
                        const toward = casterPoint.minus(facts.position());
                        const length = toward.length();
                        let drag = 0;
                        if (length > 0.05) {
                            const bulk = Math.max(0.6, facts.width() * facts.height());
                            const resist = Math.max(0.35, Math.min(1.6, 1.15 / bulk));
                            drag = pull * resist;
                            scope.displace(victim, toward.unit().scale(drag));
                        }
                        WorldFeedback.emit(scope, vacuumwaveScene, 1, facts.position(),
                            { moment: "suck", target: ref, direction: [toward.x(), toward.y(), toward.z()],
                                drag: drag, gust: gust, scale: scale, intensity: intensity }, 22);
                        scope.sound("cobblemon:impact.fighting", facts.position(), 14, "{}");
                        if (hits === 1) WorldFeedback.text(scope, facts.position().plus(WorldCombat.point(0, 1.05, 0)), vacuumwaveHitText, [], 22);
                    });
                if (front >= reach - 0.001) { finish(current); return; }
                current.after(1, advance);
            }
            advance(action);
        }
    });
}
