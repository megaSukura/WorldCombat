/** 生长：提升自身双攻，阳光增强提升；绿环和草叶表现身体抽长。 场景核对提交、状态或生命变化；表现由人工体验确认。 */
Smoke.scenario("growth", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Oddish", level: 30, moves: ["growth"], at: [0, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [8, 0, 0] });
    stage.noai(foe); stage.setPp(caster, "growth", 1); stage.provoke(caster, foe);
    const originalScale = stage.attribute(caster, "minecraft:generic.scale");
    stage.until(900, function () {
        return stage.casts("growth", caster) > 0 && stage.hadMobEffect(caster, "world_combat:status/grown");
    }, function () {
        stage.expect(stage.casts("growth", caster) > 0, "growth was committed");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/grown"), "the caster carried the shared grown identity");
        stage.note("growth observations", {
            casts: stage.casts("growth", caster),
            grown: stage.hadMobEffect(caster, "world_combat:status/grown"),
            health: Math.round(caster.health() * 10) / 10,
            hurtBack: Math.round(stage.damageTo(caster) * 10) / 10
        });
        stage.after(18, function () {
            stage.expect(stage.attribute(caster, "minecraft:generic.scale") > originalScale, "native entity scale actually grows");
            stage.command("effect clear " + caster.ref.split("/")[0] + " world_combat:grown");
            stage.after(5, function () {
                stage.expect(Math.abs(stage.attribute(caster, "minecraft:generic.scale") - originalScale) < 0.0001,
                    "clearing the carrier restores only the owned native scale contribution");
                stage.done();
            });
        });
    }, "growth is cast");
});
