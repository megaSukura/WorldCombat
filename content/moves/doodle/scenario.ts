/** Doodle removes known Truant/SlowStart liabilities from eligible allies; an unmodifiable Disguise recipient stays unchanged. */
Smoke.scenario("doodle", function (stage) {
    var caster = stage.pokemon({ species: "Abra", level: 40, ability: "truant", moves: ["doodle"], at: [-2, 0, 0] });
    var ally = stage.pokemon({ species: "Machop", level: 30, ability: "slowstart", moves: [], at: [0, 0, 1] });
    var locked = stage.pokemon({ species: "Mimikyu", level: 30, ability: "disguise", moves: [], at: [0, 0, -1] });
    var target = stage.pokemon({ species: "Growlithe", level: 26, ability: "intimidate", moves: [], at: [3, 0, 0] });
    stage.team("doodle-ally", [caster, ally, locked]);
    stage.hostile(caster, target);
    stage.note("staged: known liability removal for abra(truant) + machop(slowstart); mimikyu(disguise) is unmodifiable; sample growlithe(intimidate)");
    stage.until(1200, function () { return stage.hadMobEffect(ally, "world_combat:doodle_sketch"); }, function () {
        stage.expect(stage.casts("doodle", caster) >= 1, "doodle was committed");
        stage.expect(stage.hadMobEffect(ally, "world_combat:doodle_sketch"), "a modifiable ally was stamped");
        stage.expect(!stage.hadMobEffect(locked, "world_combat:doodle_sketch"), "an unmodifiable ally never received a stamp");
        stage.note("doodle committed; only recipients that can be modified were stamped through NativeModifiers", {
            casts: stage.casts("doodle", caster)
        });
        stage.done();
    }, "doodle stamp");
});
