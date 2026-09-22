/**
 * 礼物 / present 的可执行设计说明。
 *
 * 场面：晴天白天、开阔平地。只会礼物的胖丁（jigglypuff）对一只只会「跃起」的卡比兽（snorlax，
 *   伤害不了施法者）；目标是个好靶子（血厚、走得慢），盒子有充分机会落在它身上。
 *
 * 必然事实：礼物的盒子被递出去过（`stage.casts`>0）。掷中机关还是糖果、伤害档位、暴击都写在 note 里；
 *   机关概率（稳妥盒约九成四）远高于糖果，所以整场至少炸到一次几乎是必然，但仍按随机结果读轨迹判断。
 */
Smoke.scenario("present", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.weather("clear");
    stage.time("day");

    var caster = stage.pokemon({ species: "jigglypuff", level: 30, moves: ["present"], at: [-4, 0, 0] });
    var foe = stage.pokemon({ species: "snorlax", level: 35, moves: ["splash"], at: [0, 0, 0] });

    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("present", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("present", caster) > 0, "a gift box was handed over");
        stage.expect(stage.damageTo(foe) > 0, "the box opened as a trap and dealt damage");
        stage.note("掷骰结果（机关／糖果、档位）与暴击不进断言；糖果会治疗落点旁最近的活物，连对手一起。",
            { casts: stage.casts("present", caster), damage: Math.round(stage.damageTo(foe) * 10) / 10,
              casterHealth: Math.round(caster.health() * 10) / 10, foeHealth: Math.round(foe.health() * 10) / 10 });
        stage.done();
    }, "the box is handed over and lands");
});
