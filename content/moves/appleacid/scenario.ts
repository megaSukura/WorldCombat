/**
 * 苹果酸的可执行设计说明：让会这一招的精灵朝一名对手扔出一颗酸苹果，验证它命中、造成伤害，
 * 并给目标留下发酵身份（共享身份 world_combat:status/sour，第一颗命中必然施加）。
 * 叠酸（发酵中的第二颗改为 −2 并耗掉发酵窗口）、酸浆每跳、苹果是否落空都是随机/位置结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("appleacid", function (stage) {
    var cherubi = stage.pokemon({ species: "cherubi", level: 36, moves: ["appleacid"], at: [-8, 0, 0] });
    var machop = stage.pokemon({ species: "machop", level: 28, moves: ["tackle"], at: [0, 0, 0] });
    stage.hostile(cherubi, machop);
    stage.until(900, function () {
        return stage.casts("appleacid", cherubi) > 0 && stage.damageTo(machop) > 0
            && stage.hadMobEffect(machop, "world_combat:status/sour");
    }, function () {
        stage.expect(stage.casts("appleacid", cherubi) > 0, "苹果酸被放出来了");
        stage.expect(stage.damageTo(machop) > 0, "酸苹果砸到了目标身上");
        stage.expect(stage.hadMobEffect(machop, "world_combat:status/sour"), "第一颗命中后目标带上了发酵身份");
        stage.note("叠酸（发酵中的第二颗改为 −2 并耗掉发酵窗口、之后重新从 −1 开始）、酸浆每跳与是否落空都是随机/位置结果，只作记录。",
            { casts: stage.casts("appleacid", cherubi), damage: Math.round(stage.damageTo(machop) * 10) / 10,
              sour: stage.hasMobEffect(machop, "world_combat:status/sour") });
        stage.done();
    }, "酸苹果命中目标");
});
