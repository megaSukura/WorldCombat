/**
 * 急速折返 / uturn 的出手方式。
 *
 * 核心念头：沿一条 U 形弧线冲进去撞一下，再顺着弧线滑回来——一记「来了又走」的虫式折返。它不站定换血，
 *   出手本身就是一次脱身：撞上的那一刻就已经在往回走了。念头的形状就是那条 U，来路与回路分开。
 *
 * 三幕：
 *   起（coil，提交前）：压身蓄势、翅鞘震起细粉，弧线在地面上预描一段，只播预告。
 *   撞（sweep，提交后）：沿朝向向目标切进去，命中活体结算 strike 接触伤害；miss 就只是一记扑空。
 *   折（return，提交后）：贴着弧线滑回——交棒式退到 `rally` 内最近的等候伙伴身边，远遁式沿弧拉回更远；
 *      随后抖落一层虫粉收势。
 *
 * 与同族分开：快速折返是「越过目标再深潜」，伏特替换是「放电后瞬移」；只有急速折返是**来路与回路合成一条 U**
 *   ——它结束在离起点不远、偏向一侧的地方，看上去就是折了回去。
 * 提交前只观察、只 `present`；命中、位移与粒子都在提交后写。
 */
namespace PokemonSkills {
    const uturnScene = "world_combat:move_uturn";
    const uturnReliefText = "world_combat.move.uturn.text.relief";
    const uturnMissText = "world_combat.move.uturn.text.miss";
    const uturnSwitchText = "world_combat.move.uturn.text.switch";

    /** 真实换人：有合法后备时收回自己、让后备在折返落点登场；没有后备就保留已在场内的折返。 */
    function uturnHandoff(world: CombatWorld, actor: CombatActor, point: CombatPoint): boolean {
        const reserve = partyReserve(partyRoster(world, actor), partyActiveId(world, actor));
        if (reserve === null) return false;
        const body = world.observe(actor);
        const feet = body === null ? point : partyFeet(body);
        WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1.1, 0)), uturnSwitchText, [], 26);
        return partySwitchOut(world, actor, reserve.slot, feet).ok;
    }

    /** 接应点：`rally` 内最近的、位于背离目标一侧的伙伴，没有就返回 null。 */
    function uturnRelay(world: CombatWorld, actor: CombatActor, heading: CombatPoint, rally: number): CombatPoint | null {
        const self = world.observe(actor);
        if (self === null) return null;
        const origin = self.position();
        const actors = world.query(origin, rally, false);
        let best: CombatPoint | null = null, bestScore = Infinity;
        for (let index = 0; index < actors.length; index++) {
            const other = actors[index];
            if (String(other.ref()) === String(actor.ref()) || !world.friendly(other)) continue;
            const body = world.observe(other);
            if (body === null || body.health() <= 0) continue;
            const away = body.position().minus(origin);
            const along = away.x() * heading.x() + away.z() * heading.z();
            if (along > 1) continue;
            const score = away.length() + (along > 0 ? 2 : 0);
            if (score < bestScore) { bestScore = score; best = body.position(); }
        }
        return best;
    }

    /** 折返沿真实弧线逐刻移动；碰撞截断运动，画面只记录实际走过的路。 */
    function uturnWithdraw(current: CombatAction, actor: CombatActor, heading: CombatPoint, lateral: CombatPoint,
        retreat: number, arc: number, rally: number, handoff: boolean, motes: number,
        speed: number, complete: (action: CombatAction) => void): void {
        const world = current.world(), body = world.observe(actor);
        if (body === null) { complete(current); return; }
        current.releaseTarget();
        const from = body.position();
        let destination = from.plus(heading.scale(-retreat)).plus(lateral.scale(arc)), relayed = false;
        if (handoff) {
            const ally = uturnRelay(world, actor, heading, rally);
            if (ally !== null) { destination = ally.plus(heading.scale(-1.3)); relayed = true; }
        }
        const control = from.plus(lateral.scale(arc * 1.8));
        const steps = Math.max(2, Math.ceil((control.minus(from).length() + destination.minus(control).length()) / Math.max(0.15, speed)));
        const path: number[][] = [[from.x(), from.y() - body.height() / 2, from.z()]];
        function finish(next: CombatAction): void {
            const scope = next.world(), at = scope.observe(actor);
            if (at === null) { complete(next); return; }
            if (relayed) WorldFeedback.text(scope, at.position().plus(WorldCombat.point(0, 1.1, 0)), uturnReliefText, [], 26);
            // A successful native recall ends this action through actor departure.
            if (!uturnHandoff(scope, actor, at.position())) complete(next);
        }
        function follow(next: CombatAction, step: number): void {
            const scope = next.world(), observed = scope.observe(actor);
            if (observed === null) { complete(next); return; }
            const t = step / steps, u = 1 - t;
            const goal = from.scale(u * u).plus(control.scale(2 * u * t)).plus(destination.scale(t * t));
            const delta = goal.minus(observed.position());
            const moved = LivingActions.step(scope, actor, delta);
            const after = scope.observe(actor);
            if (after !== null) path.push([after.position().x(), after.position().y() - after.height() / 2, after.position().z()]);
            WorldFeedback.keep(scope, "uturn:return:" + next.id(), uturnScene, 1, from,
                { moment: "return", motes, arc, path: path.slice() }, 12);
            if (step >= steps || delta.length() > 0.1 && moved < delta.length() * 0.8) { finish(next); return; }
            next.after(1, following => follow(following, step + 1));
        }
        current.stage("returning");
        follow(current, 1);
    }

    define({
        freeMovement: true,
        id: "uturn",
        cooldownParameter: "recharge",
        name: "U-turn",
        description: "沿一条 U 形弧线切进去撞一下，再顺着弧线滑回来；有后备时出手后直接与待命的一只换手，交棒式退到等候的伙伴身边，远遁式沿弧拉得更远。出手就是脱身，不站定换血。",
        uses: ["贴脸打一下再脱身，把身位让出来", "被打崩前用一记折返拉开距离", "有人接应时把敌人引向自己的伙伴"],
        kind: "enemy",
        range: 2.8,
        maxRange: 5,
        prepare: 4,
        active: 0,
        recover: 6,
        cooldown: 26,
        style: "dash",
        defaults: { handoff: false, ai: { maxChase: 4, fleeBelow: 0.4, leaveStation: false } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("uturn", "dash", pokemon), geometry: "line", style: "dash", color: 0xBFE24B,
                label: config && config.handoff === true ? "急速折返·交棒" : "急速折返" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["uturn"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("uturn", "tempo", context)),
                recover: Math.round(p("uturn", "aftercast", context)),
                cooldown: Math.round(p("uturn", "recharge", context)),
                active: 0,
                range: p("uturn", "dash", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("uturn:coil", uturnScene, 1, action.origin(),
                JSON.stringify({ moment: "coil", arc: p("uturn", "arc", action), handoff: config && config.handoff === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor();
            const body = world.observe(actor);
            const target = action.target();
            if (body === null) { done(action); return; }
            const heading = aim(action);
            const length = p("uturn", "dash", action);
            const step = p("uturn", "speed", action);
            const radius = p("uturn", "collisionRadius", action);
            const power = p("uturn", "strike", action);
            const retreat = p("uturn", "return", action);
            const arc = p("uturn", "arc", action);
            const rally = p("uturn", "rally", action);
            const motes = Math.round(p("uturn", "motes", action));
            const handoff = !!(config && config.handoff === true);
            const lateral = WorldCombat.point(-heading.z(), 0, heading.x());
            const scale = Math.max(0.6, Math.min(1.8, radius / 0.42));
            const intensity = Math.max(0.6, Math.min(2.0, power / 48));
            let travelled = 0, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            const outward: number[][] = [[body.position().x(), body.position().y() - body.height() / 2, body.position().z()]];
            function trail(current: CombatAction): void {
                const scope = current.world(), at = scope.observe(actor);
                if (at === null) return;
                outward.push([at.position().x(), at.position().y() - at.height() / 2, at.position().z()]);
                WorldFeedback.keep(scope, "uturn:sweep:" + current.id(), uturnScene, 1, at.position(),
                    { moment: "sweep", motes, scale, intensity, path: outward.slice() }, 8);
            }

            function advance(current: CombatAction): void {
                const scope = current.world(), here = current.origin();
                const delta = heading.scale(Math.min(step, length - travelled));
                const goal = here.plus(delta);
                const traced = current.trace(here, goal, radius);
                if (traced.hitEntity()) {
                    const contactDistance = Math.min(delta.length(), Math.max(0, traced.position().minus(here).length() - 0.02));
                    if (contactDistance > 0) scope.displace(actor, heading.scale(contactDistance));
                    trail(current);
                    const victim = traced.target();
                    let landed = false;
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim))
                        landed = impact(current, traced, "uturn", power,
                            { damage: damageSpec("uturn", "strike"), contact: true });
                    WorldFeedback.emit(scope, uturnScene, 1, traced.position(), {
                        moment: "strike", target: victim !== null ? String(victim.ref()) : "",
                        motes: motes, scale: scale, intensity: intensity, landed: landed ? 1 : 0
                    }, 24);
                    sound(current, "cobblemon:impact.bug");
                    uturnWithdraw(current, actor, heading, lateral, retreat, arc, rally, handoff, motes, step, finish);
                    return;
                }
                const moved = scope.displace(actor, delta);
                travelled += moved;
                trail(current);
                if (traced.blocked() || moved < 0.05 || travelled >= length) {
                    WorldFeedback.emit(scope, uturnScene, 1, here.plus(delta), { moment: "miss", motes: motes, scale: scale }, 18);
                    WorldFeedback.text(scope, here.plus(delta).plus(WorldCombat.point(0, 1, 0)), uturnMissText, [], 20);
                    sound(current, "minecraft:entity.player.attack.nodamage");
                    uturnWithdraw(current, actor, heading, lateral, retreat, arc, rally, handoff, motes, step, finish);
                    return;
                }
                current.after(1, advance);
            }

            sound(action, "cobblemon:move.quickattack.actor");
            advance(action);
        }
    });
}
