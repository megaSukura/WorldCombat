var NativeRidingChecks = Java.loadClass("dev.worldcombat.cobblemon.checks.NativeRidingChecks");
NativeRidingChecks.install();
WorldCombat.on("checks:item-use", "world_combat:item_use", "", function (event) {
    if (JSON.parse(String(event.data())).item === "minecraft:honey_bottle") event.reject("checks:item-sealed");
});
ServerEvents.tick(function (event) { NativeRidingChecks.tick(event.server); });
