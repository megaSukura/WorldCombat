/**
 * 精神强念的可执行设计说明：让会这一招的超能力系对手朝一名格斗系目标聚念，验证擒压命中、造成伤害。
 * 定身（rooted）、拖拽、特防下降与随后那记挤压都是可读的机制结果；特防下降是随机的，写进 note。
 */
Smoke.scenario("psychic", function (stage) {
    var abra = stage.pokemon({ species: "abra", level: 38, moves: ["psychic"], at: [-5, 0, 0] });
    var machop = stage.pokemon({ species: "machop", level: 30, moves: ["tackle"], at: [0, 0, 0] });
    stage.hostile(abra, machop);
    stage.until(900, function () { return stage.casts("psychic", abra) > 0 && stage.damageTo(machop) > 0; }, function () {
        stage.expect(stage.casts("psychic", abra) > 0, "精神强念被放出来了");
        stage.expect(stage.damageTo(machop) > 0, "擒压打到了目标身上");
        stage.note("特防下降（基础 10% 起）是随机结果；定身与拖拽作用于目标的位置，第二记挤压只在目标仍被同一只握按住时落下。",
            { casts: stage.casts("psychic", abra), damage: Math.round(stage.damageTo(machop) * 10) / 10 });
        stage.done();
    }, "擒压命中目标");
});
