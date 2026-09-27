/**
 * 火焰拳 / firepunch 的可执行设计说明。
 *
 * 场面：只会火焰拳的火拳手（Infernape）对着一只预先带灼伤、挡在前面且只会在原地跃起的卡比兽（Snorlax），
 *   它身后 1.5 格还有第二只不会还手的卡比兽，晴天平地；拳程短、第一只又挡在中间，所以第二只只可能被传火。
 * 必然事实：本招被提交过、第一只受到过伤害；因为主敌命中前就已经真实灼伤，火稳定地从它传给范围内最近的
 *   另一只可点着的敌人——第二只出现共享身份 world_combat:status/burn。
 * 是否这一拳亲自点着、灼伤多久写进 note 供读轨迹判断。
 */
Smoke.scenario("firepunch", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Infernape", level: 40, moves: ["firepunch"], at: [-2, 0, 0] });
    var near = stage.pokemon({ species: "Snorlax", level: 36, moves: ["splash"], at: [0, 0, 0], status: "burn" });
    var far = stage.pokemon({ species: "Snorlax", level: 36, moves: ["splash"], at: [1.5, 0, 0] });
    stage.hostile(caster, near);
    stage.hostile(caster, far);
    stage.until(900, function () {
        return stage.casts("firepunch", caster) > 0 && stage.damageTo(near) > 0;
    }, function () {
        stage.after(220, function () {
            stage.expect(stage.casts("firepunch", caster) > 0, "firepunch was committed");
            stage.expect(stage.damageTo(near) > 0, "the fire punch dealt damage to the front foe");
            stage.expect(stage.hadMobEffect(far, "world_combat:status/burn"),
                "the already-burning front foe spread the fire to the nearest other foe within the real spread range");
            stage.note("命中后有 scorchChance 概率点燃；主敌命中前已灼伤时从它朝最近的、可点燃的邻敌即时传火一次，已灼伤/免疫/遮挡者跳过；这一拳的拳图与格挡是分开的反馈", {
                casts: stage.casts("firepunch", caster),
                onNear: Math.round(stage.damageTo(near) * 10) / 10,
                onFar: Math.round(stage.damageTo(far) * 10) / 10,
                nearWasBurned: stage.hasMobEffect(near, "world_combat:status/burn"),
                farBurned: stage.hadMobEffect(far, "world_combat:status/burn")
            });
            stage.done();
        });
    }, "firepunch lands and its pre-burned target spreads a burn to a nearby second foe");
});
