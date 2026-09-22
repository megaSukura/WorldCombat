/**
 * 回复封锁的可执行设计说明：一只只会回复封锁的精灵，对一只还剩大部分生命的对手出手。
 * 必然事实：本招被提交过；目标身上出现过共享身份 world_combat:status/healblock。
 * 「回血被按回地板」需要目标真的受到治疗（另带回复招式或剩饭）才能观察，smoke 舞台不摆回血源，写进 note 供完整装配试玩核对；
 * 命中率与封锁时长不写断言。
 */
Smoke.scenario("healblock", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 8], "minecraft:stone");
    var caster = stage.pokemon({ species: "Gothorita", level: 32, moves: ["healblock"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "Snorlax", level: 30, moves: ["tackle"], at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1000, function () {
        return stage.casts("healblock", caster) > 0 && stage.hadMobEffect(foe, "world_combat:status/healblock");
    }, function () {
        stage.expect(stage.casts("healblock", caster) > 0, "回复封锁被放出来了");
        stage.expect(stage.hadMobEffect(foe, "world_combat:status/healblock"), "目标身上出现了回复封锁的共享身份");
        stage.note("目标是满血附近的卡比兽，命中时应挂上镇环、记下生命地板并封住回血通道；被挡回的回升需要目标受到治疗才能观察，留给完整装配试玩。时长随等级/特防、镇环随特攻、镇条随等级变化。",
            { casts: stage.casts("healblock", caster), foeHp: Math.round(foe.health() * 10) / 10 });
        stage.done();
    }, "回复封锁生效");
});
