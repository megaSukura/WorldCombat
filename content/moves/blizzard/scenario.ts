// 暴风雪的可执行设计说明：一只只会暴风雪的冰系宝可梦把一片风雪召唤到两个挤在一起的敌人头上。
// 必然事实：本招被提交过；至少一个敌人受到过伤害（风雪驻留扑打，圈里必挨）。
// 具体覆盖几个、冰冻是否触发（概率）、推离多远、地面留下几格雪都写进 note 供读轨迹判断。
Smoke.scenario("blizzard", function (stage) {
    stage.fill([-10, -1, -8], [10, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "abomasnow", level: 42, moves: ["blizzard"], at: [-5, 0, 0] });
    var front = stage.pokemon({ species: "rattata", level: 16, moves: ["tackle"], at: [3, 0, 0] });
    var back = stage.pokemon({ species: "rattata", level: 16, moves: ["tackle"], at: [4, 0, 0.6] });
    stage.hostile(caster, front);
    stage.hostile(caster, back);
    stage.until(1200, function () {
        return stage.casts("blizzard", caster) >= 1 && stage.damageTo(front) + stage.damageTo(back) > 0;
    }, function () {
        stage.after(120, function () {
            stage.expect(stage.casts("blizzard", caster) >= 1, "abomasnow committed blizzard");
            stage.expect(stage.damageTo(front) + stage.damageTo(back) > 0, "the storm dealt damage");
            stage.expect(stage.changedBlocks().length > 0, "the storm left snow on the ground");
            stage.note("coverage count, the freeze roll, push distance and the snow layer are positional/random", {
                casts: stage.casts("blizzard", caster),
                frontDamage: Math.round(stage.damageTo(front) * 10) / 10,
                backDamage: Math.round(stage.damageTo(back) * 10) / 10,
                frontFrozen: stage.hadMobEffect(front, "world_combat:status/frozen"),
                changed: stage.changedBlocks().length,
                casterMoved: Math.round(stage.travelled(caster) * 10) / 10
            });
            stage.done();
        });
    }, "blizzard rakes a foe within 60 s");
});
