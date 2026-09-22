// 薄雾场地的可执行设计说明：让一只会薄雾场地的宝可梦对着会扑上来的物理对手铺开薄雾。
// 必然事实：薄雾场地被放出来过；站在场上的施法者身上出现过共享身份 world_combat:status/mistyterrain。
// 异常门禁、龙伤减半与净化需要真正的异常施加或龙属性招式，属随机/环境结果，写进 note 供完整装配试玩核对。
Smoke.scenario("mistyterrain", function (stage) {
    stage.weather("clear");
    stage.time("day");
    const caster = stage.pokemon({ species: "clefairy", level: 32, moves: ["mistyterrain"], at: [-1, 0, 0] });
    const foe = stage.pokemon({ species: "nidoranm", level: 20, moves: ["poisonsting"], at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("mistyterrain", caster) > 0
            && stage.hadMobEffect(caster, "world_combat:status/mistyterrain");
    }, function () {
        stage.expect(stage.casts("mistyterrain", caster) > 0, "mistyterrain was cast");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/mistyterrain"), "the grounded caster carried the shared mistyterrain identity");
        stage.after(200, function () {
            stage.note("薄雾铺在施法者脚下；场上的活体不会陷入主异常（被 CombatStatus.gate 拒绝），受到的龙属性招式伤害减半；开启净化时雾还会洗掉已有异常。本场景的野生对手未主动出手，门禁、龙伤减半与净化的实际命中留给完整装配试玩核对；半径/时长/雾点随特攻/身高/等级变化，净化雾与薄幕各有取舍。", {
                casts: stage.casts("mistyterrain", caster), casterHp: Math.round(caster.health() * 10) / 10,
                poisoned: stage.hasMobEffect(caster, "world_combat:status/poison"), damageTaken: Math.round(stage.damageTo(caster) * 10) / 10
            });
            stage.done();
        });
    }, "misty terrain covers the caster");
});
