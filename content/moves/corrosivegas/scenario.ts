/**
 * 腐蚀气体的可执行设计说明：一只只会腐蚀气体的精灵，站在两只各携带道具的目标中间。
 * 必然事实：本招被提交过；近处目标身上出现过共享身份 world_combat:status/corroded。
 * 「携带的道具被溶毁、不掉落」与「残雾」是确定行为，但舞台接口不暴露持有物与残雾，写进 note 供完整装配试玩核对；
 * 雾半径随特攻/体型、沾酸随等级/特攻、残雾随体重变化，两只目标是否同处雾内随走位变化。
 */
Smoke.scenario("corrosivegas", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 8], "minecraft:stone");
    var caster = stage.pokemon({ species: "Skuntank", level: 34, moves: ["corrosivegas"], at: [0, 0, 0] });
    var near = stage.pokemon({ species: "Geodude", level: 28, moves: ["tackle"], item: "cobblemon:leftovers", at: [3, 0, 0] });
    var far = stage.pokemon({ species: "Machop", level: 28, moves: ["tackle"], item: "cobblemon:oran_berry", at: [-2, 0, 2] });
    stage.hostile(caster, near);
    stage.hostile(caster, far);
    stage.until(1000, function () {
        return stage.casts("corrosivegas", caster) > 0
            && (stage.hadMobEffect(near, "world_combat:status/corroded") || stage.hadMobEffect(far, "world_combat:status/corroded"));
    }, function () {
        stage.expect(stage.casts("corrosivegas", caster) > 0, "腐蚀气体被放出来了");
        stage.expect(stage.hadMobEffect(near, "world_combat:status/corroded") || stage.hadMobEffect(far, "world_combat:status/corroded"),
            "雾里至少一个目标身上出现了沾酸的共享身份");
        stage.note("两只目标都带着道具，若同处雾内，各自的道具应被原生持有物操作当场溶毁、不掉落（持有物不被舞台接口读取，不写断言）；队友与对手一视同仁，施法者自己除外。目标会走位，具体罩住哪一只不写断言。",
            { casts: stage.casts("corrosivegas", caster), nearTainted: stage.hadMobEffect(near, "world_combat:status/corroded"),
                farTainted: stage.hadMobEffect(far, "world_combat:status/corroded"), damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10 });
        stage.done();
    }, "腐蚀气体罩住了一片");
});
