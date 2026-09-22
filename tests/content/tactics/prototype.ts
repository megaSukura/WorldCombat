/** Disposable partner and tagged encounter policies. The host only carries facts, commands and native writes. */
namespace CompanionPolicy {
    export var config = { managedLimit: 6, decisionTicks: 5, memoryTicks: 60, manualGrace: 10 };
    export function update(view: CombatTactics): void {
        var world = view.world(), memory: WorldAI.Memory = JSON.parse(view.memory());
        if (!memory.initialized) {
            var saved = JSON.parse(view.preferences()), preset = saved.tactics === "autonomous" ? "autonomous" : "conservative";
            view.settings(preset, typeof saved.permissions === "number" ? Math.max(0, Math.min(15, saved.permissions | 0)) : 2,
                typeof saved.range === "number" ? Math.max(6, Math.min(24, saved.range | 0)) : 12);
            view.intent("follow", null, null); memory.initialized = true;
        }
        if (CompanionCommands.apply(view, world, memory)) { view.memory(JSON.stringify(memory)); return; }
        if (view.memberIndex() >= config.managedLimit || view.intent() === "roam") { world.controlled(false); view.report("idle", ""); return; }
        world.controlled(true);
        if (world.busy()) { memory.busy = true; view.blockedUntil(0); view.memory(JSON.stringify(memory)); return; }
        if (memory.busy) { view.blockedUntil(0); memory.next = 0; memory.busy = false; memory.navigation = undefined; }
        if (view.pending()) return;
        var actor = view.actor(), source = world.observe(actor)!, owner = world.observe(view.owner())!, target = view.intentTarget();
        if ((view.intent() === "focus" || view.intent() === "protect") &&
            (target === null || world.friendly(target) !== (view.intent() === "protect"))) {
            view.intent("follow", null, null); memory.ref = ""; memory.point = undefined; view.report("idle", "target-left");
        }
        var ally = view.intent() === "protect" && target !== null ? world.observe(target)! : owner;
        var anchor = view.intent() === "hold" ? view.intentPoint() || source.position() : ally.position();
        var focused = view.intent() === "focus" ? target : null, autonomous = view.tactics() === "autonomous";
        if (world.tick() >= (memory.next || 0) && world.tick() - view.lastManual() >= config.manualGrace) {
            memory.next = world.tick() + config.decisionTicks;
            var threat = WorldAI.perceive(world, anchor, view.chaseRange(), memory, function (other) {
                if (other.actor().domain() === "cobblemon") {
                    var pokemon = CobblemonCombat.pokemon(other.actor());
                    if (pokemon.id() === view.captureHold()) return -Infinity;
                    if (focused !== null && focused.key() === other.actor().key()) return 100;
                    if (autonomous && pokemon.wild()) return 10;
                }
                if (focused !== null && focused.key() === other.actor().key()) return 100;
                if (ally.lastAttacker() !== null && ally.hurtAgo() <= 100 && ally.lastAttacker()!.key() === other.actor().key()) return 60;
                if (other.attacking() !== null && other.attacking()!.key() === ally.actor().key()) return 50;
                if (other.hostile() || WorldAI.tagged(other, "wc_p2_enemy")) return 20;
                return -Infinity;
            });
            var skills: WorldAI.Skill[] = [];
            for (var i = 0; i < 4; i++) skills.push({ id: view.action(i), kind: view.kind(i), range: view.range(i),
                ready: (view.permissions() & (1 << i)) !== 0 && view.canUse(i) });
            var best = WorldAI.best({ origin: source.position(), ally: ally, threat: threat, health: source.health(), maximum: source.maxHealth(), conservative: !autonomous, skills: skills });
            if (best !== null) {
                if (best.target !== null) view.castAt(best.slot, best.target); else view.castPoint(best.slot, best.point, best.direction);
            }
        }
        if (!world.busy() && world.tick() >= view.blockedUntil()) {
            var engaging = autonomous && view.intent() !== "hold" && view.permissions() !== 0 && memory.point
                && world.tick() - (memory.seen || 0) <= config.memoryTicks;
            var goal = engaging ? WorldAI.point(memory.point!) : anchor;
            var within = engaging ? 2.5 : view.intent() === "hold" ? 1.2 : 3;
            if (engaging) {
                for (var slot = 0; slot < 4; slot++) if ((view.permissions() & (1 << slot)) !== 0 &&
                    (view.kind(slot) === "aim" || view.kind(slot) === "enemy")) within = Math.max(within, view.range(slot) * 0.8);
                within = Math.min(within, 10);
            }
            var result = WorldAI.navigate(world, goal, within, memory);
            view.report(result === "moving" ? "approaching" : result === "arrived" ? "idle" : "blocked",
                world.tick() - view.lastManual() >= config.manualGrace && result !== "moving" && result !== "arrived" ? result : "");
            if (result !== "moving" && result !== "arrived") view.blockedUntil(world.tick() + 20);
        }
        view.memory(JSON.stringify(memory));
    }
    function offer(facts: WorldAI.Situation, slot: number): WorldAI.Candidate | null {
        var skill = facts.skills[slot], threat = facts.threat;
        if (skill.kind === "friend" && (facts.ally.health() < facts.ally.maxHealth() * 0.85 || facts.health < facts.maximum * 0.6 || facts.conservative && threat !== null))
            return { slot: slot, score: 70, target: facts.ally.actor(), point: facts.ally.position(), direction: WorldAI.direction(facts.origin, facts.ally.position()) };
        if (threat === null) return null;
        var distance = threat.position().minus(facts.origin).length(), direction = WorldAI.direction(facts.origin, threat.position());
        if ((skill.kind === "aim" || skill.kind === "enemy") && distance <= skill.range)
            return { slot: slot, score: 50, target: threat.actor(), point: threat.position(), direction: direction };
        if (skill.kind === "motion" && distance > 10)
            return { slot: slot, score: 20, target: null, point: facts.origin.plus(direction.scale(Math.min(5, skill.range))), direction: direction };
        return null;
    }
    export function install(): void {
        WorldAI.provider("world_combat:prototype_skills", offer);
        CobblemonCombat.tactics(update);
        WorldCombat.effect("world_combat:encounter_brain", 1, 1200000, "actor", function (data) { return JSON.stringify(JSON.parse(data)); }, EffectProtocols.unchanged);
        WorldCombat.effectHandler("world_combat:encounter_brain", "start", function (effect) { effect.schedule("decide", "decide", 5, "{}"); });
        WorldCombat.effectHandler("world_combat:encounter_brain", "decide", function (effect) {
            var world = effect.world(), actor = effect.source(), memory: WorldAI.Memory = JSON.parse(effect.state()), source = world.observe(actor)!;
            if (actor.domain() !== "cobblemon" || !CobblemonCombat.pokemon(actor).wild()) { effect.end(); return; }
            world.controlled(true);
            if (!world.busy()) {
                var home = memory.home ? WorldAI.point(memory.home) : source.position(); memory.home = WorldAI.coordinates(home);
                var threat = WorldAI.perceive(world, home, 18, memory, function (other) {
                    return other.player() || other.actor().domain() === "cobblemon" && !CobblemonCombat.pokemon(other.actor()).wild() ? 10 : -Infinity;
                });
                var bindings: CombatWorldSkill[] = [], skills: WorldAI.Skill[] = [];
                for (var i = 0; i < 4; i++) { var skill = CobblemonCombat.skill(world, i); bindings.push(skill); skills.push({ id: skill.id(), kind: skill.kind(), range: skill.range(), ready: i < 2 && skill.ready() }); }
                var best = WorldAI.best({ origin: source.position(), ally: source, threat: threat, health: source.health(), maximum: source.maxHealth(), conservative: false, skills: skills });
                if (best !== null) bindings[best.slot].cast(best.target, best.point, best.direction);
                if (!world.busy()) WorldAI.navigate(world, threat !== null ? threat.position() : memory.point ? WorldAI.point(memory.point) : home, threat !== null ? 3 : 1.2, memory);
            }
            effect.state(JSON.stringify(memory)); effect.remaining(1200000); effect.schedule("decide", "decide", 5, "{}");
        });
        WorldCombat.effectHandler("world_combat:encounter_brain", "end", function (effect) { effect.world().controlled(false); });
        WorldCombat.on("world_combat:encounter_registration", "world_combat:actor_tick", "", function (event) {
            if (event.actor().domain() !== "cobblemon" || !CobblemonCombat.pokemon(event.actor()).wild()) return;
            var world = event.world(), facts = world.observe(event.actor())!;
            if (!WorldAI.tagged(facts, "wc_p2_enemy") || world.effects(event.actor(), "world_combat:encounter_brain").length) return;
            world.effect("world_combat:encounter_brain", event.actor(), "{}", 1200000);
        });
    }
}
if (typeof CobblemonCombat !== "undefined") CompanionPolicy.install();
