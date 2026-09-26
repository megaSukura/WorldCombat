/**
 * 火焰拳 / firepunch 的可执行设计说明。
 *
 * 场面：只会火焰拳的火拳手（Infernape）对着两只站得很近、只会跃起的卡比兽（Snorlax），晴天平地。
 * 必然事实：本招被提交过（`stage.casts`）；有目标受到过伤害。
 * 是否点着（scorchChance）、灼伤多久、火是否蔓延到邻居，写进 note 供读轨迹判断。
 */
Smoke.scenario("firepunch", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Infernape", level: 40, moves: ["firepunch"], at: [-2, 0, 0] });
    var near = stage.pokemon({ species: "Snorlax", level: 36, moves: ["splash"], at: [0, 0, 0] });
    var far = stage.pokemon({ species: "Snorlax", level: 36, moves: ["splash"], at: [1.5, 0, 0] });
    stage.hostile(caster, near);
    stage.hostile(caster, far);
    stage.until(900, function () {
        return stage.casts("firepunch", caster) > 0 && (stage.damageTo(near) + stage.damageTo(far)) > 0;
    }, function () {
        stage.after(220, function () {
            stage.expect(stage.casts("firepunch", caster) > 0, "firepunch was committed");
            stage.expect((stage.damageTo(near) + stage.damageTo(far)) > 0, "the fire punch dealt damage");
            stage.note("命中后有 scorchChance 概率点燃；只有真实烧起来才从目标朝最近的、可点燃的邻敌传火一次，已灼伤/免疫/遮挡者跳过", {
                casts: stage.casts("firepunch", caster),
                onNear: Math.round(stage.damageTo(near) * 10) / 10,
                onFar: Math.round(stage.damageTo(far) * 10) / 10,
                nearBurned: stage.hadMobEffect(near, "world_combat:status/burn"),
                farBurned: stage.hadMobEffect(far, "world_combat:status/burn")
            });
            stage.done();
        });
    }, "firepunch lands and may spread a burn to a nearby second foe");
});
