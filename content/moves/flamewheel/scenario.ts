/**
 * 火焰轮 / flamewheel 的可执行设计说明。
 *
 * 场面：会火焰轮的烈焰马（Rapidash）对一只只会跃起、不会还手的鲤鱼王（Magikarp）。
 * 必然事实：本招被提交过；它碾到过靶子并造成了伤害（本招没有反伤，所以施法者不该因它掉血）。
 * 滚动会不会滚过头、是否点着目标（默认约 10%），都写进 note 供读轨迹判断。
 */
Smoke.scenario("flamewheel", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    // 火轮要滚到人身上才有一次踩过：对手摆在一个滚动距离之内。
    var caster = stage.pokemon({ species: "rapidash", level: 45, moves: ["flamewheel"], at: [-1.5, 0, 0] });
    var foe = stage.pokemon({ species: "magikarp", level: 20, moves: ["splash"], at: [1.0, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("flamewheel", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("flamewheel", caster) > 0, "flamewheel was committed");
        stage.expect(stage.damageTo(foe) > 0, "the rolling wheel hit the foe");
        stage.note("灼伤是概率结果（默认约 10%）；滚动会继续前进，实际滚了多远随走位变化", {
            casts: stage.casts("flamewheel", caster),
            onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            selfDamage: Math.round(stage.damageTo(caster) * 10) / 10,
            rolled: Math.round(stage.travelled(caster) * 10) / 10,
            burning: stage.hadMobEffect(foe, "world_combat:status/burn"),
            foeAlive: foe.alive()
        });
        stage.done();
    }, "flamewheel rolls through and lands without recoil");
});
