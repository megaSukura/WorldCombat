/**
 * 千变万花的可执行设计说明：让会这一招的草系精灵朝一名厚实的普通系目标掷出一束花，
 * 验证花束被扔出来、拐弯命中并造成伤害。必定命中与必定要害是这一招的定义，写进 note 供读轨迹判断。
 */
Smoke.scenario("flowertrick", function (stage) {
    var meowscarada = stage.pokemon({ species: "meowscarada", level: 40, moves: ["flowertrick"], at: [-6, 0, 0] });
    var snorlax = stage.pokemon({ species: "snorlax", level: 32, moves: ["tackle"], at: [0, 0, 0] });
    stage.fill([-6, -1, -1], [1, -1, 1], "minecraft:grass_block");
    stage.hostile(meowscarada, snorlax);
    stage.until(900, function () { return stage.casts("flowertrick", meowscarada) > 0 && stage.damageTo(snorlax) > 0; }, function () {
        stage.expect(stage.casts("flowertrick", meowscarada) > 0, "千变万花被扔出来了");
        stage.expect(stage.damageTo(snorlax) > 0, "花束绽开打到了目标身上");
        stage.note("花束会一路朝目标修正方向（必定命中），命中时按共享暴击强制要害（必定击中要害）。变量：伤害浮动、结环是否溅到旁人、以及目标恰好在飞行中走远的极少数情况。落点会租出 minecraft:pink_petals（到期原方块回来）。",
            { casts: stage.casts("flowertrick", meowscarada), damage: Math.round(stage.damageTo(snorlax) * 10) / 10,
              changed: stage.changedBlocks().length });
        stage.done();
    }, "花束命中目标");
});
