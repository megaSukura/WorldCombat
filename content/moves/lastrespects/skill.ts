/** A managed native ghost flight leaves the caster free after release; its forward contact is the only damage frontier. */
namespace PokemonSkills {
    const lastrespectsFlight = "world_combat:lastrespects_flight";
    WorldCombat.effect(lastrespectsFlight, 1, 1200, "actor", json => json, EffectProtocols.unchanged);
    WorldCombat.effectHandler(lastrespectsFlight, "start", effect => {
        const world = effect.world(), data = JSON.parse(effect.state());
        const start = WorldCombat.point(data.position[0], data.position[1], data.position[2]);
        const direction = WorldCombat.point(data.direction[0], data.direction[1], data.direction[2]);
        const id = WorldEffects.projectile(effect, { origin: start, velocity: direction.scale(data.speed),
            radius: data.width, range: data.reach, lifetime: 100, hit: "hit", complete: "complete",
            appearance: { sprite: "world_combat_core:cobblemon/generic/fire/wisp", scale: data.width, tint: 0x9FE8D0,
                glow: true, pierce: data.trail } });
        WorldFeedback.onEffect(world, effect.id(), "procession", lastrespectsScene, 1, start,
            { moment: "march", projectile: id, ghosts: data.ghosts, fallen: data.fallen, width: data.width,
                direction: data.direction });
    });
    WorldCombat.effectHandler(lastrespectsFlight, "hit", effect => {
        const hit = effect.impact(); if (!hit) return;
        const world = effect.world(), data = JSON.parse(effect.state()), target = hit.target(), point = hit.position();
        if (!hit.hitEntity()) {
            WorldFeedback.emit(world, lastrespectsScene, 1, point, { moment: "miss" }, 16); return;
        }
        if (!target || !world.valid(target)) return;
        const features: PokemonDamage.Features = damageFeatures(lastrespectsId, "mourn");
        features.power = data.power; features.knockback = false;
        const result = PokemonDamage.resolve(world, hit.source() || effect.source(), target, CobblemonCombat.moveTemplate(lastrespectsId), features);
        if (!(result.amount > 0) || !world.projectileHit(hit, result.amount, result.metadata)) return;
        if (world.valid(target)) world.hitDisplace(target, WorldCombat.point(data.direction[0], data.direction[1], data.direction[2]).scale(data.push));
        WorldFeedback.emit(world, lastrespectsScene, 1, point,
            { moment: "strike", point: [point.x(), point.y(), point.z()], ghosts: data.ghosts, fallen: data.fallen }, 24);
        WorldFeedback.text(world, point, lastrespectsStrikeText, [data.fallen, data.ghosts], 26);
        world.sound("minecraft:entity.evoker_fangs.attack", point, 16, "{}");
    });
    WorldCombat.effectHandler(lastrespectsFlight, "complete", effect => effect.end());
    define({
        freeMovement: true,
        id: lastrespectsId,
        cooldownParameter: "recharge",
        name: "Last Respects",
        description: "为倒下的伙伴送行：从地里升起随行的鬼影，一路走向对手落下这一扫。同阵营倒下的伙伴越多，鬼影越多、这一扫越重；随行式扫过一条走廊，送行式聚到一点重打一个。",
        uses: ["伙伴倒下后替他们扫出这一记", "随行时沿路清掉一条走廊", "送行时把一个人重捶出很远"],
        kind: "aim",
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
            const world = action.world(), direction = aim(action), start = action.origin();
            const fallen = lastrespectsCount(world, action.actor());
            world.effect(lastrespectsFlight, action.actor(), JSON.stringify({
                position: [start.x(), start.y(), start.z()], direction: [direction.x(), direction.y(), direction.z()],
                reach: p(lastrespectsId, "reach", action), speed: p(lastrespectsId, "speed", action),
                power: p(lastrespectsId, "mourn", action), width: p(lastrespectsId, "width", action),
                push: p(lastrespectsId, "push", action), ghosts: p(lastrespectsId, "ghosts", action),
                fallen: fallen, trail: config && config.trail === true
            }), 100);
            sound(action, "cobblemon:move.shadowball.actor");
            if (fallen > 0) WorldFeedback.text(world, start, lastrespectsMarchText, [fallen], 24);
            done(action);
        }
    });
}
