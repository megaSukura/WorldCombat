/**
 * 雷电拳 / thunderpunch 的可执行设计说明。
 *
 * 场面：只会雷电拳的电击手（Electivire）对着两只站得很近、只会跃起的卡比兽（Snorlax），晴天平地。
 * 必然事实：本招被提交过（`stage.casts`）；有目标受到过伤害（主拳或跃电命中）。
 * 电弧链到谁身上、麻痹是否触发，写进 note 供读轨迹判断。
 */
Smoke.scenario("thunderpunch", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Electivire", level: 40, moves: ["thunderpunch"], at: [-2, 0, 0] });
    var near = stage.pokemon({ species: "Snorlax", level: 36, moves: ["splash"], at: [0, 0, 0] });
    var far = stage.pokemon({ species: "Snorlax", level: 36, moves: ["splash"], at: [1.5, 0, 0] });
    stage.hostile(caster, near);
    stage.hostile(caster, far);
    stage.until(900, function () {
        return stage.casts("thunderpunch", caster) > 0 && (stage.damageTo(near) + stage.damageTo(far)) > 0;
    }, function () {
        stage.after(220, function () {
            stage.expect(stage.casts("thunderpunch", caster) > 0, "thunderpunch was committed");
            stage.expect((stage.damageTo(near) + stage.damageTo(far)) > 0, "the electrified punch dealt damage");
            stage.note("主拳命中后电流按 chainRange/arcs 链向最近的另一个敌人；两者各有概率麻痹", {
                casts: stage.casts("thunderpunch", caster),
                onNear: Math.round(stage.damageTo(near) * 10) / 10,
                onFar: Math.round(stage.damageTo(far) * 10) / 10,
                nearParalyzed: stage.hadMobEffect(near, "world_combat:status/paralysis"),
                farParalyzed: stage.hadMobEffect(far, "world_combat:status/paralysis")
            });
            stage.done();
        });
    }, "thunderpunch jabs and the current chains to a nearby second foe");
});
