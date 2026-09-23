/**
 * 扫墓 / lastrespects 的出手方式。
 *
 * 核心念头：为倒下的伙伴送行——施法者低头默立，悔恨从地里升起，汇成一道随行的鬼影；它一路走向对手，
 *   把这一记替倒下的伙伴扫出去。**倒下的伙伴越多，随行的鬼影越多、这一扫越重。**
 *
 * 三幕：
 *   起（windup，提交前）：低头默立，脚下按倒下伙伴数升起鬼影（只播预告）。
 *   行（march → strike）：提交后贴着地面走向目标，一道鬼影线从施法者连到目标、随两者移动。
 *   击（strike / sweep）：走到目标身前落下这一扫——送行式聚到一点重打一个；随行式在半宽 `width` 的
 *       走廊里向前扫过去，路上每个敌人各吃一记 `mourn`，被顶开 `push`。
 *   收（miss）：一路没碰到人则在终点散去。
 *
 * 与同族分开：愤怒之拳记的是**自己挨了几下**、打出一串快拳；扫墓记的是**伙伴倒了几位**，是一记
 *   替他们慢慢送上门的重扫——鬼影走在地上、数量随倒下人数增加，人越多走得越远越沉。
 */
namespace PokemonSkills {
    /** 一条走廊的四个角（起、终各两侧）；判定与外扩鬼影共用同一组顶点。 */
    function lastrespectsLane(start: CombatPoint, end: CombatPoint, half: number): number[][] {
        const flat = WorldCombat.point(end.x() - start.x(), 0, end.z() - start.z());
        const heading = flat.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : flat.unit();
        const side = WorldCombat.point(-heading.z(), 0, heading.x());
        return [start, end, end.minus(side.scale(half)), start.minus(side.scale(half))]
            .map(function (point) { return [point.x(), point.y(), point.z()]; });
    }

    define({
        freeMovement: true,
        id: lastrespectsId,
        cooldownParameter: "recharge",
        name: "Last Respects",
        description: "为倒下的伙伴送行：从地里升起随行的鬼影，一路走向对手落下这一扫。同阵营倒下的伙伴越多，鬼影越多、这一扫越重；随行式扫过一条走廊，送行式聚到一点重打一个。",
        uses: ["伙伴倒下后替他们扫出这一记", "随行时沿路清掉一条走廊", "送行时把一个人重捶出很远"],
        kind: "enemy",
        range: 3.4,
        maxRange: 7.0,
        prepare: 7,
        active: 0,
        recover: 9,
        cooldown: 26,
        style: "ghost",
        defaults: { trail: false, ai: { maxChase: 9, mournful: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: (pokemon ? p(lastrespectsId, "width", pokemon) : 0.5) * 1.9, geometry: "line", style: "ghost",
                color: 0x9FE8D0, label: config && config.trail === true ? "扫墓·随行" : "扫墓" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[lastrespectsId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(lastrespectsId, "tempo", context)),
                recover: Math.round(p(lastrespectsId, "settle", context)),
                cooldown: Math.round(p(lastrespectsId, "recharge", context)),
                active: 0,
                range: p(lastrespectsId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const world = action.sense(), actor = action.actor();
            const fallen = world.valid(actor) ? lastrespectsCount(world, actor) : 0;
            action.present("lastrespects:kneel", lastrespectsScene, 1, action.origin(),
                JSON.stringify({ moment: "kneel", fallen: fallen, ghosts: Math.max(2, 2 + fallen * 3),
                    trail: config && config.trail === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor();
            const body = world.observe(self);
            if (body === null) { done(action); return; }
            const start = body.position();
            const direction = aim(action);
            const reach = Math.max(2.6, p(lastrespectsId, "reach", action));
            const step = p(lastrespectsId, "speed", action);
            const power = p(lastrespectsId, "mourn", action);
            const width = p(lastrespectsId, "width", action);
            const push = p(lastrespectsId, "push", action);
            const ghosts = Math.max(2, Math.round(p(lastrespectsId, "ghosts", action)));
            const fallen = lastrespectsCount(world, self);
            const trail = !!(config && config.trail === true);
            const scale = Math.max(0.7, Math.min(2.0, width / 0.5));
            const intensity = Math.max(0.6, Math.min(2.6, power / 60));
            const startRef = String(self.ref());
            const victimRef = action.target() !== null ? String(action.target()!.ref()) : "";
            let travelled = 0, struck = false;

            sound(action, "cobblemon:move.shadowball.actor");
            if (fallen > 0) WorldFeedback.text(world, start.plus(WorldCombat.point(0, 1.25, 0)), lastrespectsMarchText, [fallen], 24);
            WorldFeedback.keep(world, "lastrespects:march:" + action.id(), lastrespectsScene, 1, start,
                { moment: "march", path: victimRef !== "" ? [startRef, victimRef] : [startRef],
                    ghosts: ghosts, fallen: fallen, scale: scale, intensity: intensity },
                Math.max(40, Math.round(reach / Math.max(0.05, step)) + 24));

            function strike(current: CombatAction): void {
                if (struck) return;
                struck = true;
                const scope = current.world();
                const here = current.origin();
                let landed = 0;
                if (trail) {
                    const span = Math.max(0.6, travelled);
                    const region = WorldGeometry.lane(start, direction, span, width, { below: 1.4, above: 2.4 });
                    WorldFeedback.emit(scope, lastrespectsScene, 1, start,
                        { moment: "sweep", path: lastrespectsLane(start, here, width), width: width, ghosts: ghosts, fallen: fallen,
                            scale: scale, intensity: intensity }, 28);
                    WorldGeometry.selectEnemies(scope, region, function (enemy, facts) {
                        if (!hurt(current, enemy, lastrespectsId, power, { damage: damageSpec(lastrespectsId, "mourn") })) return;
                        landed++;
                        if (scope.valid(enemy)) {
                            const away = facts.position().minus(start);
                            if (away.length() > 0.2) scope.displace(enemy, WorldCombat.point(away.x(), 0, away.z()).unit().scale(push));
                        }
                        WorldFeedback.emit(scope, lastrespectsScene, 1, facts.position(),
                            { moment: "strike", target: String(enemy.ref()), ghosts: ghosts, fallen: fallen, scale: scale, intensity: intensity }, 24);
                    });
                } else {
                    WorldFeedback.emit(scope, lastrespectsScene, 1, here,
                        { moment: "strike", path: lastrespectsLane(start, here, width), ghosts: ghosts, fallen: fallen,
                            scale: scale, intensity: intensity }, 26);
                    const victim = current.target();
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                        if (hurt(current, victim, lastrespectsId, power, { damage: damageSpec(lastrespectsId, "mourn") })) {
                            landed++;
                            const away = here.minus(start);
                            if (scope.valid(victim) && away.length() > 0.2) scope.displace(victim, WorldCombat.point(away.x(), 0, away.z()).unit().scale(push));
                            WorldFeedback.emit(scope, lastrespectsScene, 1, here,
                                { moment: "strike", target: String(victim.ref()), ghosts: ghosts, fallen: fallen, scale: scale, intensity: intensity }, 24);
                        }
                    }
                }
                if (landed > 0) {
                    WorldFeedback.text(scope, here.plus(WorldCombat.point(0, 1.25, 0)), lastrespectsStrikeText, [fallen, ghosts], 26);
                    sound(current, "minecraft:entity.evoker_fangs.attack");
                } else {
                    WorldFeedback.emit(scope, lastrespectsScene, 1, here, { moment: "miss", scale: scale }, 20);
                    WorldFeedback.text(scope, here.plus(WorldCombat.point(0, 1.0, 0)), lastrespectsMissText, [], 22);
                }
                done(current);
            }

            function advance(current: CombatAction): void {
                const scope = current.world(), here = current.origin();
                const delta = direction.scale(Math.min(step, reach - travelled));
                const moved = scope.displace(current.actor(), delta);
                travelled += moved;
                const victim = current.target();
                let close = false;
                if (victim !== null && scope.valid(victim)) {
                    const vb = scope.observe(victim);
                    if (vb !== null) close = vb.position().minus(here).length() <= Math.max(0.9, width + 0.5);
                }
                if (close || travelled >= reach || moved < 0.05) { strike(current); return; }
                current.after(1, advance);
            }
            advance(action);
        }
    });
}
