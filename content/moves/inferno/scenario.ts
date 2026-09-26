/**
 * 炼狱 / inferno 的可执行设计说明。
 *
 * 场面：只会炼狱的黑鲁加（Houndour）对五格外的卡比兽（Snorlax，只会跃起、不会还手、几乎站定），晴天。
 * 火印点在卡比兽落脚处，预热过后火柱涌起。
 * 必然事实：本招被提交过（`stage.casts`）；目标受到过伤害（火柱命中）；目标身上出现过共享灼伤身份（原生 100%）。
 * 预热窗口里目标若走开就会落空——卡比兽只会跃起、几乎站定，命中是必然的；追身道数与暴击仍写进 note。
 */
Smoke.scenario("inferno", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "houndour", level: 45, moves: ["inferno"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "snorlax", level: 32, moves: ["splash"], ability: "gluttony", at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.after(5, function () { stage.prefer(caster, "inferno", { pin: true }); });
    stage.until(1600, function () {
        return stage.casts("inferno", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        // 状态是命中后下一刻才挂上的，等几刻再读灼伤身份。
        stage.after(8, function () {
            stage.expect(stage.casts("inferno", caster) > 0, "houndour committed inferno");
            stage.expect(stage.damageTo(foe) > 0, "the fire column struck the foe");
            stage.expect(stage.hadMobEffect(foe, "world_combat:status/burn"), "the target was left with a burn (100% native)");
            stage.note("crit and the pin follow-ups are random/positional; the fuse window and radius are the dodge window",
                { casts: stage.casts("inferno", caster), onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
                  burned: stage.hadMobEffect(foe, "world_combat:status/burn"), foeAlive: foe.alive() });
            stage.done();
        });
    }, "inferno erupts under a stationary foe");
});
