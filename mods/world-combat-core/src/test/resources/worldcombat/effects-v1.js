WorldCombat.effect("examples:memory", 1, 12000, "persistent", function (json) {
    var value = JSON.parse(json);
    if (typeof value.count !== "number" || value.count < 0) throw new Error("Invalid prior state");
    return JSON.stringify(value);
}, function () { throw new Error("Unexpected old schema migration"); });
WorldCombat.effectHandler("examples:memory", "start", function (effect) {
    effect.schedule("pulse", "pulse", 5, "{}");
    effect.listen("world_combat:impact", "world_combat:after", "observed");
});
WorldCombat.effectHandler("examples:memory", "pulse", function (effect) {
    var value = JSON.parse(effect.state()); value.count++;
    effect.state(JSON.stringify(value)); effect.schedule("pulse", "pulse", 5, "{}");
});
WorldCombat.effectHandler("examples:memory", "observed", function () {});
WorldCombat.registerAction("checks:remember_v1", "v1", 20, "friend", 4, function (action) {
    action.commit(10); action.effect("examples:memory", action.actor(), '{"count":7}', 12000); action.finish();
});
