/**
 * 龙尾的可执行设计说明。
 *
 * 场面：一只只会「龙尾」的伙伴面对一只厚实的对手（先靠近到射程内）。
 * 必然事实：本招被提交过、对手挨过伤害、对手身上出现过共享身份 world_combat:status/routed（溃退）。
 * 命中检定（原生命中 90）与暴击、以及被弹飞多远，写进 note 供读轨迹判断。
 */
Smoke.scenario("dragontail", function (stage) {
    var caster = stage.pokemon({ species: "Druddigon", level: 30, moves: ["dragontail"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "Snorlax", level: 34, moves: ["tackle"], at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("dragontail", caster) > 0 && stage.damageTo(foe) > 0 && stage.hadMobEffect(foe, "world_combat:status/routed");
    }, function () {
        stage.expect(stage.casts("dragontail", caster) > 0, "龙尾被放出来了");
        stage.expect(stage.damageTo(foe) > 0, "尾扫打到了目标身上");
        stage.expect(stage.hadMobEffect(foe, "world_combat:status/routed"), "溃退身份落到了对手身上");
        stage.note("尾扫是正面扇形，主目标吃满威力、其余目标吃折扣；是否命中（原生命中 90）与暴击不被舞台接口决定，不写断言。",
            { casts: stage.casts("dragontail", caster), damage: stage.damageTo(foe), travelled: Math.round(stage.travelled(foe) * 10) / 10 });
        stage.done();
    }, "龙尾命中并逐退");
});
