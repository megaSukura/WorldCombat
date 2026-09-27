/**
 * 抢先一步的可执行设计说明。
 *
 * 场面：只会抢先一步的卡比兽对 6 格外、准备破坏光线的对手开战；观察当前真实准备并借用该执行。
 * 必然事实：抢先一步被提交过；守候中真的把卡比兽的电击波夺过来先打（damageBy(caster) 增长）。
 * 随机结果：实际夺到哪一手、守候了多久写进 note 供读轨迹判断。
 */
Smoke.scenario("mefirst", function (stage) {
    var caster = stage.pokemon({ species: "Snorlax", level: 60, moves: ["mefirst"], at: [-3, 0, 0] });
    var target = stage.pokemon({ species: "Snorlax", level: 30, moves: ["hyperbeam"], at: [3, 0, 0] });
    stage.hostile(caster, target);
    stage.note("staged: current standard hyperbeam preparation at 6 blocks; past damage does not trigger a copy");
    stage.until(1200, function () { return stage.casts("mefirst", caster) >= 1; }, function () {
        stage.expect(stage.casts("mefirst", caster) >= 1, "mefirst was committed");
        stage.note("mefirst committed; read the committed line to see which beat was stolen", {
            casts: stage.casts("mefirst", caster), damageByCaster: Math.round(stage.damageBy(caster) * 10) / 10
        });
        stage.until(1200, function () { return stage.damageBy(caster) > 0; }, function () {
            stage.expect(stage.damageBy(caster) > 0, "the stolen move was actually used by the caster");
            stage.note("the stolen beat landed as the caster's own attack", {
                damageByCaster: Math.round(stage.damageBy(caster) * 10) / 10, damageToTarget: Math.round(stage.damageTo(target) * 10) / 10
            });
            stage.command("kill " + target.ref.split("/")[0]);
            const nativeCaster = stage.pokemon({ species: "snorlax", level: 50, moves: ["mefirst"], at: [12, 0, 0] });
            const nativeFoe = stage.mob({ type: "minecraft:zombie", at: [14, 0, 0] });
            stage.time("night"); stage.hostile(nativeCaster, nativeFoe);
            stage.until(600, () => stage.casts("mefirst", nativeCaster) > 0 && stage.damageBy(nativeCaster) > 0, () => {
                stage.expect(stage.damageBy(nativeCaster) > 0, "The copied ordinary punch made real short-range contact");
                stage.note("Both the Pokemon recipe and supported native-contact branches were exercised", { nativeCasts: stage.casts("mefirst", nativeCaster), nativeDamage: stage.damageBy(nativeCaster) });
                stage.done();
            }, "Supported native attack projection");
        }, "stolen beat lands");
    }, "mefirst cast");
});
