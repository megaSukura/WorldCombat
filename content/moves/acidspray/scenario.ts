/**
 * 酸液炸弹的可执行设计说明：让会这一招的精灵贴到一名对手身前，喷出一道酸雾，验证它命中、造成伤害。
 * 特防 −2、残雾是否咬到迟到者都是必然或位置结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("acidspray", function (stage) {
    var oddish = stage.pokemon({ species: "oddish", level: 32, moves: ["acidspray"], at: [-4, 0, 0] });
    var machop = stage.pokemon({ species: "machop", level: 28, moves: ["tackle"], at: [0, 0, 0] });
    stage.hostile(oddish, machop);
    stage.until(900, function () { return stage.casts("acidspray", oddish) > 0 && stage.damageTo(machop) > 0; }, function () {
        stage.expect(stage.casts("acidspray", oddish) > 0, "酸液炸弹被放出来了");
        stage.expect(stage.damageTo(machop) > 0, "酸雾淋到了目标身上");
        stage.note("特防下降 2 级（必中）与残雾在锥内是否再咬到人，都是本招的固定/位置结果，只作记录；这是贴脸的短程楔形喷淋。",
            { casts: stage.casts("acidspray", oddish), damage: Math.round(stage.damageTo(machop) * 10) / 10 });
        stage.done();
    }, "酸雾淋到目标");
});
