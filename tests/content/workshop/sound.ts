namespace WorkshopSound {
    WorldCombat.effect("p4:echo", 1, 400, "actor", function (json) { return JSON.stringify(JSON.parse(json)); }, EffectProtocols.unchanged);
    WorldCombat.effectHandler("p4:echo", "start", function (effect) {
        var world = effect.world(), data = JSON.parse(effect.state());
        data.ref = world.helper(WorldAI.point(data.point), 6, '{"purpose":"p4_echo"}', effect.remaining()).ref(); effect.state(JSON.stringify(data));
        effect.schedule("call", "call", 1, "{}");
    });
    WorldCombat.effectHandler("p4:echo", "call", function (effect) {
        var world = effect.world(), data = JSON.parse(effect.state()), helper = world.actor(data.ref);
        if (helper === null) { effect.end(); return; }
        var p = world.observe(helper)!.position();
        world.sound("minecraft:block.note_block.chime", p, 16, '{"kind":"p4_echo"}');
        world.present("p4:echo", "p4:echo", 1, p, JSON.stringify({ phase: world.tick() % 20 }));
        effect.schedule("call", "call", 10, "{}");
    });
    WorldCombat.registerAction("p4:echo_cast", "p4.8", 40, "point", 24, function (action) {
        Workshop.prepare(action, "growl"); action.commit(40);
        action.effect("p4:echo", action.actor(), JSON.stringify({ point: WorldAI.coordinates(action.targetPosition()) }), 200); action.finish();
    });
    WorldCombat.preview("p4:echo_cast", '{"radius":1}');
    WorldCombat.effect("p4:listener", 1, 1200000, "actor", function (json) { return JSON.stringify(JSON.parse(json)); }, EffectProtocols.unchanged);
    WorldCombat.effectHandler("p4:listener", "start", function (effect) { effect.schedule("listen", "listen", 1, "{}"); });
    WorldCombat.effectHandler("p4:listener", "listen", function (effect) {
        var world = effect.world(), memory: any = JSON.parse(effect.state()), sounds = world.heard(memory.sound || 0, 16);
        for (var i = 0; i < sounds.length; i++) {
            memory.sound = Math.max(memory.sound || 0, sounds[i].id());
            if (JSON.parse(sounds[i].data()).kind === "p4_echo") { memory.point = WorldAI.coordinates(sounds[i].position()); memory.heard = world.tick(); }
        }
        if (memory.point && world.tick() - memory.heard <= 40) {
            world.controlled(true); WorldAI.navigate(world, WorldAI.point(memory.point), 1.2, memory);
        } else { world.controlled(false); memory.point = undefined; }
        effect.state(JSON.stringify(memory)); effect.remaining(1200000); effect.schedule("listen", "listen", 5, "{}");
    });
    WorldCombat.on("p4:listeners", "world_combat:actor_tick", "", function (event) {
        var world = event.world(), facts = world.observe(event.actor())!;
        if (WorldAI.tagged(facts, "wc_p4_listener") && !world.effects(event.actor(), "p4:listener").length) world.effect("p4:listener", event.actor(), "{}", 1200000);
    });
    WorldAI.provider("p4:current_candidate", function (facts, slot) {
        var skill = facts.skills[slot], threat = facts.threat;
        if (skill.id !== "p4:current" || threat === null || threat.position().minus(facts.origin).length() > skill.range) return null;
        return { slot: slot, score: 60, target: null, point: threat.position(), direction: WorldAI.direction(facts.origin, threat.position()) };
    });
}
