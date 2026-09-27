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
        var last = stage.attribute(caster, "minecraft:generic.scale"), monotonic = true;
        var samples = [Math.round(last * 1000) / 1000];
        function probe(left: number) {
            if (left <= 0) {
                stage.expect(monotonic, "the grown body never shrinks while the window is active");
                stage.expect(stage.attribute(caster, "minecraft:generic.scale") > originalScale, "native entity scale actually grows");
                stage.note("growth samples", { samples: samples, stages: stage.stages(caster),
                    health: Math.round(caster.health() * 10) / 10, hurtBack: Math.round(stage.damageTo(caster) * 10) / 10 });
                stage.expect((stage.stages(caster).atk || 0) > 0 && (stage.stages(caster).spa || 0) > 0, "grown carrier owns both attack increases");
                stage.boost(caster, { atk: 1, spa: 1 });
                stage.command("effect clear " + caster.ref.split("/")[0] + " world_combat:grown");
                stage.after(5, function () {
                    stage.expect(Math.abs(stage.attribute(caster, "minecraft:generic.scale") - originalScale) < 0.0001,
                        "clearing the carrier restores only the owned native scale contribution");
                    stage.expect((stage.stages(caster).atk || 0) === 1 && (stage.stages(caster).spa || 0) === 1, "cleansing grown ends both increases and preserves unrelated +1 stages");
                    stage.done();
                });
                return;
            }
            stage.after(4, function () {
                const now = stage.attribute(caster, "minecraft:generic.scale");
                if (now < last - 0.0001) monotonic = false;
                last = now; samples.push(Math.round(now * 1000) / 1000);
                probe(left - 1);
            });
        }
        probe(4);
    }, "growth is cast");
});
