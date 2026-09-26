/** Grab the first actual close contact and turn it along the caster's side when native movement accepts. */
namespace PokemonSkills {
    define({
        freeMovement: true,
        id: stormthrowId,
        cooldownParameter: "recharge",
        name: "Storm Throw",
        description: "抓住身前实际首敌，沿自己侧后方分两步投摔，结算一次必暴主伤。拒绝移动或空间不足时原地抓击，成功摔动才短暂压制。",
        uses: ["点掉贴身的单个目标", "摔翻扑上来的近身威胁并短暂压制", "把贴身敌人转到侧后方留出正面空间"],
        kind: "aim",
        range: 2.6,
        maxRange: 3.8,
        prepare: 10,
        active: 1,
        recover: 9,
        cooldown: 60,
        style: "throw",
        defaults: { pin: false, ai: { maxChase: 6, grapple: true, finish: true } },
        fields: [flag("pin", "锁摔")],
        indicator: function (config, pokemon) {
            return { radius: p(stormthrowId, "reach", pokemon), geometry: "circle", style: "throw", color: 0xC98B3A,
                label: config && config.pin === true ? "山岚摔·锁摔" : "山岚摔·急摔" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[stormthrowId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(stormthrowId, "tempo", context)),
                recover: Math.round(p(stormthrowId, "aftercast", context)),
                cooldown: Math.round(p(stormthrowId, "recharge", context)),
                active: 1,
                range: p(stormthrowId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const body = action.sense().observe(action.actor());
            const scale = body ? (body.width() + body.height()) / 2.3 : 1;
            action.present("stormthrow:crouch", stormthrowScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", windup: prepare, scale: scale, pin: !!(config && config.pin) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const origin = action.origin();
            const self = world.observe(actor), reach = Math.max(1.6, p(stormthrowId, "reach", action));
            if (!self) { done(action); return; }
            const probe = action.trace(origin, origin.plus(aim(action).scale(reach)), .4);
            const grabbed = probe.hitEntity() ? probe.target() : null;
            if (!grabbed || !world.valid(grabbed) || world.friendly(grabbed)) {
                WorldFeedback.emit(world, stormthrowScene, 1, probe.position(), { moment: "miss", scale: 1 }, 16); done(action); return;
            }
            const victim = world.observe(grabbed); if (!victim) { done(action); return; }
            const power = p(stormthrowId, "slam", action), crush = Math.max(.2, p(stormthrowId, "crush", action));
            const staggerTicks = Math.max(12, Math.round(p(stormthrowId, "staggerTicks", action))), dust = Math.max(10, Math.round(p(stormthrowId, "dust", action)));
            const heading = WorldGeometry.flatUnit(aim(action)), side = WorldCombat.point(-heading.z(), 0, heading.x());
            const offset = Math.max(.7, (self.width() + victim.width()) / 2 + .15), travel = Math.min(1.5, crush);
            const waypoints = [origin.plus(side.scale(offset)).plus(heading.scale(.25)), origin.plus(side.scale(offset)).minus(heading.scale(travel))];
            const strands = Math.round(p(stormthrowId, "scar", action)), linger = Math.round(p(stormthrowId, "scarTicks", action));
            let moved = 0, index = 0;
            const path = [[victim.position().x(), victim.position().y(), victim.position().z()]];
            WorldFeedback.emit(world, stormthrowScene, 1, victim.position(), { moment: "grab", target: String(grabbed.ref()), path: [String(actor.ref()), String(grabbed.ref())], dust, scale: 1 }, 12);
            function settle(current: CombatAction): void {
                const scope = current.world(), body = scope.valid(grabbed!) ? scope.observe(grabbed!) : null;
                if (!body) { done(current); return; }
                const landed = hurt(current, grabbed!, stormthrowId, power, { damage: damageSpec(stormthrowId, "slam"), critical: true, contact: true });
                if (landed && moved > .1 && scope.valid(grabbed!)) CombatStatus.apply(scope, grabbed!, "stagger", stormthrowStaggerEffect, staggerTicks, 0, { unique: true });
                WorldFeedback.emit(scope, stormthrowScene, 1, body.position(), { moment: moved > .1 ? "slam" : "press", target: String(grabbed!.ref()), path, dust, strands, linger, cells: 0, scale: 1, intensity: Math.min(2, power / 56) }, linger);
                scope.sound("cobblemon:impact.fighting", body.position(), 14, "{}"); done(current);
            }
            function turn(current: CombatAction): void {
                const scope = current.world(), body = scope.valid(grabbed!) ? scope.observe(grabbed!) : null;
                if (!body || body.position().minus(current.origin()).length() > reach + 1 || !scope.clear(current.origin(), body.position())) { done(current); return; }
                if (index >= waypoints.length) { settle(current); return; }
                const aimAt = waypoints[index++], delta = aimAt.minus(body.position()), horizontal = WorldCombat.point(delta.x(), 0, delta.z());
                const step = horizontal.length() > 1.5 ? horizontal.unit().scale(1.5) : horizontal;
                const accepted = scope.hitDisplace(grabbed!, step);
                if (accepted <= .01) { settle(current); return; }
                moved += accepted;
                const after = scope.observe(grabbed!); if (after) path.push([after.position().x(), after.position().y(), after.position().z()]);
                current.after(2, turn);
            }
            action.after(2, turn);
        }
    });

    // 共享摔翻身份的门禁：带着 stagger 的人在窗口内不能开始新动作；伤害阶段不受影响（仍可被打）。
    CombatStatus.actions.define({ id: "world_combat:stormthrow/stagger-gate", applies: function (context) { return context.phase !== "damage"; }, apply: function (context) {
        if (CombatStatus.has(context.world, context.actor, "stagger")) context.blocked.staggered = true;
    } });
}
