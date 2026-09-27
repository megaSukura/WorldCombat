/**
 * 暗影拳 / shadowpunch —— 可执行设计说明。
 *
 * 一句话：施法者站着不动，暗影潜入对手脚下的影子，从对手自己的影子里立起一只拳打它。
 *
 * 场面：一只只带暗影拳的夜黑魔人，对一只五格外的怪力（格斗，受幽灵伤害为 1 倍，会走近触发交战）。
 * 断言只取必然事实：这招被提交过、对手受到暗影拳伤害；延迟、是否暴击、拖拽是否生效写进 note 供读轨迹判断。
 */
Smoke.scenario("shadowpunch", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "dusknoir", level: 40, moves: ["shadowpunch"], at: [-2, 0, 0] });
    var foe = stage.pokemon({ species: "machamp", level: 45, moves: ["tackle"], at: [4, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("shadowpunch", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(120, function () {
            stage.expect(stage.casts("shadowpunch", caster) >= 1, "caster committed shadow punch");
            stage.expect(stage.damageTo(foe) > 0, "the shadow fist reached the foe");
            stage.note("creep delay, crit and pull are positional/random; the fist rises from the target's own shadow side and the caster barely moves because the fist travels, not the body", {
                casts: stage.casts("shadowpunch", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                casterMoved: Math.round(stage.travelled(caster) * 10) / 10,
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "shadow punch lands on a foe within 60 s");
});
