/** A short distraction: the native status owns its Attack contribution and duration. */
namespace PokemonSkills {
    function growlAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1, 0)); }

    define({
        id: growlId,
        cooldownParameter: "recharge",
        name: "叫声",
        description: "叫喊使周围敌人暂时分神，降低攻击。声音能传过掩体；同一目标在分神期间不会被重复削弱。",
        uses: ["被近身围住时叫软一圈敌人", "在敌人扎堆时一次压低几人的出手", "隔着掩体削弱贴身的威胁"],
        kind: "self",
        range: 0,
        maxRange: 0,
        prepare: 6,
        active: 1,
        recover: 5,
        cooldown: 100,
        style: "call",
        defaults: { howl: false },
        fields: [
            flag("howl", "拖长音")
        ],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[growlId], detail: { values: config }, world, actor, attributes };
            return {
                prepare: Math.round(p(growlId, "tempo", context)),
                recover: p(growlId, "recover", context),
                cooldown: Math.round(p(growlId, "recharge", context)),
                active: 1,
                range: 0
            };
        },
        windup: function (action, config, prepare) {
            action.present("growl-windup", growlScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", howl: config && config.howl ? 1 : 0 }));
            return prepare;
        },
        indicator: function (config, pokemon, inspection) {
            const howl = !!(config && config.howl);
            const values = config || {};
            const context: NumberContext = { pokemon: pokemon!, skill: skills[growlId], detail: { values: values },
                world: inspection && inspection.world, actor: inspection && inspection.actor, attributes: inspection && inspection.attributes };
            const radius = pokemon ? Math.max(2.5, Math.min(7, p(growlId, "soundRadius", context))) : (howl ? 5.5 : 3.5);
            return { radius: radius, geometry: "circle", style: "call", color: 0xE8B84A,
                label: howl ? "叫声·拖长音" : "叫声" };
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor();
            const selfBody = world.observe(self);
            const origin = selfBody === null ? action.origin() : selfBody.position();
            const radius = Math.max(2.5, Math.min(7, p(growlId, "soundRadius", action)));
            const drop = Math.max(1, Math.min(2, Math.round(p(growlId, "drop", action))));
            const hush = Math.max(60, Math.round(p(growlId, "hushTicks", action)));
            const notes = Math.max(12, Math.round(p(growlId, "notes", action)));
            sound(action, "minecraft:entity.wolf.growl");
            let hits = 0, softened = 0;
            // 声音不看视线：掩体挡不住这一声叫。只有真的压低攻击才建立这次分神。
            WorldGeometry.select(world, WorldGeometry.ring(origin, 0, radius, { below: 2, above: 3 }), function (actor, facts) {
                if (facts.friendly() || MobEffects.read(world, actor, growlEffect)) return;
                const before = NativeEffects.effectiveStage(world, actor, "atk");
                const carrier = MobEffects.apply(world, actor, growlEffect, hush, 0);
                if (!carrier) return;
                const window = NativeEffects.boostWindow(world, actor, { atk: -drop }, carrier.duration(),
                    "world_combat:move/growl", carrier, null);
                const applied = NativeEffects.effectiveStage(world, actor, "atk") - before;
                if (!window || applied === 0) {
                    if (window) NativeEffects.windowClose(world, window);
                    world.removeMobEffect(actor, carrier.id(), carrier.key()); return;
                }
                WorldFeedback.onEffect(world, window, "growl:" + String(actor.ref()), growlScene, 1,
                    facts.position(), { moment: "linger", target: String(actor.ref()) });
                hits++;
                softened += applied;
                WorldFeedback.emit(world, growlScene, 1, facts.position(),
                    { moment: "hush", target: String(actor.ref()), drop: applied, notes: notes }, 26);
            });
            const perDrop = hits > 0 ? Math.round(softened / hits) : -drop;
            WorldFeedback.emit(world, growlScene, 1, origin,
                { moment: "call", radius: radius, hits: hits, notes: notes, scale: radius / 3.5 }, 34);
            if (hits === 0)
                WorldFeedback.emit(world, growlScene, 1, origin, { moment: "fizzle", scale: radius / 3.5 }, 16);
            WorldFeedback.text(world, growlAbove(origin), hits > 0 ? "world_combat.move.growl.text.call" : "world_combat.move.growl.text.empty",
                hits > 0 ? [hits, perDrop > 0 ? "+" + perDrop : perDrop] : [], 32);
            done(action);
        }
    });

}
