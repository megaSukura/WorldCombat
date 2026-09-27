/** 一次牺牲雾爆；命中后的失准由独立爆源与各自 carrier 承载。 */
namespace PokemonSkills {
    const mistyexplosionHaze = "world_combat:mistyexplosion_haze";
    const mistyexplosionDeparture = "world_combat:move/mistyexplosion/departure";
    export function mistyexplosionInMist(world: CombatWorld, actor: CombatActor): boolean {
        return WorldEffects.areas(world, mistyexplosionTerrain).some(area =>
            !area.pending && WorldEffects.covers(world, area, actor) && WorldEffects.groundedContact(world, actor, area));
    }
    WorldBodies.define(mistyexplosionDeparture, {
        maxTicks: 220,
        start: body => { body.schedule("watch", "watch", 1, "{}"); },
        resume: body => { DeferredSacrifice.waiting(body); },
        handlers: { watch: body => { DeferredSacrifice.waiting(body); } },
        end: body => { DeferredSacrifice.forget(body); },
        observedDeath: function (body, death) {
            const state = DeferredSacrifice.confirm(body, death);
            if (!state) return;
            body.remaining(Math.max(state.blind, state.mistTicks) + 35);
            const world = body.world(), centre = MistyexplosionDeparture.point(state.centre);
            const region = WorldGeometry.ring(centre, 0, state.radius, { below: state.band, above: state.band });
            let hits = 0;
            world.sound("minecraft:entity.generic.explode", centre, 24, "{}");
            WorldFeedback.emit(world, mistyexplosionScene, 1, centre, { moment: "bloom",
                radius: state.radius, scale: state.radius / 4.4, count: state.burst,
                gold: state.boosted ? Math.round(state.burst * .6) : 0, intensity: state.intensity }, 38);
            state.targets.forEach((shot: any) => {
                const target = world.actor(shot.ref), facts = target && world.valid(target) ? world.observe(target) : null;
                if (!target || !facts || !MistyexplosionDeparture.inside(region, facts) || !world.clear(centre, facts.position())) return;
                if (!DeferredSacrifice.hurt(body, target, shot.amount, shot.metadata)) return;
                hits++;
                if (world.valid(target)) {
                    const previous = MobEffects.read(world, target, mistyexplosionHaze);
                    const ticks = Math.max(state.blind, previous ? previous.duration() : 0);
                    const carrier = MobEffects.set(world, target, mistyexplosionHaze, ticks, 0);
                    if (carrier) {
                        const window = NativeEffects.boostWindow(world, target, { accuracy: -2 }, ticks,
                            "world_combat:move/mistyexplosion", carrier);
                        if (window > 0) WorldFeedback.onEffect(world, window, "mistyexplosion:aim", mistyexplosionScene, 1,
                            facts.position(), { moment: "haze", target: shot.ref });
                    }
                }
                WorldFeedback.emit(world, mistyexplosionScene, 1, facts.position(),
                    { moment: "hit", target: shot.ref, count: 12, scale: 1 }, 24);
            });
            WorldFeedback.emit(world, mistyexplosionScene, 1, centre, { moment: "mist",
                radius: state.mistRadius, scale: state.mistRadius / 3.6, count: Math.round(30 + state.mistRadius * 8),
                ticks: state.mistTicks }, state.mistTicks);
            WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 1.2, 0)),
                hits > 0 ? mistyexplosionHitText : mistyexplosionMissText, hits > 0 ? [hits] : [], 30);
        }
    });
    define({
        id: mistyexplosionId,
        cooldownParameter: "recharge",
        name: "薄雾炸裂",
        description: "把身体当场放成一片铺开的薄雾：雾环贴地向外炸开，对周围可达的敌人造成一次特殊伤害，并让命中者短期降低两级命中，施法者随之陷入濒死；炸裂后雾只作一小段淡去的视效，不再拖慢任何目标。站在薄雾场地上施放时威力更高。",
        uses: ["被围住时用一次牺牲换取身边敌人的短期失准", "在薄雾上打出更重的一爆", "用雾环替队友清开身边一圈"],
        kind: "self",
        range: 4.4,
        maxRange: 7.2,
        prepare: 14,
        active: 0,
        recover: 0,
        cooldown: 95,
        style: "fairy",
        defaults: { denseMist: false, ai: { maxChase: 6, minFoes: 2, cornered: 0.35 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(mistyexplosionId, "blastRadius", pokemon), geometry: "area", style: "fairy",
                color: 0xF0A8D0, label: config && config.denseMist === true ? "浓雾式" : "薄爆式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[mistyexplosionId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.max(6, Math.round(p(mistyexplosionId, "tempo", context))),
                recover: 0,
                cooldown: Math.max(50, Math.round(p(mistyexplosionId, "recharge", context))),
                active: skills[mistyexplosionId].active,
                range: p(mistyexplosionId, "blastRadius", context)
            };
        },
        windup: function (action, config, prepare) {
            const body = action.sense().observe(action.actor());
            action.present("world_combat:move_mistyexplosion:swell", mistyexplosionScene, 1, action.origin(), JSON.stringify({
                moment: "swell", windup: prepare, radius: p(mistyexplosionId, "blastRadius", action),
                scale: p(mistyexplosionId, "blastRadius", action) / 4.4,
                dense: config && config.denseMist === true ? 1 : 0,
                full: body === null || body.maxHealth() <= 0 ? 1 : body.health() / body.maxHealth()
            }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor(), facts = world.observe(self);
            if (!facts) { done(action); return; }
            const centre = facts.position(), radius = Math.max(3, p(mistyexplosionId, "blastRadius", action));
            const boosted = mistyexplosionInMist(world, self), band = radius * .8;
            const power = p(mistyexplosionId, "bloom", action) * (boosted ? p(mistyexplosionId, "terrainBoost", action) : 1);
            const state = { centre: [centre.x(), centre.y(), centre.z()], radius: radius, band: band, boosted: boosted,
                blind: Math.max(40, Math.min(130, Math.round(p(mistyexplosionId, "blindTicks", action)))),
                mistRadius: p(mistyexplosionId, "mistRadius", action), mistTicks: Math.round(p(mistyexplosionId, "mistTicks", action)),
                burst: Math.round(p(mistyexplosionId, "burst", action)), intensity: Math.max(.7, Math.min(2.6, power / 120)),
                targets: MistyexplosionDeparture.damage(action, mistyexplosionId, "bloom", centre, radius, band,
                    Math.max(1, Math.round(p(mistyexplosionId, "maxTargets", action))), power) };
            if (!DeferredSacrifice.arm(action, centre, mistyexplosionDeparture, state, 175, done, "world_combat:mistyexplosion_cost")) done(action);
        }
    });
}
