/** Retired command policy retained for historical integration checks. */
namespace CompanionCommands {
    export function save(view: CombatTactics): void {
        view.preferences(JSON.stringify({ tactics: view.tactics(), permissions: view.permissions(), range: view.chaseRange() }));
    }
    export function apply(view: CombatTactics, world: CombatWorld, memory: WorldAI.Memory): boolean {
        var operation = view.operation(), value = view.value(), actor = view.actor(), origin = world.observe(actor)!.position();
        if (operation === "tick") return false;
        if (operation.indexOf("native_capture_") === 0) {
            var captured = JSON.parse(view.notice()).pokemon;
            if (operation === "native_capture_started") {
                view.capture(captured); memory.ref = ""; memory.point = undefined;
                view.report("idle", "capture-started");
            } else {
                if (operation === "native_capture_complete" && view.captureHold() === captured) view.capture("");
                view.report("idle", operation === "native_capture_complete" ? "capture-complete" : "capture-failed");
            }
        } else if (operation === "intent") {
            var intent = ["follow", "hold", "protect", "focus", "roam"][value];
            if (!intent) view.reject("invalid-target");
            var target = (intent === "focus" || intent === "protect") ? view.commandTarget() : null;
            if (intent === "protect" && target === null) target = view.owner();
            if (intent === "focus" && target === null) view.reject("invalid-target");
            if (target !== null && world.friendly(target) !== (intent === "protect")) view.reject("invalid-target");
            var point = intent === "hold" ? view.commandPoint() : null;
            if (point !== null && point.minus(origin).length() > 32) view.reject("out-of-range");
            if (target !== null && world.observe(target)!.position().minus(origin).length() > 32) view.reject("out-of-range");
            view.intent(intent, target, point); view.blockedUntil(0); memory.ref = ""; memory.point = undefined;
            world.controlled(intent !== "roam"); view.report("idle", "intent-set");
        } else if (operation === "tactics") {
            if (value !== 0 && value !== 1) view.reject("invalid-target");
            view.settings(value === 0 ? "conservative" : "autonomous", value === 0 ? 2 : 15, view.chaseRange());
            save(view); view.report("idle", "tactics-set");
        } else if (operation === "permission") {
            if (value < 0 || value > 3) view.reject("invalid-slot");
            view.settings(view.tactics(), view.permissions() ^ (1 << value), view.chaseRange()); save(view); view.report("idle", "tactics-set");
        } else if (operation === "range") {
            if (value < 6 || value > 24) view.reject("invalid-target");
            view.settings(view.tactics(), view.permissions(), value); save(view); view.report("idle", "tactics-set");
        } else if (operation === "capture") {
            var wild = view.commandTarget();
            if (wild === null || wild.domain() !== "cobblemon" || !CobblemonCombat.pokemon(wild).wild()
                || world.observe(wild)!.position().minus(origin).length() > 32) view.reject("choose-wild");
            view.capture(CobblemonCombat.pokemon(wild!).id()); memory.ref = ""; memory.point = undefined; view.report("idle", "capture-ready");
        } else if (operation === "release-capture") { view.capture(""); view.report("idle", "capture-released"); }
        else view.reject("unsupported-command");
        return true;
    }
}
