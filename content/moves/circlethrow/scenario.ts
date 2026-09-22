/**
 * 巴投的可执行设计说明。
 *
 * 场面：一只只会「巴投」的伙伴面对一只厚实的对手（先贴到抓取距离内）。
 * 必然事实：本招被提交过、对手挨过伤害、对手身上出现过共享身份 world_combat:status/routed（溃退）。
 * 命中检定（原生命中 90）与暴击、被摔到多远，写进 note 供读轨迹判断。
 */
Smoke.scenario("circlethrow", function (stage) {
    var caster = stage.pokemon({ species: "Throh", level: 30, moves: ["circlethrow"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "Snorlax", level: 34, moves: ["tackle"], at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("circlethrow", caster) > 0 && stage.damageTo(foe) > 0 && stage.hadMobEffect(foe, "world_combat:status/routed");
    }, function () {
        stage.expect(stage.casts("circlethrow", caster) > 0, "巴投被放出来了");
        stage.expect(stage.damageTo(foe) > 0, "摔击打到了目标身上");
        stage.expect(stage.hadMobEffect(foe, "world_combat:status/routed"), "溃退身份落到了对手身上");
        stage.note("巴投只对一个目标、必须贴身；命中后目标沿抛物线被摔到施法者背后并逐出交战圈。是否命中（原生命中 90）与暴击不写断言。",
            { casts: stage.casts("circlethrow", caster), damage: stage.damageTo(foe), travelled: Math.round(stage.travelled(foe) * 10) / 10 });
        stage.done();
    }, "巴投命中并逐退");
});
