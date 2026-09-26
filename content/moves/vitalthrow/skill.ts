/**
 * 借力摔 / vitalthrow 的出手方式。
 *
 * 核心念头：沉住气等对手先出手，等它扑进来的一刻借它的冲劲把它顺势摔出去——摔得慢，所以在对手之后；
 * 抓住的是近身那一瞬，所以躲不掉；对手不进来就扑空。
 *
 * 两幕：
 *   起（brace，提交前）：站定沉腰、双臂开张，明摆着在等（长起手，可被打断）。
 *   摔（seize → heave → slam）：提交后向前一捞，抓到活体的一刻按它有没有在出手决定借力加成；
 *       结算后把目标沿它自己的冲势甩出去（没在动就朝背离施法者的方向甩），落地压制。
 *   近处没人就扑空。
 *
 * 与同族分开：地球上投是举起后向下砸、按等级结算并钉住；借力摔是**后发的借力一摔**，按施法者分量结算，
 * 把目标沿它自己的冲势甩开，不举不砸。
 */
namespace PokemonSkills {
    const vitalthrowLanding = "world_combat:vitalthrow_landing";
    WorldCombat.effect(vitalthrowLanding, 1, 1200, "actor", json => json, EffectProtocols.unchanged);
    WorldCombat.effectHandler(vitalthrowLanding, "start", effect => {
        const data = JSON.parse(effect.state()), world = effect.world(), target = effect.target(), body = world.observe(target);
        if (body === null) { effect.end(); return; }
        WorldFeedback.onEffect(world, effect.id(), "flight", vitalthrowScene, 1, body.position(),
            { moment: "heave", target: String(target.ref()), intensity: data.intensity, scale: data.scale, direction: data.direction, duration: effect.remaining() });
        effect.schedule("landing", "landing", 1, "{}");
    });
    WorldCombat.effectHandler(vitalthrowLanding, "landing", effect => {
        const world = effect.world(), target = effect.target(), body = world.observe(target), data = JSON.parse(effect.state());
        if (body === null) { effect.end(); return; }
        if (!body.grounded()) { data.airborne = true; effect.state(JSON.stringify(data)); effect.schedule("landing", "landing", 1, "{}"); return; }
        if (!data.airborne) { effect.schedule("landing", "landing", 1, "{}"); return; }
        WorldEffects.apply(world, target, "rooted", {}, data.pin);
        WorldFeedback.emit(world, vitalthrowScene, 1, body.position(),
            { moment: "slam", target: String(target.ref()), intensity: data.intensity, scale: data.scale, pinned: data.pin }, 26);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)), vitalthrowHitText, [Math.round(data.power)], 26);
        world.sound("cobblemon:impact.fighting", body.position(), 15, "{}");
        effect.end();
    });
    const vitalthrowScene = "world_combat:move_vitalthrow";
    const vitalthrowHitText = "world_combat.move.vitalthrow.text.hit";
    const vitalthrowMissText = "world_combat.move.vitalthrow.text.miss";

    define({
        id: "vitalthrow",
        name: "Vital Throw",
        description: "沉腰等待近身对手，再沿它的冲势反手甩开。正在出手的目标承受更重的一摔；成功抛起并在短时间内落地时，才接上落地压制。投掷受目标的抗击退和地形影响。",
        uses: ["后发制人的反手摔", "把扑上来的对手借势甩开", "对高防目标用分量硬摔"],
        kind: "aim",
        range: 3,
        maxRange: 4.4,
        prepare: 18,
        active: 0,
        recover: 10,
        cooldown: 40,
        style: "throw",
        defaults: { bait: false, ai: { maxChase: 6, counter: true, leaveStation: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("vitalthrow", "catchRange", pokemon) + 0.6, geometry: "line", style: "throw", color: 0xD08A4A, label: "借力摔" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["vitalthrow"], detail: { values: config }, world: world, actor: actor, attributes: attributes };
            var bait = !!(config && config.bait);
            return {
                prepare: Math.max(6, Math.round(p("vitalthrow", "braceTicks", context))),
                recover: p("vitalthrow", "recover", context),
                cooldown: p("vitalthrow", "cooldown", context) + (bait ? 6 : 0),
                range: p("vitalthrow", "catchRange", context) + 0.4
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_vitalthrow:brace", vitalthrowScene, 1, action.origin(),
                JSON.stringify({ moment: "brace", windup: prepare, bait: !!(config && config.bait) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const bait = !!(config && config.bait);
            const reach = p("vitalthrow", "catchRange", action);
            const basePower = p("vitalthrow", "throwPower", action);
            const bonus = p("vitalthrow", "momentum", action);
            const fling = p("vitalthrow", "fling", action);
            const pinTicks = Math.max(10, Math.round(p("vitalthrow", "pinTicks", action)));
            const direction = aim(action);
            const self = world.observe(actor);
            const scale = reach / 2.5;
            let settled = false;

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                done(current);
            }

            function miss(current: CombatAction): void {
                if (settled) return;
                const scope = current.world();
                WorldFeedback.emit(scope, vitalthrowScene, 1, current.origin(), { moment: "miss", scale: scale }, 20);
                WorldFeedback.text(scope, current.origin().plus(WorldCombat.point(0, 1.2, 0)), vitalthrowMissText, [], 22);
                finish(current);
            }

            if (self === null) { finish(action); return; }
            const from = self.position();
            const selected = action.target();
            let victim: CombatActor | null = null;
            if (selected !== null && world.valid(selected)) {
                const body = world.observe(selected);
                if (body !== null && body.position().minus(from).length() <= reach + 0.6 && world.clear(from, body.position())) victim = selected;
            }
            if (victim === null) {
                const hit = action.trace(from, from.plus(direction.scale(reach)), scale * 0.55);
                if (hit.hitEntity()) victim = hit.target();
            }

            if (victim === null || !world.valid(victim) || world.friendly(victim)) { miss(action); return; }

            const seen = world.observe(victim);
            // 对手正在出手（扑进来）时借到的冲劲最大；这就是「在对手之后出手」换来的必中与加成。
            const committed = seen !== null && seen.attacking() !== null;
            const power = basePower * (1 + (committed ? bonus : 0));
            const intensity = Math.max(0.6, Math.min(2.4, power / 70));

            const landed = hurt(action, victim, "vitalthrow", power,
                { damage: damageSpec("vitalthrow", "throwPower"), contact: true });
            if (!landed) { WorldFeedback.text(world, from.plus(WorldCombat.point(0, 1.2, 0)), vitalthrowMissText, [], 22); finish(action); return; }
            WorldFeedback.emit(world, vitalthrowScene, 1, seen === null ? from : seen.position(),
                { moment: "seize", target: String(victim.ref()), committed: committed ? 1 : 0,
                  intensity: intensity, scale: scale }, 22);
            sound(action, "minecraft:entity.player.attack.strong");

            const victimRef = String(victim.ref());
            action.after(2, function (heaveAction: CombatAction) {
                const scope = heaveAction.world();
                const thrown = scope.actor(victimRef);
                if (thrown === null || !scope.valid(thrown)) { finish(heaveAction); return; }
                const body = scope.observe(thrown), selfBody = scope.observe(actor);
                if (body === null || selfBody === null || body.position().minus(selfBody.position()).length() > reach + .6
                    || !scope.clear(selfBody.position(), body.position())) { finish(heaveAction); return; }
                const velocity = body.velocity();
                const moving = WorldCombat.point(velocity.x(), 0, velocity.z());
                const away = body.position().minus(selfBody.position());
                const heading = moving.length() > 0.08 ? moving.unit() : (away.length() > 0.05 ? WorldCombat.point(away.x(), 0, away.z()).unit() : direction);
                if (!scope.hitImpulse(thrown, WorldCombat.point(heading.x() * fling, 0.34, heading.z() * fling))) { finish(heaveAction); return; }
                scope.effect(vitalthrowLanding, thrown, JSON.stringify({ intensity: intensity, scale: scale, power: power,
                    pin: pinTicks, direction: [heading.x(), heading.y(), heading.z()] }), 8 + pinTicks);
                scope.sound("minecraft:entity.wind_charge.throw", body.position(), 14, "{}");
                finish(heaveAction);
            });
        }
    });
}
