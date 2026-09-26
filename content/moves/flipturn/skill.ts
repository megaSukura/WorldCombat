/**
 * 快速折返 / flipturn 的出手方式。
 *
 * 核心念头：一次泳者式转身——一头撞上目标，翻个身从它身上蹬开，落到目标的**另一侧**；水里的个体蹬得更远。
 *   它和急速折返分开的地方就是落点：急速折返结束在自己这一侧，快速折返越过目标翻了过去。
 *
 * 三幕：
 *   起（crouch，提交前）：压身入水、身侧聚起一道预备的浪，只播预告。
 *   撞（sweep，提交后）：沿朝向冲上去，命中活体结算 ram 接触伤害并把目标朝自己原来的方向推开一点；
 *       miss 就一路游到自己要去的位置。拖迹由每刻实际走过的采样点连成。
 *   翻（return，提交后）：从实际接触点起跳，按 cross/glide 预算走一条有限抛弧落到另一侧；
 *       抛弧顶点受自身体型限制——目标过高或顶棚压顶时会撞住、提前落下，绝不瞬移穿过身体或墙。
 *       深潜式越过目标继续前冲，回身式转身落向等候的伙伴。真正落地后才换手，拖迹仍是实际采样点。
 *
 * 与同族分开：急速折返结束在自己一侧、走一条 U；伏特替换是放电后瞬移；只有快速折返以**越过目标**为身份。
 * 提交前只观察、只 `present`；命中、位移与粒子都在提交后写。
 */
namespace PokemonSkills {
    const flipturnScene = "world_combat:move_flipturn";
    const flipturnTurnText = "world_combat.move.flipturn.text.turn";
    const flipturnMissText = "world_combat.move.flipturn.text.miss";
    const flipturnSwitchText = "world_combat.move.flipturn.text.switch";

    /** 真实换人：有合法后备时收回自己、让后备在越过目标后的落点登场；返回是否真的换手成功。 */
    function flipturnHandoff(world: CombatWorld, actor: CombatActor, point: CombatPoint): boolean {
        const reserve = partyReserve(partyRoster(world, actor), partyActiveId(world, actor));
        if (reserve === null) return false;
        const body = world.observe(actor);
        const feet = body === null ? point : partyFeet(body);
        WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1.1, 0)), flipturnSwitchText, [], 26);
        return partySwitchOut(world, actor, reserve.slot, feet).ok;
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

    define({
        freeMovement: true,
        id: "flipturn",
        cooldownParameter: "recharge",
        name: "Flip Turn",
        description: "撞上目标后翻个身从它身上蹬开、越过它落在另一侧；有后备时直接在落点与待命的一只换手，水里的个体滑得更远。目标太高或顶棚压顶时翻不过去，就在撞点落下。回身式会转身落向等候的伙伴，深潜式继续远遁。",
        uses: ["打一下就翻到目标另一侧，换一条攻击线", "在水里边打边拉开距离", "蹬开追兵的同时把身位让给伙伴"],
        kind: "aim",
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
            const scenes = WorldFeedback.actionScenes(flipturnScene);
            const world = action.world(), actor = action.actor();
            const body = world.observe(actor);
            if (body === null) { scenes.finish(action, done); return; }
            // 贴地切入：只取瞄准方向的水平分量，俯仰角不为负把身体压进地面（原生碰撞会直接判定受阻）。
            const aimed = aim(action);
            const level = WorldCombat.point(aimed.x(), 0, aimed.z());
            const facing = action.direction();
            const heading = level.length() < 0.01
                ? (function (): CombatPoint {
                    const flat = WorldCombat.point(facing.x(), 0, facing.z());
                    return flat.length() < 0.01 ? WorldCombat.point(1, 0, 0) : flat.unit();
                })()
                : level.unit();
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

            function finish(current: CombatAction): void { if (!settled) { settled = true; scenes.finish(current, done); } }
            /** 拖迹顶点贴着身体下缘，水线才会跟着身体一起跨过去。 */
            function sample(point: CombatPoint): number[] { return [point.x(), point.y() - 0.25, point.z()]; }

            const outward: number[][] = [sample(body.position())];
            function trailSweep(current: CombatAction): void {
                const at = current.world().observe(actor);
                if (at === null) return;
                outward.push(sample(at.position()));
                scenes.show(current, "sweep", at.position(),
                    { moment: "sweep", motes: motes, wet: wet ? 1 : 0, scale: scale, intensity: intensity, path: outward.slice() });
            }

            /**
             * 真实抛弧越位：从当前实际位置起跳，沿一条有限二次曲线落到另一侧。
             * 顶点只按自身体型抬高，目标过高就抬不过去——原生碰撞会让身体停住、提前落下，不穿过身体或墙。
             * 空放只在冲刺终点短翻，方向由架势决定，不再额外加一整段 length。
             */
            function crossOver(current: CombatAction, victim: CombatObservation | null): void {
                const scope = current.world(), self = scope.observe(actor);
                if (self === null) { finish(current); return; }
                const start = self.position();
                const arcSpeed = Math.max(0.35, step * 0.55);
                let destination: CombatPoint, relayed = false;
                if (victim !== null) {
                    const landing = victim.position().plus(heading.scale(cross));
                    if (turn) {
                        const ally = flipturnRelay(scope, actor, rally);
                        relayed = ally !== null;
                        destination = ally !== null ? ally.plus(heading.scale(-1.3)) : landing.minus(heading.scale(glide));
                    } else {
                        destination = landing.plus(heading.scale(glide));
                    }
                } else {
                    destination = turn ? start.plus(heading.scale(-cross)) : start.plus(heading.scale(cross));
                }
                destination = WorldCombat.point(destination.x(), start.y(), destination.z());
                const vault = self.height() * 0.9 + 0.6;
                const baseY = Math.max(start.y(), destination.y());
                const required = victim !== null ? victim.boundsMax().y() + self.height() / 2 + 0.25 : baseY + 0.7;
                const apexY = Math.min(required, baseY + vault);
                const control = WorldCombat.point((start.x() + destination.x()) / 2,
                    2 * apexY - (start.y() + destination.y()) / 2, (start.z() + destination.z()) / 2);
                const span = control.minus(start).length() + destination.minus(control).length();
                const total = Math.max(3, Math.ceil(span / arcSpeed));
                const path: number[][] = [sample(start)];

                function land(current: CombatAction): void {
                    scenes.stop(current, "return");
                    const live = current.world(), me = live.observe(actor);
                    if (me === null) { finish(current); return; }
                    for (let drop = 0; drop < 4 && live.displace(actor, WorldCombat.point(0, -0.9, 0)) > 0.01; drop++) { }
                    const at = live.observe(actor);
                    const landed = at !== null ? at.position() : destination;
                    WorldFeedback.emit(live, flipturnScene, 1, landed,
                        { moment: "land", motes: motes, wet: wet ? 1 : 0, scale: scale, intensity: intensity,
                            turn: turn ? 1 : 0, relayed: relayed ? 1 : 0 }, 24);
                    if (turn) WorldFeedback.text(live, landed.plus(WorldCombat.point(0, 1.1, 0)), flipturnTurnText, [], 26);
                    live.sound("minecraft:entity.generic.splash", landed, 12, "{}");
                    // 真正落地完成后才换人；换手成功时原生收回结束本动作，不再手动完成。
                    if (!flipturnHandoff(live, actor, landed)) finish(current);
                }

                function follow(current: CombatAction, index: number): void {
                    const live = current.world(), me = live.observe(actor);
                    if (me === null) { finish(current); return; }
                    const t = index / total, u = 1 - t;
                    const goal = start.scale(u * u).plus(control.scale(2 * u * t)).plus(destination.scale(t * t));
                    const delta = goal.minus(me.position());
                    const moved = LivingActions.step(live, actor, delta.unit().scale(Math.min(arcSpeed, delta.length())), 1);
                    const after = live.observe(actor);
                    if (after !== null) path.push(sample(after.position()));
                    scenes.show(current, "return", start,
                        { moment: "return", motes: motes, wet: wet ? 1 : 0, scale: scale, intensity: intensity,
                            turn: turn ? 1 : 0, relayed: relayed ? 1 : 0, path: path.slice() });
                    const stalled = moved < Math.min(0.04, delta.length() * 0.5);
                    if (index >= total || stalled) { land(current); return; }
                    current.after(1, function (next: CombatAction) { follow(next, index + 1); });
                }

                follow(current, 1);
            }

            function advance(current: CombatAction): void {
                const scope = current.world();
                const delta = heading.scale(Math.min(step, length - travelled));
                const swept = sweepStep(current, delta, radius), traced = swept.hit;
                trailSweep(current);
                if (traced.hitEntity()) {
                    const victim = traced.target();
                    let victimBody: CombatObservation | null = null;
                    let landed = false;
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                        landed = impact(current, traced, "flipturn", power,
                            { damage: damageSpec("flipturn", "ram"), contact: true });
                        if (landed) {
                            victimBody = scope.observe(victim);
                            if (victimBody !== null && shove > 0.02) scope.hitDisplace(victim, heading.scale(shove));
                        }
                    }
                    WorldFeedback.emit(scope, flipturnScene, 1, traced.position(), {
                        moment: "strike", target: victim !== null ? String(victim.ref()) : "",
                        motes: motes, wet: wet ? 1 : 0, scale: scale, intensity: intensity, landed: landed ? 1 : 0
                    }, 24);
                    sound(current, "cobblemon:impact.water");
                    scenes.stop(current, "sweep");
                    crossOver(current, victimBody);
                    return;
                }
                const moved = swept.moved + (traced.hitEntity() && swept.remaining.length() > 0.001 ? scope.displace(actor, swept.remaining) : 0);
                travelled += moved;
                if (traced.blocked() || moved < 0.05 || travelled >= length) {
                    WorldFeedback.emit(scope, flipturnScene, 1, current.origin(), { moment: "miss", motes: motes, wet: wet ? 1 : 0, scale: scale }, 18);
                    WorldFeedback.text(scope, current.origin().plus(WorldCombat.point(0, 1, 0)), flipturnMissText, [], 20);
                    sound(current, "minecraft:entity.player.attack.nodamage");
                    scenes.stop(current, "sweep");
                    crossOver(current, null);
                    return;
                }
                current.after(1, advance);
            }

            scenes.show(action, "sweep", body.position(),
                { moment: "sweep", motes: motes, wet: wet ? 1 : 0, scale: scale, intensity: intensity, path: outward.slice() });
            sound(action, "cobblemon:move.watergun.actor");
            advance(action);
        }
    });
}
