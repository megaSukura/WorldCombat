/** 接触结算等级伤害，短暂停顿后复核抓取，再按原生受击抗性抛起；落地阶段独立随目标存续。 */
namespace PokemonSkills {
    const seismictossLanding = "world_combat:seismictoss_landing";
    WorldCombat.effect(seismictossLanding, 1, 1200, "actor", json => json, EffectProtocols.unchanged);
    WorldCombat.effectHandler(seismictossLanding, "start", effect => {
        const world = effect.world(), target = effect.target(), body = world.observe(target), data = JSON.parse(effect.state());
        if (body === null) { effect.end(); return; }
        WorldFeedback.onEffect(world, effect.id(), "flight", seismictossScene, 1, body.position(),
            { moment: "hurl", target: String(target.ref()), direction: data.direction, scale: data.scale, duration: effect.remaining() });
        effect.schedule("landing", "landing", 1, "{}");
    });
    WorldCombat.effectHandler(seismictossLanding, "landing", effect => {
        const world = effect.world(), target = effect.target(), body = world.observe(target), data = JSON.parse(effect.state());
        if (body === null) { effect.end(); return; }
        if (!body.grounded()) { data.airborne = true; effect.state(JSON.stringify(data)); effect.schedule("landing", "landing", 1, "{}"); return; }
        if (!data.airborne) { effect.schedule("landing", "landing", 1, "{}"); return; }
        WorldFeedback.emit(world, seismictossScene, 1, body.position(),
            { moment: "slam", target: String(target.ref()), count: Math.round(14 + data.shockwave * 18), scale: data.shockwave / .9 }, 28);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)), seismictossSlamText, [], 24);
        if (data.slam) WorldEffects.apply(world, target, "rooted", {}, data.pin);
        world.sound(data.slam ? "minecraft:item.mace.smash_ground_heavy" : "minecraft:block.anvil.land", body.position(), 15, "{}");
        effect.end();
    });
    const seismictossScene = "world_combat:move_seismictoss";
    const seismictossHoldText = "world_combat.move.seismictoss.text.hold";
    const seismictossSlamText = "world_combat.move.seismictoss.text.slam";
    const seismictossMissText = "world_combat.move.seismictoss.text.miss";

    function seismictossVector(direction: CombatPoint): number[] { return [direction.x(), direction.y(), direction.z()]; }

    define({
        id: "seismictoss",
        name: "Seismic Toss",
        description: "近身抓取造成按等级和体重计算的固定伤害，短暂停顿后把仍在手边的对手抛起。投掷受抗击退和地形影响；砸地式缩短抛物线，只在目标实际落地时接上钉地。",
        uses: ["抓住对手把它甩出去", "把敌人抛离掩体或扔下高台", "用等级伤害处理高防目标"],
        kind: "enemy",
        range: 2.8,
        maxRange: 4.6,
        prepare: 10,
        active: 44,
        recover: 14,
        cooldown: 56,
        style: "throw",
        defaults: { slam: false, ai: { maxChase: 7, finish: true, leaveStation: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("seismictoss", "collisionRadius", pokemon), geometry: "line", style: "throw", color: 0xC98B3A, label: "地球上投" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["seismictoss"], detail: { values: config }, world: world, actor: actor, attributes: attributes };
            return {
                prepare: p("seismictoss", "seize", context),
                recover: p("seismictoss", "recover", context),
                cooldown: p("seismictoss", "cooldown", context),
                range: p("seismictoss", "collisionRadius", context) + 2.2
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_seismictoss:brace", seismictossScene, 1, action.origin(),
                JSON.stringify({ moment: "brace", slam: !!(config && config.slam) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor();
            const slam = !!(config && config.slam);
            const damage = p("seismictoss", "damage", action);
            const radius = p("seismictoss", "collisionRadius", action);
            const holdTicks = Math.max(1, Math.round(p("seismictoss", "holdTicks", action)));
            const hurlXZ = p("seismictoss", "hurlXZ", action);
            const hurlUp = p("seismictoss", "hurlUp", action);
            const slamDelay = Math.max(3, Math.round(p("seismictoss", "slamDelay", action)));
            const shockwave = p("seismictoss", "shockwave", action);
            const pinTicks = Math.max(1, Math.round(p("seismictoss", "pinTicks", action)));
            const body = world.observe(self);
            if (body === null) { done(action); return; }
            const target = action.target();
            const aimPoint = action.targetPosition();
            const reach = Math.min(body.position().minus(aimPoint).length() + 0.5, action.range() + 0.4);
            const direction = aim(action);
            const hit = action.trace(body.position(), body.position().plus(aimPoint.minus(body.position()).unit().scale(Math.max(0.01, reach))), radius + 0.3);
            const victim = hit.hitEntity() ? hit.target() : null;
            const refused = victim === null || world.friendly(victim) || target === null || !world.valid(target);
            let settled = false;

            sound(action, refused ? "minecraft:entity.player.attack.sweep" : "minecraft:entity.iron_golem.attack");
            if (refused) {
                WorldFeedback.emit(world, seismictossScene, 1, aimPoint, { moment: "miss", scale: radius / 0.5 }, 22);
                WorldFeedback.text(world, aimPoint.plus(WorldCombat.point(0, 1.2, 0)), seismictossMissText, [], 22);
                done(action);
                return;
            }

            const victimRef = String(victim!.ref());
            const flat = WorldCombat.point(hit.position().x() - body.position().x(), 0, hit.position().z() - body.position().z());
            const throwDirection = flat.length() < 0.01 ? direction : flat.unit();
            const landed = seismictossRawHit(action, victim!, damage, true);
            if (!landed) { done(action); return; }
            const victimBody = world.observe(victim!);
            const grip = victimBody === null ? hit.position() : victimBody.position();
            WorldFeedback.emit(world, seismictossScene, 1, grip,
                { moment: "seize", target: victimRef, count: Math.round(10 + Math.min(40, damage * 0.6)), scale: radius / 0.5 }, 26);
            WorldFeedback.text(world, grip.plus(WorldCombat.point(0, 1.2, 0)), seismictossHoldText, [Math.round(damage)], 26);

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                done(current);
            }

            function hurl(current: CombatAction): void {
                const scope = current.world();
                const thrown = scope.actor(victimRef);
                const self = scope.observe(current.actor()), facts = thrown === null ? null : scope.observe(thrown);
                if (thrown === null || facts === null || self === null || facts.position().minus(self.position()).length() > reach + radius
                    || !scope.clear(self.position(), facts.position())) { finish(current); return; }
                if (!scope.hitImpulse(thrown, WorldCombat.point(throwDirection.x() * hurlXZ, hurlUp, throwDirection.z() * hurlXZ))) { finish(current); return; }
                scope.effect(seismictossLanding, thrown, JSON.stringify({ direction: seismictossVector(throwDirection), scale: radius / .5,
                    shockwave: shockwave, slam: slam, pin: pinTicks }), slamDelay + pinTicks + holdTicks);
                sound(current, "minecraft:entity.wind_charge.throw");
                finish(current);
            }

            action.after(holdTicks, hurl);
        }
    });
}
