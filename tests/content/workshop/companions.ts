namespace WorkshopCompanions {
    Workshop.prepare = function (action, design) { if (action.actor().domain() === "cobblemon") NativeLoadout.prepare(action, design); };
    Workshop.damage = function (action, target) {
        if (action.actor().domain() === "cobblemon" && target.domain() === "cobblemon") {
            var result = PokemonDamage.resolve(action.world(), action.actor(), target, CobblemonCombat.moveTemplate("thundershock"), { power: 12, contact: false }, action.id());
            if (result.amount > 0) action.world().hurt(target, result.amount, result.metadata);
        } else action.world().hurt(target, 3, '{"type":"electric","bypassCooldown":true}');
    };
    var bindings: { [id: string]: string } = { watergun: "p4:rain_path", thundershock: "p4:current", charge: "p4:link", growl: "p4:echo_cast", withdraw: "p4:insulation" };
    Object.keys(bindings).forEach(function (move) { NativeLoadout.map(move, bindings[move], function () { return 1; }); });
    CobblemonCombat.tactics(function (view) {
        var world = view.world(), memory: any = JSON.parse(view.memory());
        if (!memory.initialized) {
            var prefs = JSON.parse(view.preferences()); view.settings(prefs.tactics || "conservative", typeof prefs.permissions === "number" ? prefs.permissions : 0, prefs.range || 12);
            view.intent("follow", null, null); memory.initialized = true;
        }
        if (CompanionCommands.apply(view, world, memory)) { view.memory(JSON.stringify(memory)); return; }
        if (view.intent() === "roam") { world.controlled(false); return; }
        world.controlled(true); if (world.busy() || view.pending()) return;
        var actor = world.observe(view.actor())!, ownerRef = view.owner(), selected = view.intentTarget();
        var owner = ownerRef === null ? actor : world.observe(ownerRef) || actor;
        if ((view.intent() === "focus" || view.intent() === "protect") && selected === null) { view.intent("follow", null, null); view.report("idle", "target-left"); }
        var ally = view.intent() === "protect" && selected !== null ? world.observe(selected)! : owner;
        var anchor = view.intent() === "hold" ? view.intentPoint() || actor.position() : ally.position();
        var threat = WorldAI.perceive(world, anchor, view.chaseRange(), memory, function (other) {
            if (other.actor().domain() === "cobblemon" && CobblemonCombat.pokemon(other.actor()).id() === view.captureHold()) return -Infinity;
            if (view.intent() === "focus" && selected !== null && selected.key() === other.actor().key()) return 100;
            return other.hostile() || WorldAI.tagged(other, "wc_p4_target") ? 40 : -Infinity;
        });
        if (world.tick() - view.lastManual() >= 15 && view.tactics() === "autonomous") {
            var skills: WorldAI.Skill[] = [];
            for (var i = 0; i < 4; i++) skills.push({ id: view.action(i), kind: view.kind(i), range: view.range(i), ready: !!(view.permissions() & (1 << i)) && view.canUse(i) });
            var best = WorldAI.best({ origin: actor.position(), ally: ally, threat: threat, health: actor.health(), maximum: actor.maxHealth(), conservative: false, skills: skills });
            if (best !== null) view.castInput(best.slot, best.target, best.point, best.direction, Workshop.input([best.point]));
        }
        if (!world.busy()) {
            var goal = view.intent() === "focus" && threat !== null ? threat.position() : anchor;
            var result = WorldAI.navigate(world, goal, view.intent() === "hold" ? 1.2 : 3, memory);
            view.report(result === "moving" ? "approaching" : "idle", result === "moving" || result === "arrived" ? "" : result);
        }
        view.memory(JSON.stringify(memory));
    });
}
