/**
 * 快速折返 / flipturn 的出手方式。
 *
 * 核心念头：一次泳者式转身——一头撞上目标，翻个身从它身上蹬开，落到目标的**另一侧**；水里的个体蹬得更远。
 *   它和急速折返分开的地方就是落点：急速折返结束在自己这一侧，快速折返越过目标翻了过去。
 *
 * 三幕：
 *   起（crouch，提交前）：压身入水、身侧聚起一道预备的浪，只播预告。
 *   撞（sweep，提交后）：沿朝向冲上去，命中活体结算 ram 接触伤害并把目标朝自己原来的方向推开一点；
 *       miss 就一路游到自己要去的位置。
 *   翻（return，提交后）：越过目标落在对面——深潜式继续深潜远遁，回身式转身落向等候的伙伴；
 *       身后拖出一条水花尾。
 *
 * 与同族分开：急速折返结束在自己一侧、走一条 U；伏特替换是放电后瞬移；只有快速折返以**越过目标**为身份。
 * 提交前只观察、只 `present`；命中、位移与粒子都在提交后写。
 */
namespace PokemonSkills {
    const flipturnScene = "world_combat:move_flipturn";
    const flipturnTurnText = "world_combat.move.flipturn.text.turn";
    const flipturnMissText = "world_combat.move.flipturn.text.miss";
    const flipturnSwitchText = "world_combat.move.flipturn.text.switch";

    /** 真实换人：有合法后备时收回自己、让后备在越过目标后的落点登场；没有后备就保留场内的翻越。 */
    function flipturnHandoff(world: CombatWorld, actor: CombatActor, point: CombatPoint): void {
        const reserve = partyReserve(partyRoster(world, actor), partyActiveId(world, actor));
        if (reserve === null) return;
        const body = world.observe(actor);
        const feet = body === null ? point : partyFeet(body);
        WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1.1, 0)), flipturnSwitchText, [], 26);
        partySwitchOut(world, actor, reserve.slot, feet);
    }

    /** 回身落点：`rally` 内最近的伙伴，没有返回 null。 */
    function flipturnRelay(world: CombatWorld, actor: CombatActor, rally: number): CombatPoint | null {
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
            const score = body.position().minus(origin).length();
            if (score < bestScore) { bestScore = score; best = body.position(); }
        }
        return best;
    }

    /** 位移单次上限 4 格，超出时拆成几步走完。 */
    function flipturnShove(world: CombatWorld, actor: CombatActor, delta: CombatPoint): void {
        let remaining = delta, guard = 0;
        while (remaining.length() > 0.05 && guard++ < 10) {
            const direction = remaining.unit(), step = Math.min(3.5, remaining.length());
            const moved = world.displace(actor, direction.scale(step));
            if (moved <= 0.01) return;
            remaining = remaining.minus(direction.scale(moved));
        }
    }

    function flipturnPlace(world: CombatWorld, actor: CombatActor, body: CombatObservation, destination: CombatPoint): CombatPoint {
        const feet = WorldCombat.point(destination.x(), destination.y() - body.height() / 2, destination.z());
        if (world.teleport(actor, feet)) return destination;
        flipturnShove(world, actor, WorldCombat.point(feet.x() - body.position().x(), 0, feet.z() - body.position().z()));
        const after = world.observe(actor);
        return after === null ? destination : after.position();
    }

    define({
        id: "flipturn",
        name: "Flip Turn",
        description: "撞上目标后翻个身蹬开、越过它落在另一侧；有后备时直接在落点与待命的一只换手，回身式会转身落向等候的伙伴。",
        uses: ["打一下就翻到目标另一侧，换一条攻击线", "在水里边打边拉开距离", "蹬开追兵的同时把身位让给伙伴"],
        kind: "enemy",
        range: 2.6,
        maxRange: 4.6,
        prepare: 4,
        active: 0,
        recover: 6,
        cooldown: 26,
        style: "dash",
        defaults: { turn: false, ai: { maxChase: 8, fleeBelow: 0.4, leaveStation: false } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("flipturn", "dash", pokemon), geometry: "line", style: "dash", color: 0x4FB3E8,
                label: config && config.turn === true ? "快速折返·回身" : "快速折返" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["flipturn"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("flipturn", "tempo", context)),
                recover: Math.round(p("flipturn", "aftercast", context)),
                cooldown: Math.round(p("flipturn", "recharge", context)),
                active: 0,
                range: p("flipturn", "dash", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("flipturn:crouch", flipturnScene, 1, action.origin(),
                JSON.stringify({ moment: "crouch", turn: config && config.turn === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor();
            const body = world.observe(actor);
            const target = action.target();
            if (body === null) { done(action); return; }
            const heading = aim(action);
            const length = p("flipturn", "dash", action);
            const step = p("flipturn", "speed", action);
            const radius = p("flipturn", "collisionRadius", action);
            const power = p("flipturn", "ram", action);
            const cross = p("flipturn", "cross", action);
            const glide = p("flipturn", "glide", action);
            const shove = p("flipturn", "shove", action);
            const rally = p("flipturn", "rally", action);
            const motes = Math.round(p("flipturn", "motes", action));
            const turn = !!(config && config.turn === true);
            const wet = body.wet();
            const scale = Math.max(0.6, Math.min(1.9, radius / 0.42));
            const intensity = Math.max(0.6, Math.min(2.0, power / 46));
            let travelled = 0, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            /** 越过目标并滑走（或回身）。 */
            function crossOver(current: CombatAction, victim: CombatPoint | null): void {
                const scope = current.world(), here = scope.observe(actor);
                if (here === null) { finish(current); return; }
                const start = here.position();
                const anchor = victim !== null ? victim : start.plus(heading.scale(length + cross));
                const landing = WorldCombat.point(anchor.x() + heading.x() * cross, start.y(), anchor.z() + heading.z() * cross);
                let destination = landing;
                if (turn) {
                    const ally = flipturnRelay(scope, actor, rally);
                    destination = ally !== null ? ally.plus(heading.scale(-1.3)) : landing.minus(heading.scale(glide));
                } else {
                    destination = landing.plus(heading.scale(glide));
                }
                const landed = flipturnPlace(scope, actor, here, destination);
                const above = WorldCombat.point(anchor.x(), start.y() + 1.4, anchor.z());
                WorldFeedback.emit(scope, flipturnScene, 1, start, {
                    moment: "return", motes: motes, wet: wet ? 1 : 0, scale: scale, intensity: intensity,
                    path: [[start.x(), start.y() - 0.4, start.z()],
                        [above.x(), above.y(), above.z()],
                        [landed.x(), landed.y() - 0.4, landed.z()]]
                }, 26);
                if (turn) {
                    WorldFeedback.text(scope, start.plus(WorldCombat.point(0, 1.1, 0)), flipturnTurnText, [], 26);
                    scope.sound("minecraft:entity.player.teleport", start, 12, "{}");
                }
                flipturnHandoff(scope, actor, landed);
                finish(current);
            }

            function advance(current: CombatAction): void {
                const scope = current.world(), here = current.origin();
                const victimBody = target !== null && scope.valid(target) ? scope.observe(target) : null;
                const delta = heading.scale(Math.min(step, length - travelled));
                const goal = victimBody !== null ? victimBody.position() : here.plus(heading.scale(length + radius + 0.5));
                const traced = current.trace(here, goal, radius);
                if (traced.hitEntity()) {
                    const victim = traced.target();
                    let landed = false, at: CombatPoint | null = null;
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                        landed = impact(current, traced, "flipturn", power,
                            { damage: damageSpec("flipturn", "ram"), contact: true });
                        const victimBody = scope.observe(victim);
                        if (landed && victimBody !== null) {
                            at = victimBody.position();
                            if (shove > 0.02) scope.displace(victim, heading.scale(shove));
                        }
                    }
                    WorldFeedback.emit(scope, flipturnScene, 1, traced.position(), {
                        moment: "strike", target: victim !== null ? String(victim.ref()) : "",
                        motes: motes, wet: wet ? 1 : 0, scale: scale, intensity: intensity, landed: landed ? 1 : 0
                    }, 24);
                    sound(current, "cobblemon:impact.water");
                    crossOver(current, at !== null ? at : traced.position());
                    return;
                }
                const moved = scope.displace(actor, delta);
                travelled += moved;
                if (traced.blocked() || moved < 0.05 || travelled >= length) {
                    WorldFeedback.emit(scope, flipturnScene, 1, here.plus(delta), { moment: "miss", motes: motes, wet: wet ? 1 : 0, scale: scale }, 18);
                    WorldFeedback.text(scope, here.plus(delta).plus(WorldCombat.point(0, 1, 0)), flipturnMissText, [], 20);
                    sound(current, "minecraft:entity.player.attack.nodamage");
                    crossOver(current, null);
                    return;
                }
                current.after(1, advance);
            }

            const sweepStart = body.position();
            const sweepVictim = target !== null && world.valid(target) ? world.observe(target) : null;
            const sweepEnd = sweepVictim !== null ? sweepVictim.position() : action.targetPosition();
            WorldFeedback.emit(world, flipturnScene, 1, sweepStart, {
                moment: "sweep", motes: motes, wet: wet ? 1 : 0, scale: scale, intensity: intensity,
                path: [[sweepStart.x(), sweepStart.y() - 0.4, sweepStart.z()], [sweepEnd.x(), sweepStart.y() - 0.4, sweepEnd.z()]]
            }, Math.max(20, Math.round(length / Math.max(0.2, step) * 20) + 16));
            sound(action, "cobblemon:move.watergun.actor");
            advance(action);
        }
    });
}
