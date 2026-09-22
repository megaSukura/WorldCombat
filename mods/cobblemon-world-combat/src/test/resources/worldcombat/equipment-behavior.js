var equipmentChecks = Java.loadClass("dev.worldcombat.cobblemon.checks.EquipmentBehaviorChecks");
WorldCombat.registerAction("checks:equipment", "fixture", 20, "point", 16, function (action) {
    var world = action.sense(), actor = action.actor();
    var frame = { actor: String(actor.ref()), tick: world.tick(), facts: {}, capabilities: [], services: {}, traits: {} };
    NativeNatures.apply(frame, equipmentChecks.pokemon());
    EquipmentBehavior.apply(world, actor, actor, frame);
    var covered = 0, names = equipmentChecks.natures();
    for (var i = 0; i < names.length; i++) if (NativeNatures.registry.has(String(names[i]))) covered++;
    equipmentChecks.result(JSON.stringify({ radius: BehaviorProfiles.value(frame, "explorationRadius", 5),
        risk: BehaviorProfiles.value(frame, "risk", 0), covered: covered }));
    action.finish();
});
