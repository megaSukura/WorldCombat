/**
 * 火焰轮 / flamewheel 的可执行设计说明。
 *
 * 场面：会火焰轮的烈焰马（Rapidash）对两只只会跃起、不会还手的鲤鱼王（Magikarp），两只挡在同一条滚动线上。
 * 必然事实：本招被提交过；同一次滚动碾到了线上两个人并造成了伤害；本招没有反伤，所以施法者不该因它掉血。
 * 滚动会不会滚过头、是否点着目标（默认约 10%），都写进 note 供读轨迹判断。
 */
Smoke.scenario("flamewheel", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    // 两个对手排在同一条水平滚线上：同一步穿过第一个身体后要能继续够到第二个。
    var caster = stage.pokemon({ species: "rapidash", level: 45, moves: ["flamewheel"], at: [-1.5, 0, 0] });
    var near = stage.pokemon({ species: "magikarp", level: 20, moves: ["splash"], at: [1.0, 0, 0] });
    var far = stage.pokemon({ species: "magikarp", level: 20, moves: ["splash"], at: [2.3, 0, 0] });
    stage.hostile(caster, near);
    stage.hostile(caster, far);
    stage.until(1200, function () {
        return stage.casts("flamewheel", caster) > 0 && stage.damageTo(near) > 0 && stage.damageTo(far) > 0;
    }, function () {
        stage.expect(stage.casts("flamewheel", caster) > 0, "flamewheel was committed");
        stage.expect(stage.damageTo(near) > 0, "the rolling wheel hit the first foe in line");
        stage.expect(stage.damageTo(far) > 0, "the same roll reached the second foe in line");
        stage.expect(stage.damageTo(caster) === 0, "the wheel has no recoil");
        stage.note("灼伤是概率结果（默认约 10%）；滚动会继续前进，实际滚了多远随走位变化", {
            casts: stage.casts("flamewheel", caster),
            onNear: Math.round(stage.damageTo(near) * 10) / 10,
            onFar: Math.round(stage.damageTo(far) * 10) / 10,
            selfDamage: Math.round(stage.damageTo(caster) * 10) / 10,
            rolled: Math.round(stage.travelled(caster) * 10) / 10,
            nearBurning: stage.hadMobEffect(near, "world_combat:status/burn"),
            farBurning: stage.hadMobEffect(far, "world_combat:status/burn"),
            foeAlive: near.alive() && far.alive()
        });
        stage.done();
    }, "flamewheel rolls through a line of two and lands without recoil");
});
