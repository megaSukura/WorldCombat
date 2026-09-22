/**
 * 双刃头锤 / headsmash 的可执行设计说明。
 *
 * 场面：会双刃头锤的战槌龙（Rampardos）对一只只会跃起、不会还手的鲤鱼王（Magikarp），双方贴身开战。
 * 必然事实：本招被提交过；**施法者自己受到过伤害**——这一招的身份就是自损：撞中按比例反伤，
 * 冲空则一头栽地自伤，两条路都必然掉血（战槌龙默认特性不是反伤免疫）。靶子不还手，所以施法者的掉血
 * 只可能来自这一招自己。
 * 撞中还是冲空、反震多重，取决于运气与站位，写进 note 供读轨迹判断。
 */
Smoke.scenario("headsmash", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Rampardos", level: 40, moves: ["headsmash"], at: [-2.5, 0, 0] });
    // 靶子只带跃起、不会还手：这样“施法者自己掉血”只可能来自反伤或冲空自伤，断言不会误判。
    var foe = stage.pokemon({ species: "Magikarp", level: 25, moves: ["splash"], at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("headsmash", caster) > 0 && stage.damageTo(caster) > 0;
    }, function () {
        stage.expect(stage.casts("headsmash", caster) > 0, "headsmash was committed");
        stage.expect(stage.damageTo(caster) > 0, "the user hurt itself (recoil on a hit or a self-crash on a miss)");
        stage.note("撞中按 recoil 比例反伤，冲空按 selfCrash 比例自伤；两者都是这一招的代价", {
            casts: stage.casts("headsmash", caster),
            selfDamage: Math.round(stage.damageTo(caster) * 10) / 10,
            onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            casterHp: caster.health(),
            foeAlive: foe.alive()
        });
        stage.done();
    }, "headsmash lands (or crashes) and the user pays for it");
});
