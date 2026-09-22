/**
 * 暗影拳 / shadowpunch —— 可执行设计说明。
 *
 * 一句话：暗影从施法者脚下窜到对手影子里，再从对手影子里立起一只拳打它。
 *
 * 场面：一只只带暗影拳的夜黑魔人，对一只五格外的怪力（格斗，受幽灵伤害为 1 倍且走得慢，便于让拳打完）。场地铺平，夜晚。
 * 断言只取必然事实：这招被提交过、对手受过暗影拳伤害。蔓延延迟、是否暴击、拖拽是否生效写进 note 供读轨迹判断。
 */
Smoke.scenario("shadowpunch", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "dusknoir", level: 40, moves: ["shadowpunch"], at: [-2, 0, 0] });
    var foe = stage.pokemon({ species: "machamp", level: 45, moves: ["tackle"], at: [4, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1000, function () {
        return stage.casts("shadowpunch", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(120, function () {
            stage.expect(stage.casts("shadowpunch", caster) >= 1, "caster committed shadow punch");
            stage.expect(stage.damageTo(foe) > 0, "shadow punch dealt damage to the foe");
            stage.note("creep delay, crit and pull are positional/random; the caster barely moves because the fist travels, not the body", {
                casts: stage.casts("shadowpunch", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                casterMoved: Math.round(stage.travelled(caster) * 10) / 10,
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "shadow punch lands on a foe within 50 s");
});
