Smoke.scenario("gearup", function (stage) {
    stage.weather("clear");
    stage.time("day");

    var caster = stage.pokemon({ species: "plusle", level: 34, moves: ["gearup"], ability: "plus", at: [-0.5, 0, 0] });
    var ally = stage.mob({ type: "minecraft:villager", at: [0.5, 0, 0] });
    stage.noai(ally);
    stage.command("item replace entity " + ally.ref.split("/")[0] + " weapon.mainhand with minecraft:iron_sword");
    var foe = stage.mob({ type: "minecraft:zombie", at: [9, 0, 0] });
    stage.team("drive", [caster, ally]);
    stage.hostile(caster, foe);

    stage.until(900, function () {
        return stage.casts("gearup", caster) > 0 && stage.hadMobEffect(caster, "world_combat:status/geared");
    }, function () {
        stage.expect(stage.casts("gearup", caster) > 0, "gearup was cast");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/geared"), "the Plus caster itself was geared");
        stage.expect(stage.hadMobEffect(ally, "world_combat:status/geared"), "the metal-tool holder received geared Attack");
        stage.expect((stage.stages(ally).atk || 0) > 0, "the ordinary body gained the shared Attack stage");
        // 画面里的持续动力绑在传动记录上：动作早已结束、受益人也没换位置，动力仍留着，说明这是一次快照。
        stage.after(40, function () {
            stage.expect(stage.hasMobEffect(ally, "world_combat:status/geared"),
                "the geared snapshot outlived the cast action");
            stage.expect((stage.stages(ally).atk || 0) > 0,
                "the shared Attack stage carried on after the cast action ended");
            stage.note("The ordinary ally qualifies through its held metal tool; its shared Attack stage is visible even when the native mob has no attack attribute. The drive is one cast-time snapshot: it stays on the beneficiary after the caster's action ends.", { stages: stage.stages(ally) });
            stage.done();
        });
    }, "gearup drives both plus/minus allies");
});
