/**
 * 酸液炸弹的可执行设计说明：让会这一招的精灵贴到一名对手身前，喷出一道酸雾，验证它命中、造成伤害。
 * 特防 −2 是命中后的必然结果，写进 note 供读轨迹判断。喷雾即喷即散，没有驻留伤害，也不再重复掉防；
 * 空喷（没有敌人时沿朝向喷）属于位置结果，同样只作记录。
 */
Smoke.scenario("acidspray", function (stage) {
    var oddish = stage.pokemon({ species: "oddish", level: 32, moves: ["acidspray"], at: [-4, 0, 0] });
    var machop = stage.pokemon({ species: "machop", level: 28, moves: ["tackle"], at: [0, 0, 0] });
    stage.hostile(oddish, machop);
    stage.until(900, function () { return stage.casts("acidspray", oddish) > 0 && stage.damageTo(machop) > 0; }, function () {
        stage.expect(stage.casts("acidspray", oddish) > 0, "酸液炸弹被放出来了");
        stage.expect(stage.damageTo(machop) > 0, "酸雾淋到了目标身上");
        stage.note("特防下降 2 级（命中即降、每人一次）是命中后的必然结果；喷雾即喷即散，不驻留也不再反复掉防。这是贴脸的短程楔形喷淋。",
            { casts: stage.casts("acidspray", oddish), damage: Math.round(stage.damageTo(machop) * 10) / 10 });
        stage.done();
    }, "酸雾淋到目标");
});
