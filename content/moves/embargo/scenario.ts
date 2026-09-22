/**
 * 查封的可执行设计说明：一只只会查封的恶属性精灵，对一只携带剩饭的目标出手。
 * 必然事实：本招被提交过；目标身上出现过共享身份 world_combat:status/embargo。
 * 道具压制走共享的 NativeModifiers suppressItems 层，不是 MobEffect，smoke 读不到道具效果，写进 note 供完整装配试玩核对；
 * 命中率与印记的具体时长不写断言。
 */
Smoke.scenario("embargo", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 8], "minecraft:stone");
    var caster = stage.pokemon({ species: "Umbreon", level: 30, moves: ["embargo"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "Geodude", level: 28, moves: ["tackle"], item: "cobblemon:leftovers", at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1000, function () {
        return stage.casts("embargo", caster) > 0 && stage.hadMobEffect(foe, "world_combat:status/embargo");
    }, function () {
        stage.expect(stage.casts("embargo", caster) > 0, "查封被放出来了");
        stage.expect(stage.hadMobEffect(foe, "world_combat:status/embargo"), "目标身上出现了查封的共享身份");
        stage.note("目标是携带剩饭的宝可梦，命中时应叠加共享 NativeModifiers suppressItems 层，所有读取持有物的结算因此读到「道具被按住」（smoke 读不到道具效果，留给完整装配试玩）。时长随等级/特攻、锁环随特攻、封条随等级变化。",
            { casts: stage.casts("embargo", caster), foeHp: Math.round(foe.health() * 10) / 10 });
        stage.done();
    }, "查封生效");
});
