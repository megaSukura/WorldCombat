/**
 * 辣椒精华的可执行设计说明。
 *
 * 场面：一只只会辣椒精华的狠辣椒与两只挤在一起的敌人僵尸（相隔 1 格）开战。两只僵尸都会走近并近战。
 * 默认配置是原液浓缩：射程 6、半径 1.6，落点足以同时罩住这两只。自由落点：不怕落空，先甩到僵尸身上。
 * 必然事实：本招被提交过；两只僵尸的共享攻击等级都升高、共享防御等级都下降（辣雾对范围内所有非友方结算）。
 * 具体辣到几只、投掷是否落空、掩体是否挡下写进 note 供读轨迹判断。
 */
Smoke.scenario("spicyextract", function (stage) {
    var caster = stage.pokemon({ species: "Scovillain", level: 40, moves: ["spicyextract"], at: [0, 0, 0] });
    var foeA = stage.mob({ type: "minecraft:zombie", at: [7, 0, 0] });
    var foeB = stage.mob({ type: "minecraft:zombie", at: [7, 0, 1] });
    var beforeA = stage.stages(foeA);
    var beforeB = stage.stages(foeB);
    stage.hostile(caster, foeA);
    stage.hostile(caster, foeB);
    function raised(a: any, before: any): boolean {
        return (stage.stages(a).atk || 0) > (before.atk || 0) + 0.001;
    }
    function shredded(a: any, before: any): boolean {
        return (stage.stages(a).def || 0) < (before.def || 0) - 0.001;
    }
    stage.until(800, function () {
        return stage.casts("spicyextract") > 0
            && raised(foeA, beforeA) && raised(foeB, beforeB)
            && shredded(foeA, beforeA) && shredded(foeB, beforeB);
    }, function () {
        stage.expect(stage.casts("spicyextract") > 0, "spicyextract was committed");
        stage.expect(raised(foeA, beforeA), "the first target's Attack rose");
        stage.expect(raised(foeB, beforeB), "the second target's Attack rose");
        stage.expect(shredded(foeA, beforeA), "the first target's Defence fell");
        stage.expect(shredded(foeB, beforeB), "the second target's Defence fell");
        stage.note("spicyextract observations", {
            casts: stage.casts("spicyextract"),
            stagesA: stage.stages(foeA),
            stagesB: stage.stages(foeB),
            moved: Math.round((stage.travelled(foeA) + stage.travelled(foeB)) * 10) / 10
        });
        stage.done();
    }, "spicyextract scorches both zombies");
});
