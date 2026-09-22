/**
 * 仿效的可执行设计说明。
 *
 * 场面：一只只会仿效的小火龙对 6 格外、只会电击波的卡比兽开战；卡比兽是远程攻击手，会不断放电，
 *   于是全场「最近一次出手」很快变成电击波，仿效就有了一声可以再演的声音。
 * 必然事实：仿效被提交过；仿效之后，施法者真的把借来的电击波打了出去（damageBy(caster) 增长）——
 *   这证明 NativeLoadout.call 把那一手原样接了下去。电击波带 mirror 旗标、不带 failcopycat，可被仿效。
 * 随机结果：回声窗口内实际捡到哪一手、命中与否写进 note 供读轨迹判断。
 */
Smoke.scenario("copycat", function (stage) {
    var caster = stage.pokemon({ species: "Charmander", level: 36, moves: ["copycat"], at: [-3, 0, 0] });
    var target = stage.pokemon({ species: "Snorlax", level: 30, moves: ["shockwave"], at: [3, 0, 0] });
    stage.hostile(caster, target);
    stage.note("staged: charmander(36) copycat vs snorlax(30) shockwave at 6 blocks; snorlax acts first so the echo is shockwave");
    stage.until(1200, function () { return stage.casts("copycat", caster) >= 1; }, function () {
        stage.expect(stage.casts("copycat", caster) >= 1, "copycat was committed");
        stage.note("copycat committed; read the committed line to see which move was echoed", {
            casts: stage.casts("copycat", caster), damageByCaster: Math.round(stage.damageBy(caster) * 10) / 10
        });
        stage.until(1200, function () { return stage.damageBy(caster) > 0; }, function () {
            stage.expect(stage.damageBy(caster) > 0, "the echoed move was actually used by the caster");
            stage.note("the echo landed as the caster's own attack", {
                damageByCaster: Math.round(stage.damageBy(caster) * 10) / 10, damageToTarget: Math.round(stage.damageTo(target) * 10) / 10
            });
            stage.done();
        }, "echo lands");
    }, "copycat cast");
});
