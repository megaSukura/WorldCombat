/**
 * 魅惑之声 / disarmingvoice —— 可执行设计说明。
 *
 * 一句话：一声魅惑的鸣叫充满身周整块空间，站进去就避不开。
 *
 * 场面：一只只会魅惑之声的精灵，对两只挤在一起的对手；场地铺平，白天晴天。
 * 断言只取必然事实：这招被提交过、至少一个对手受过魅惑之声伤害。被罩住的数量、错拍与魅惑是否挂上
 * （后者只有安抚形态才挂，且状态随机）写进 note 供读轨迹判断。
 */
Smoke.scenario("disarmingvoice", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "jigglypuff", level: 38, moves: ["disarmingvoice"], at: [-2, 0, 0] });
    var first = stage.pokemon({ species: "rattata", level: 16, moves: ["tackle"], at: [2, 0, 0] });
    var second = stage.pokemon({ species: "rattata", level: 16, moves: ["tackle"], at: [3, 0, 1] });
    stage.hostile(caster, first);
    stage.hostile(caster, second);
    stage.until(1000, function () {
        return stage.casts("disarmingvoice", caster) >= 1 && (stage.damageTo(first) + stage.damageTo(second)) > 0;
    }, function () {
        stage.after(60, function () {
            stage.expect(stage.casts("disarmingvoice", caster) >= 1, "caster committed disarming voice");
            stage.expect((stage.damageTo(first) + stage.damageTo(second)) > 0, "disarming voice dealt damage to a foe");
            stage.note("how many stood inside the field and whether the charm landed are positional/random", {
                casts: stage.casts("disarmingvoice", caster),
                first: Math.round(stage.damageTo(first) * 10) / 10,
                second: Math.round(stage.damageTo(second) * 10) / 10,
                firstCharmed: stage.hadMobEffect(first, "world_combat:status/charmed"),
                secondCharmed: stage.hadMobEffect(second, "world_combat:status/charmed")
            });
            stage.done();
        });
    }, "disarming voice lands within 50 s");
});
