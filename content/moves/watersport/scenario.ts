// 玩水的可执行设计说明：这是一片铺在地上的水洼，所以场面要有站在洼里的目标，也要有让 AI 铺水的火属性威胁。
// 必然事实：玩水被放出来过；水洼里的活体（施法者与站在半径内的对手）身上出现过共享身份 world_combat:status/watersport。
// 火招被压制、明火被沤熄需要真实的火招与火方块，属随机/环境结果，写进 note 供完整装配试玩核对。
Smoke.scenario("watersport", function (stage) {
    stage.weather("clear");
    var caster = stage.pokemon({ species: "psyduck", level: 34, moves: ["watersport"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "charmander", level: 22, moves: ["ember"], at: [0, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("watersport", caster) > 0
            && stage.hadMobEffect(caster, "world_combat:status/watersport")
            && stage.hadMobEffect(foe, "world_combat:status/watersport");
    }, function () {
        stage.expect(stage.casts("watersport", caster) > 0, "watersport was cast");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/watersport"), "the caster standing in the puddle carried the shared watersport identity");
        stage.expect(stage.hadMobEffect(foe, "world_combat:status/watersport"), "the foe standing in the puddle carried the shared watersport identity");
        stage.note("水洼铺在施法者脚下并罩住半径内的对手；洼里的活体不分敌我被泡湿（另带共享的 soaked 身份），火招威力按 fireFactor 被压、身上的火被浇灭，水洼每轮扫描还沤熄地面明火。radius、持续时间、火招系数随身高/特攻/特防变化，漫开与沤湿各有取舍。", {
            casts: stage.casts("watersport", caster), casterHp: caster.health(), foeHp: foe.health()
        });
        stage.done();
    }, "watersport soaks the pair");
});
