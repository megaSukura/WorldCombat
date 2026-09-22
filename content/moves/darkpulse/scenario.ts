/**
 * 恶之波动 / darkpulse —— 可执行设计说明。
 *
 * 一句话：从胸口逼出一团恶意气场推到选定的一片地，到点炸开成领域，罩住的敌人各挨一记并可能畏缩。
 *
 * 场面：会恶之波动的阿勃梭鲁站在平地一侧；前面两只挨着的小拉达，正好落在同一片领域的覆盖里。
 *
 * 断言只取必然事实：这招被放过、至少有一只小拉达挨到伤害（气场到点炸开、半径足以罩住它们，
 * 但两只会不会同时在圈里仍受它们走位影响，所以不假设两只都中）。暴击与约 20% 的畏缩掷骰、
 * 具体命中几只都写进 note 供读轨迹判断。
 */
Smoke.scenario("darkpulse", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "absol", level: 45, moves: ["darkpulse"], at: [-3, 0, 0] });
    var first = stage.pokemon({ species: "rattata", level: 20, moves: ["tackle"], at: [4, 0, 0] });
    var second = stage.pokemon({ species: "rattata", level: 20, moves: ["tackle"], at: [5, 0, 1] });
    stage.hostile(caster, first);
    stage.hostile(caster, second);
    stage.until(900, function () {
        return stage.casts("darkpulse", caster) >= 1 && (stage.damageTo(first) > 0 || stage.damageTo(second) > 0);
    }, function () {
        stage.expect(stage.casts("darkpulse", caster) >= 1, "absol committed darkpulse");
        stage.expect(stage.damageTo(first) > 0 || stage.damageTo(second) > 0, "the aura burst dealt damage");
        stage.note("crit, the flinch roll (about 20%) and how many foes stood inside the burst radius are random/positional", {
            casts: stage.casts("darkpulse", caster),
            firstDamage: Math.round(stage.damageTo(first) * 10) / 10,
            secondDamage: Math.round(stage.damageTo(second) * 10) / 10,
            firstFlinched: stage.hadMobEffect(first, "world_combat:status/flinch"),
            secondFlinched: stage.hadMobEffect(second, "world_combat:status/flinch"),
            tick: stage.tick()
        });
        stage.done();
    }, "darkpulse lands on a foe within 45 s");
});
