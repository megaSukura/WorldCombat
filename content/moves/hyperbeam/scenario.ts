/**
 * 破坏光线的可执行设计说明。
 *
 * 场面：一条直线上的三个目标——Dragonite 在左端，Gyarados 在中间，Snorlax 在最右端，三者都在光柱长度内；
 * 后两者同队（互为友方，彼此打不到），只把 Dragonite 当敌人。三者都只会这一招。
 * 必然事实：本招被提交过；光柱一次打穿了排在后面的两个目标；施法者进入熄火（共享身份 mustrecharge）；
 * 熄火期间无法再提交新动作。
 * 贯穿了几个、暴击、熄火具体多长都是随机／个体／配置结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("hyperbeam", function (stage) {
    var a = stage.pokemon({ species: "Dragonite", level: 45, moves: ["hyperbeam"], at: [-3, 0, 0] });
    var b = stage.pokemon({ species: "Gyarados", level: 45, moves: ["hyperbeam"], at: [0, 0, 0] });
    var c = stage.pokemon({ species: "Snorlax", level: 45, moves: ["hyperbeam"], at: [2.6, 0, 0] });
    stage.team("foes", [b, c]);
    stage.hostile(a, b);
    stage.hostile(a, c);
    stage.until(1200, function () {
        return stage.casts("hyperbeam", a) > 0
            && stage.damageTo(b) > 0 && stage.damageTo(c) > 0
            && stage.hadMobEffect(a, "world_combat:status/mustrecharge");
    }, function () {
        stage.expect(stage.casts("hyperbeam") > 0, "hyperbeam was committed");
        stage.expect(stage.damageTo(b) > 0 && stage.damageTo(c) > 0, "one beam pierced both bodies in the line");
        stage.expect(stage.hadMobEffect(a, "world_combat:status/mustrecharge"), "the caster entered the spent window");
        var before = stage.casts("hyperbeam", a);
        stage.note("hyperbeam exchange", { casts: stage.casts("hyperbeam"), onA: Math.round(stage.damageTo(a) * 10) / 10,
            onB: Math.round(stage.damageTo(b) * 10) / 10, onC: Math.round(stage.damageTo(c) * 10) / 10 });
        stage.after(12, function () {
            stage.expect(stage.casts("hyperbeam", a) === before, "no new action committed while spent");
            stage.done();
        });
    }, "hyperbeam pierces the line");
});
