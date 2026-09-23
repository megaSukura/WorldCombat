Smoke.scenario("bestow", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 8], "minecraft:stone");
    var caster = stage.pokemon({ species: "Clefairy", level: 30, moves: ["bestow"], item: "cobblemon:oran_berry", at: [-2, 0, 0] });
    var ally = stage.mob({ type: "minecraft:villager", at: [1, 0, 0] });
    stage.noai(ally);
    stage.team("gift", [caster, ally]);
    stage.until(900, function () {
        return stage.casts("bestow", caster) > 0 && stage.heldItem(ally) === "cobblemon:oran_berry";
    }, function () {
        stage.expect(stage.casts("bestow", caster) > 0, "传递礼物被放出来了");
        stage.expect(stage.heldItem(ally) === "cobblemon:oran_berry", "the ordinary ally holds the actual gift");
        stage.expect(stage.heldItem(caster) === "", "the source no longer holds the transferred item");
        stage.note("The ordinary recipient received the native item through the shared equipment transaction.");
        stage.done();
    }, "传递礼物被送出");
});
