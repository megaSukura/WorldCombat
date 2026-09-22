var NativeRidingChecks = Java.loadClass("dev.worldcombat.cobblemon.checks.NativeRidingChecks");
NativeRidingChecks.install();
ServerEvents.tick(function (event) { NativeRidingChecks.tick(event.server); });
