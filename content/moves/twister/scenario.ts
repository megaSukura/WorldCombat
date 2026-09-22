/**
 * 龙卷风 / twister —— 可执行设计说明。
 *
 * 一句话：在选定地点立起一道持续旋涡，圈内的敌人被向心拽、抬离地面，并每隔一小段挨一记风刃。
 *
 * 场面：会龙卷风的哈克龙带这一招，站在两只挤在一起的小敌前；小敌用撞击还手，逼近旋涡。
 *
 * 断言只取必然事实：这招被放过、至少有一只小敌挨到风刃伤害。畏缩是否触发（约 18% 的随机掷）、
 * 牵引与抬升把人移动了多少，都写进 note 供读轨迹判断。
 */
Smoke.scenario("twister", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "dragonair", level: 36, moves: ["twister"], at: [-4, 0, 0] });
    var first = stage.pokemon({ species: "rattata", level: 16, moves: ["tackle"], at: [3, 0, 0] });
    var second = stage.pokemon({ species: "rattata", level: 16, moves: ["tackle"], at: [4, 0, 1] });
    stage.hostile(caster, first);
    stage.hostile(caster, second);
    var castTick = 0;
    stage.until(1000, function () {
        if (castTick === 0 && stage.casts("twister", caster) >= 1) castTick = stage.tick();
        return castTick > 0 && stage.tick() >= castTick + 80 && (stage.damageTo(first) > 0 || stage.damageTo(second) > 0);
    }, function () {
        stage.expect(stage.casts("twister", caster) >= 1, "dragonair committed twister");
        stage.expect(stage.damageTo(first) > 0 || stage.damageTo(second) > 0, "the vortex dealt damage");
        stage.note("crit, the flinch roll and how far the pull dragged each foe are random and positional", {
            casts: stage.casts("twister", caster),
            firstDamage: Math.round(stage.damageTo(first) * 10) / 10,
            secondDamage: Math.round(stage.damageTo(second) * 10) / 10,
            anyFlinched: stage.hadMobEffect(first, "world_combat:status/flinch") || stage.hadMobEffect(second, "world_combat:status/flinch"),
            firstTravelled: Math.round(stage.travelled(first) * 10) / 10,
            secondTravelled: Math.round(stage.travelled(second) * 10) / 10,
            firstAlive: first.alive()
        });
        stage.done();
    }, "twister cuts a foe within 50 s");
});
