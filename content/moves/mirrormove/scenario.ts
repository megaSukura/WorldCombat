/**
 * 鹦鹉学舌的可执行设计说明。
 *
 * 场面：一只只会鹦鹉学舌的比雕对 6 格外、只会电击波的卡比兽开战；电击波带 native mirror 旗标，
 *   卡比兽先出手后，它的「最近一次使用的招式」就是一面可折的镜子。
 * 必然事实：鹦鹉学舌被提交过；折返之后，施法者真的把电击波打回了目标（damageBy(caster) 增长）。
 * 随机结果：镜面记忆窗口内实际折到哪一手、命中与否写进 note 供读轨迹判断。
 */
Smoke.scenario("mirrormove", function (stage) {
    var caster = stage.pokemon({ species: "Pidgeot", level: 38, moves: ["mirrormove"], at: [-3, 0, 0] });
    var target = stage.pokemon({ species: "Snorlax", level: 30, moves: ["shockwave"], at: [3, 0, 0] });
    stage.hostile(caster, target);
    stage.note("staged: pidgeot(38) mirrormove vs snorlax(30) shockwave at 6 blocks; shockwave carries the mirror flag");
    stage.until(1200, function () { return stage.casts("mirrormove", caster) >= 1; }, function () {
        stage.expect(stage.casts("mirrormove", caster) >= 1, "mirrormove was committed");
        stage.note("mirrormove committed; read the committed line to see which move was mirrored", {
            casts: stage.casts("mirrormove", caster), damageByCaster: Math.round(stage.damageBy(caster) * 10) / 10
        });
        stage.until(1200, function () { return stage.damageBy(caster) > 0; }, function () {
            stage.expect(stage.damageBy(caster) > 0, "the mirrored move was actually used by the caster");
            stage.note("the mirror landed as the caster's own attack", {
                damageByCaster: Math.round(stage.damageBy(caster) * 10) / 10, damageToTarget: Math.round(stage.damageTo(target) * 10) / 10
            });
            stage.command("kill " + target.ref.split("/")[0]);
            const nativeCaster = stage.pokemon({ species: "snorlax", level: 50, moves: ["mirrormove"], at: [12, 0, 0] });
            const nativeFoe = stage.mob({ type: "minecraft:zombie", at: [14, 0, 0] });
            stage.time("night"); stage.hostile(nativeCaster, nativeFoe);
            stage.until(600, () => stage.casts("mirrormove", nativeCaster) > 0 && stage.damageBy(nativeCaster) > 0, () => {
                stage.expect(stage.damageBy(nativeFoe) > 0, "The ordinary opponent supplied a real native attack first");
                stage.expect(stage.damageBy(nativeCaster) > 0, "The copied ordinary punch made real short-range contact");
                stage.note("Both the Pokemon recipe and supported native-contact branches were exercised", { nativeCasts: stage.casts("mirrormove", nativeCaster), nativeDamage: stage.damageBy(nativeCaster) });
                stage.done();
            }, "Supported native attack projection");
        }, "mirror lands");
    }, "mirrormove cast");
});
