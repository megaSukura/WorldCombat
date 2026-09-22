/**
 * 舍身冲撞 / doubleedge 的可执行设计说明。
 *
 * 场面：会舍身冲撞的肯泰罗（Tauros）对 4 格外只会跃起、不会还手的鲤鱼王（Magikarp），双方贴身开战。
 * 必然事实：本招被提交过；目标受到过伤害（正面撞实）；**施法者自己也受到过伤害**——命中后按反伤比例
 * 反震是这一招的固定代价。靶子不还手，所以施法者的掉血只可能来自这一招自己。
 * 命中率、暴击与双方是否被弹开多远取决于运气与站位，写进 note 供读轨迹判断。
 */
Smoke.scenario("doubleedge", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Tauros", level: 40, moves: ["doubleedge"], at: [-2.5, 0, 0] });
    // 靶子只带跃起、不会还手：这样"施法者自己掉血"只可能来自这一招的反震，断言不会误判。
    var foe = stage.pokemon({ species: "Magikarp", level: 22, moves: ["splash"], at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("doubleedge", caster) > 0 && stage.damageTo(foe) > 0 && stage.damageTo(caster) > 0;
    }, function () {
        stage.expect(stage.casts("doubleedge", caster) > 0, "doubleedge was committed");
        stage.expect(stage.damageTo(foe) > 0, "the tackle dealt damage to the target");
        stage.expect(stage.damageTo(caster) > 0, "the user paid recoil for the hit");
        stage.note("舍身冲撞命中后按 recoil 比例反震自己、把目标顶飞，自己在猛进式下也会被弹开；具体数值取决于速度、体重与防御", {
            casts: stage.casts("doubleedge", caster),
            onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            selfDamage: Math.round(stage.damageTo(caster) * 10) / 10,
            casterHp: caster.health(),
            foeAlive: foe.alive(),
            moved: Math.round(stage.travelled(caster) * 10) / 10
        });
        stage.done();
    }, "doubleedge lands and the user pays recoil");
});
