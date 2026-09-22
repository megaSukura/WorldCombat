NativeLoadout.map("ragefist", "checks:growth-use", function () { return 1; });
CobblemonCombat.registerAction("checks:growth-use", "fixture", 30, "aim", 8, function (action) {
    NativeLoadout.prepare(action, "ragefist");
    action.after(2, function (ready) { ready.commit(1); ready.finish(); });
});
