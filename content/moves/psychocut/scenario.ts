/**
 * 精神利刃 / psychocut —— 可执行设计说明。
 *
 * 一句话：把实体化的心之刃掷出去，刃拐着弯追向单个目标，命中只切中被这一刃触到的那一个对手，并沿实际入射方向留一道短痕。
 *
 * 场面：一只只会精神利刃的胡地（45 级）对一只被点住、不会还手的铁傀儡，旁边再放一个不会还手的近旁生物。
 * 断言只取必然事实：这招被提交过、有对手受过伤害，且这一次命中只落在其中一具身体上（没有旧版的十字旁伤）。
 * 暴击、具体命中谁、以及短痕的朝向都带随机与时序，写进 note。
 */
Smoke.scenario("psychocut", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "alakazam", level: 45, moves: ["psychocut"], at: [-5, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [3, 0, 0] });
    var bystander = stage.mob({ type: "minecraft:zombie", at: [3, 0, -1.3] });
    stage.hostile(caster, foe);
    stage.noai(foe, bystander);
    stage.until(600, function () {
        return stage.casts("psychocut", caster) >= 1 && (stage.damageTo(foe) > 0 || stage.damageTo(bystander) > 0);
    }, function () {
        stage.expect(stage.casts("psychocut", caster) >= 1, "caster committed psycho cut");
        stage.expect(stage.damageTo(foe) > 0 || stage.damageTo(bystander) > 0, "psycho cut dealt damage");
        stage.expect(stage.damageTo(foe) <= 0 || stage.damageTo(bystander) <= 0,
            "the single blade wounded only the one body it reached; a nearby bystander took no extra cut");
        stage.note("critical hits come from the native critRatio 2 roll; the blade steers toward one moving target and the cut is drawn along its actual incoming direction, so this stage expects only one of the two bodies to be hurt by the landing blade", {
            casts: stage.casts("psychocut", caster),
            foeDamage: Math.round(stage.damageTo(foe) * 10) / 10,
            bystanderDamage: Math.round(stage.damageTo(bystander) * 10) / 10,
            foeAlive: foe.alive()
        });
        stage.done();
    }, "psycho cut lands within 30 s");
});
