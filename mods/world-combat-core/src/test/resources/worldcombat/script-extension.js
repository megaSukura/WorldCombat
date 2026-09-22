// Test-only content and harness. Run both variants against the same compiled core.
var extensionRoot = WC_VARIANT === "root";
var extensionTicks = extensionRoot ? 8 : 24;
WorldCombat.effect("checks:pace", 1, 40, "actor", function (json) { return json; }, EffectProtocols.unchanged);
WorldCombat.effectHandler("checks:pace", "start", function (effect) {
    effect.world().attribute(effect.target(), "minecraft:generic.movement_speed", extensionRoot ? -1 : -0.5, "add_multiplied_total");
});
WorldAI.provider("checks:authored_choice", function (facts, slot) {
    if (facts.skills[slot].id !== "checks:authored_action") return null;
    return { slot: slot, score: 100, cost: slot === 0 ? 20 : 0, risk: slot === 1 && extensionRoot ? 80 : 0,
        target: facts.threat.actor(), point: facts.threat.position(), direction: WorldAI.direction(facts.origin, facts.threat.position()) };
});
WorldCombat.registerAction("checks:authored_action", "script-extension", 40, "enemy", 8, function (action) {
    action.commit(10);
    var world = action.world(), source = world.observe(action.actor()), target = world.observe(action.target());
    var choice = WorldAI.best({ origin: source.position(), ally: source, threat: target, health: source.health(), maximum: source.maxHealth(), conservative: false,
        skills: [{ id: "checks:authored_action", kind: "enemy", range: 8, ready: true }, { id: "checks:authored_action", kind: "enemy", range: 8, ready: true }] });
    world.effect("checks:pace", action.actor(), "{}", extensionTicks);
    world.hurt(action.target(), choice.slot === 0 ? 1 : 3, '{"kind":"checks:authored_hit"}');
    action.finish();
});
WorldCombat.preview("checks:authored_action", JSON.stringify({ radius: extensionRoot ? 2 : 5 }));
var extensionAge = 0, extensionDone = false, extensionActor, extensionTarget, extensionSpeed;
ServerEvents.tick(function (event) {
    if (extensionDone) return;
    var Test = Java.loadClass("dev.worldcombat.core.checks.TestWorld");
    var Services = Java.loadClass("dev.worldcombat.core.world.CombatServices");
    var Types = Java.loadClass("net.minecraft.world.entity.EntityType");
    var Attributes = Java.loadClass("net.minecraft.world.entity.ai.attributes.Attributes");
    try {
        var combat = Services.get(event.server);
        if (++extensionAge === 1) {
            var level = Test.prepare(event.server);
            extensionActor = Test.mob(Types.COW, level, 2); extensionTarget = Test.mob(Types.COW, level, 4);
            extensionSpeed = extensionActor.getAttributeValue(Attributes.MOVEMENT_SPEED);
            var Targets = Java.loadClass("dev.worldcombat.core.runtime.ActionTarget");
            var input = Targets.entity(combat.bind(extensionTarget), combat.position(combat.bind(extensionTarget)), WorldCombat.point(1, 0, 0));
            combat.runtime().start("checks:authored_action", combat.bind(extensionActor), input, null, Java.loadClass("java.util.Collections").emptyMap());
            Test.require(extensionActor.getAttributeValue(Attributes.MOVEMENT_SPEED) === extensionSpeed * (extensionRoot ? 0 : 0.5), "Script-only movement rule did not change native attributes");
            Test.require(extensionTarget.getHealth() === (extensionRoot ? 9 : 7), "Script-only AI cost/risk choice did not change the actual hit");
            Test.require(Services.CONTENT.preview("checks:authored_action").radius() === (extensionRoot ? 2 : 5), "Script preview did not reach the host");
        }
        if (extensionAge === extensionTicks) Test.require(combat.runtime().effects().query(combat.bind(extensionActor), "checks:pace").length === 1, "Authored lifetime ended early");
        if (extensionAge === extensionTicks + 2) {
            Test.require(combat.runtime().effects().query(combat.bind(extensionActor), "checks:pace").length === 0, "Authored lifetime did not end");
            Test.require(extensionActor.getAttributeValue(Attributes.MOVEMENT_SPEED) === extensionSpeed, "Effect cleanup did not restore the native attribute");
            Test.require(combat.attributes().count() === 0, "Script-only extension retained a host lease");
            extensionDone = true; console.info("P4CHECK PASS script-only " + WC_VARIANT + ": native attribute, lifetime, AI choice, preview and cleanup");
        }
    } catch (error) { extensionDone = true; console.error("P4CHECK FAIL script-only extension " + error); }
});
