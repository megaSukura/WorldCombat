/** 牺牲确认后的单颗愿星，只由本次已认定友军中的实际受益者消费。 */
namespace PokemonSkills {
    function healingwishAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.0, 0)); }


    function healingwishNeeds(world: CombatWorld, actor: CombatActor, facts: CombatObservation): boolean {
        if (facts.health() < facts.maxHealth() - 0.01) return true;
        return CombatStatus.hasHarmful(world, actor);
    }


    function healingwishReceivers(world: CombatWorld, point: CombatPoint, radius: number, owner: string): CombatActor[] {
        var near = world.query(point, radius, false), found: CombatActor[] = [];
        for (var index = 0; index < near.length; index++) {
            var other = near[index];
            if (String(other.ref()) === owner || !world.friendly(other)) continue;
            var facts = world.observe(other);
            if (facts === null || facts.health() <= 0) continue;
            if (!healingwishNeeds(world, other, facts) || !world.clear(point.plus(WorldCombat.point(0, .8, 0)), facts.position())) continue;
            found.push(other);
        }
        return found;
    }


    function healingwishAllySet(world: CombatWorld, owner: CombatActor, point: CombatPoint): { [ref: string]: boolean } {
        var set: { [ref: string]: boolean } = Object.create(null), near = world.query(point, 16, false);
        for (var index = 0; index < near.length; index++) {
            var other = near[index];
            if (String(other.ref()) === String(owner.ref())) continue;
            if (world.friendly(other)) set[String(other.ref())] = true;
        }
        return set;
    }


    function healingwishCleanse(world: CombatWorld, actor: CombatActor): number {
        return CombatStatus.cureHarmful(world, actor);
    }


    function healingwishHeal(world: CombatWorld, target: CombatActor, amount: number, cause: string): number {
        var body = world.observe(target);
        if (body === null) return 0;
        var missing = body.maxHealth() - body.health();
        if (missing <= 0 || amount <= 0) return 0;
        var healed = 0;
        if (String(target.domain()) === "cobblemon" && world.valid(target)) {
            var pokemon = CobblemonCombat.pokemon(target), scale = Math.max(0.001, pokemon.healthScale());
            healed = NativeEffects.heal(world, target, pokemon, Math.min(missing, amount) / scale, cause) * scale;
        } else {
            healed = world.health(target, Math.min(missing, amount), "world_combat:" + cause);
        }
        var after = world.observe(target);
        if (healed > 0 && after) feedback(world, target, after.position(), "heal", { amount: Math.round(healed * 10) / 10 });
        return healed;
    }


    function healingwishAwait(brain: CombatEffect): void {
        var world = brain.world(), state = JSON.parse(brain.state());
        var centre = WorldCombat.point(state.ground[0], state.ground[1], state.ground[2]);
        var scale = Math.max(0.6, Math.min(2.0, state.radius / healingwishReferenceRadius));
        var data = { moment: "wait", radius: state.radius, motes: state.motes, scale: scale, owner: state.owner };

        if (!WorldFeedback.onEffect(world, brain.id(), "healingwish:wait", healingwishScene, 1, centre, data))
            WorldFeedback.keep(world, "healingwish:wait:" + String(brain.target().ref()), healingwishScene, 1, centre, data, 16);
    }


    function healingwishPulse(brain: CombatEffect): void {
        if (DeferredSacrifice.waiting(brain)) return;
        var world = brain.world(), at = world.observe(brain.target());
        if (at === null) { brain.end(); return; }
        var state = JSON.parse(brain.state());
        var centre = WorldCombat.point(state.ground[0], state.ground[1], state.ground[2]);
        var scale = Math.max(0.6, Math.min(2.0, state.radius / healingwishReferenceRadius));
        healingwishAwait(brain);
        var near = world.query(centre, state.radius, false);
        for (var index = 0; index < near.length; index++) {
            var other = near[index];
            var ref = String(other.ref());
            if (ref === String(brain.target().ref()) || ref === String(state.owner)) continue;
            var allied = !!(state.allies && state.allies[ref]);

            if (!allied) continue;
            var facts = world.observe(other);
            if (facts === null || facts.health() <= 0 || !healingwishNeeds(world, other, facts)
                || !world.clear(centre.plus(WorldCombat.point(0, .8, 0)), facts.position())) continue;
            var healed = healingwishHeal(world, other, facts.maxHealth() * state.fraction, "healingwish");
            var removed = world.valid(other) ? healingwishCleanse(world, other) : 0;
            if (!(healed > 0) && removed <= 0) continue;
            world.sound("minecraft:entity.player.levelup", facts.position(), 16, "{}");

            WorldFeedback.emit(world, healingwishScene, 1, facts.position(),
                { moment: "deliver", target: String(other.ref()),
                    path: [[at.position().x(), at.position().y(), at.position().z()], [facts.position().x(), facts.position().y(), facts.position().z()]],
                    motes: state.motes, radius: state.radius, scale: scale,
                    healed: Math.round(healed * 10) / 10, removed: removed,
                    intensity: Math.max(0.7, Math.min(2.0, 0.6 + state.fraction)) }, 40);
            WorldFeedback.text(world, healingwishAbove(facts.position()), healingwishDeliverText,
                [Math.round(healed * 10) / 10, removed], 34);
            state.delivered = true; brain.state(JSON.stringify(state));
            brain.end();
            return;
        }
        brain.schedule("watch", "watch", 4, "{}");
    }

    WorldBodies.define(healingwishWishBrain, {
        schema: 2, maxTicks: 600, migrate: (_version, json) => json,
        start: brain => { brain.schedule("watch", "watch", 1, "{}"); },
        resume: healingwishPulse,
        handlers: { watch: healingwishPulse },
        observedDeath: function (brain, death) {
            const state = DeferredSacrifice.confirm(brain, death);
            if (!state) return;
            brain.remaining(state.wait);
            const world = brain.world(), ground = HealingwishDeparture.point(state.ground);
            world.configure(brain.target(), JSON.stringify({ size: [.6, .9], glow: true,
                appearance: { sprite: "cobblemon:moves/wish_star", scale: 1, tint: 0xFFD36A, glow: true } }));
            WorldFeedback.emit(world, healingwishScene, 1, ground, { moment: "offer", motes: state.motes,
                radius: state.radius, scale: state.radius / healingwishReferenceRadius }, 34);
            WorldFeedback.text(world, healingwishAbove(ground), healingwishOfferText, [Math.round(state.wait / 20)], 34);
            healingwishAwait(brain);
        },
        end: function (brain) {
            DeferredSacrifice.forget(brain);
            const state = JSON.parse(brain.state());
            if (!state.active || state.delivered) return;
            WorldFeedback.emit(brain.world(), healingwishScene, 1, HealingwishDeparture.point(state.ground),
                { moment: "fade", motes: state.motes, radius: state.radius, scale: state.radius / healingwishReferenceRadius }, 24);
        }
    });

    define({
        id: healingwishId,
        cooldownParameter: "recharge", name: "治愈之愿",
        description: "把自己整个交出去：当场倒下，在倒下的地方留下一颗愿星。愿望会等一段时间，施放时附近已认定的伙伴中，第一个来到愿星身边、受伤或带有害状态效果者按其最大生命的比例回复并清除全部有害状态效果；无人需要时愿望自行散去。附近没有可接收的伙伴时，许愿者不会倒下。",
        uses: ["残血时把命换成伙伴的一次大幅回复", "在必死前为缠斗中的伙伴留一颗愿望", "把倒下的地方变成一处救援点"],
        kind: "self", range: 0, prepare: 14, active: 1, recover: 0, cooldown: 320, style: "wish", maximumTicks: 300,
        defaults: { broadcast: false },
        fields: [flag("broadcast", "广愿")],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[healingwishId], detail: { values: config } };
            return { radius: p(healingwishId, "wishReach", context), geometry: "circle", style: "wish", color: 0xFFD36A,
                label: config && config.broadcast === true ? "治愈之愿 · 广愿" : "治愈之愿 · 专愿" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[healingwishId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(healingwishId, "tempo", context)),
                recover: Math.round(p(healingwishId, "aftercast", context)),
                cooldown: Math.round(p(healingwishId, "recharge", context)),
                active: 1, range: 0
            };
        },
        ready: function (action, _config) {
            const world = action.sense(), self = action.actor(), body = world.observe(self);
            if (body === null) return "invalid-target";
            const radius = Math.max(1.5, p(healingwishId, "wishReach", action));
            const ground = SurfacePaths.support(world, body.position().minus(WorldCombat.point(0, body.height() / 2, 0)), .5, 3);
            if (!ground) return "no-ground";
            return healingwishReceivers(world, ground, radius, String(self.ref())).length > 0 ? "" : "no-one-to-receive";
        },
        windup: function (action, config, prepare) {
            const world = action.sense(), self = action.actor(), body = world.observe(self);
            const motes = Math.max(12, Math.round(p(healingwishId, "motes", action)));
            action.present("healingwish:windup", healingwishScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", target: String(self.ref()), motes: motes,
                    broadcast: config && config.broadcast === true ? 1 : 0 }));
            if (body !== null) {

                const feet = SurfacePaths.support(world, body.position().minus(WorldCombat.point(0, body.height() / 2, 0)), .5, 3);
                if (!feet) return prepare;
                const radius = Math.max(1.5, p(healingwishId, "wishReach", action));
                const scale = Math.max(0.6, Math.min(2.0, radius / healingwishReferenceRadius));
                action.present("healingwish:ground", healingwishScene, 1, feet,
                    JSON.stringify({ moment: "ground", radius: radius, motes: motes, scale: scale }));
                const receivers = healingwishReceivers(world, feet, radius, String(self.ref()));
                for (let index = 0; index < receivers.length; index++) {
                    const facts = world.observe(receivers[index]);
                    if (facts === null) continue;
                    action.present("healingwish:receiver:" + String(receivers[index].ref()), healingwishScene, 1, facts.position(),
                        JSON.stringify({ moment: "receiver", target: String(receivers[index].ref()), motes: motes, scale: scale }));
                }
            }
            return prepare;
        },
        execute: function (action, _move, _config, done) {
            const world = action.world(), self = action.actor(), body = world.observe(self);
            if (!body) { done(action); return; }
            const feet = SurfacePaths.support(world, body.position().minus(WorldCombat.point(0, body.height() / 2, 0)), .5, 3);
            const radius = Math.max(1.5, p(healingwishId, "wishReach", action));
            if (!feet || healingwishReceivers(world, feet, radius, String(self.ref())).length === 0) { done(action); return; }
            const wait = Math.max(60, Math.round(p(healingwishId, "wishWait", action)));
            const state = { owner: String(self.ref()), ground: [feet.x(), feet.y(), feet.z()], radius: radius,
                fraction: Math.max(0, Math.min(1, p(healingwishId, "wishHeal", action))), wait: wait,
                motes: Math.max(12, Math.round(p(healingwishId, "motes", action))),
                allies: healingwishAllySet(world, self, feet), delivered: false };
            if (!DeferredSacrifice.arm(action, feet.plus(WorldCombat.point(0, .6, 0)),
                healingwishWishBrain, state, wait, done, "world_combat:healingwish_cost")) done(action);
        }
    });
}
