/**
 * 酸液炸弹的可执行设计说明：让会这一招的精灵贴到一名对手身前，喷出一道短而宽的酸雾，验证它命中、造成伤害。
 * 身前楔形里放两个不动的目标，且都在本个体的张角与射程内，一口应把两个都淋到。
 * 特防 −2 是命中后的必然结果，断言实际阶梯确实下降；墙面遮挡、聚焦/宽喷边界与空喷只作记录。
 * 喷雾即喷即散，没有驻留伤害，也不再重复掉防。
 */
Smoke.scenario("acidspray", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var oddish = stage.pokemon({ species: "oddish", level: 32, moves: ["acidspray"], at: [-4, 0, 0] });
    var front = stage.pokemon({ species: "machop", level: 28, moves: ["tackle"], at: [0, 0, 0] });
    var side = stage.pokemon({ species: "machop", level: 28, moves: ["tackle"], at: [0, 0, 1.5] });
    stage.hostile(oddish, front);
    stage.hostile(oddish, side);
    stage.noai(front, side);
    stage.until(1200, function () {
        return stage.casts("acidspray", oddish) > 0 && stage.damageTo(front) > 0 && stage.damageTo(side) > 0;
    }, function () {
        stage.after(2, function () {
            stage.expect(stage.casts("acidspray", oddish) > 0, "酸液炸弹被放出来了");
            stage.expect(stage.damageTo(front) > 0 && stage.damageTo(side) > 0, "身前楔形里的两个目标都被淋到");
            stage.expect(stage.stages(front).spd <= -2, "前面的目标特防实际下降 2 级");
            stage.expect(stage.stages(side).spd <= -2, "侧面的目标也被同一口削防 2 级");
            stage.note("酸雾从口边往外喷，与判定的水平楔形共用射程与张角；口边到目标真有墙时不算命中（位置关系，烟测不写死）。聚焦喷口收窄张角、拉长射程，宽喷张角最宽。喷雾即喷即散、不驻留也不再反复掉防。",
                { casts: stage.casts("acidspray", oddish),
                  frontDamage: Math.round(stage.damageTo(front) * 10) / 10,
                  sideDamage: Math.round(stage.damageTo(side) * 10) / 10,
                  frontSpd: stage.stages(front).spd,
                  sideSpd: stage.stages(side).spd });
            stage.done();
        });
    }, "酸雾淋到楔形里的两个目标");
});
