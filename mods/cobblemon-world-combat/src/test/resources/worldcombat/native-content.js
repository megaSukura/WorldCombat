// Dedicated-server fixture: register before content completes, then exercise the live native store.
var NativeContentChecks = Java.loadClass("dev.worldcombat.cobblemon.checks.NativeContentServerChecks");
NativeContentChecks.install();
CobblemonCombat.channel("checks:public_values", function (request) {
    var context = IndividualAttributes.request(request);
    var ids = IndividualAttributes.ids();
    ids.forEach(function (id) { if (IndividualAttributes.read(context, id) === undefined) throw Error("Missing public value " + id); });
    request.reply(JSON.stringify({ haste: IndividualAttributes.read(context, "world_combat:skill_haste"), count: ids.length }));
});
WorldCombat.registerAction("checks:independent_action", "1", 10, "self", 0, function (action) {
    action.commit(2);
    var world = action.world();
    if (IndividualAttributes.read(IndividualAttributes.live(world, action.actor()), "world_combat:skill_haste") !== 75) throw Error("Recalled/live attributes differ");
    var status = MobEffects.apply(world, action.actor(), "minecraft:glowing", 20);
    if (!status || !MobEffects.consume(world, action.actor(), "minecraft:glowing") || MobEffects.read(world, action.actor(), "minecraft:glowing")) throw Error("Native effect consume failed");
    if (!CobblemonCombat.compareData(world, action.actor(), "checks:independent_done", null, '{"done":true}')) throw Error("Independent action write failed");
    action.finish();
});
WorldCombat.on("checks:independent_trigger", "world_combat:actor_tick", "", function (event) {
    var actor = event.actor(), world = event.world();
    if (String(actor.domain()) !== "cobblemon" || CobblemonCombat.data(world, actor, "checks:independent_launch") === null) return;
    if (!CobblemonCombat.compareData(world, actor, "checks:independent_launch", '{"launch":true}', null)) return;
    var frame = { actor: String(actor.ref()), tick: world.tick(), facts: {}, services: { world: world }, capabilities: [] };
    WorldAbilities.grant(frame, { id: "checks:independent", action: "checks:independent_action", use: "checks:independent",
        protocols: ["checks:world-use"], range: 0, kind: "self" });
    if (!WorldAbilities.invoke(frame, "checks:independent", { ref: String(actor.ref()), point: [0, 0, 0] })) throw Error("Independent native action failed");
});
ServerEvents.tick(function (event) { NativeContentChecks.tick(event.server); });
