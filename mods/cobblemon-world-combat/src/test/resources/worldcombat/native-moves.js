NativeLoadout.map("scratch", "checks:double-pp", function () { return 2; });
CobblemonCombat.registerAction("checks:double-pp", "fixture", 40, "aim", 24, function (action) {
    NativeLoadout.prepare(action, "scratch");
    action.after(3, function (ready) { ready.commit(20); ready.finish(); });
});
CobblemonCombat.registerAction("checks:rollback", "fixture", 40, "aim", 24, function (action) {
    NativeLoadout.prepare(action, "scratch");
    action.cost(Java.loadClass("dev.worldcombat.cobblemon.checks.NativeMovesChecks").failingCost());
    action.commit(100);
});
CobblemonCombat.registerAction("checks:slow-cost", "fixture", 120, "aim", 24, function (action) {
    NativeLoadout.prepare(action, "scratch");
    Java.loadClass("dev.worldcombat.cobblemon.checks.NativeMovesChecks").retain(action);
    action.after(100, function (ready) { ready.commit(20); ready.finish(); });
});
CobblemonCombat.register("checks:committed-hold", "fixture", 30, function (action) {
    action.commit(1);
    action.after(7, function (ready) { ready.finish(); });
});
