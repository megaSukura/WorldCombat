// 真正的正阶梯消费、负阶梯保留和球体范围命中；窗口到期语义由中性共享回归覆盖。
Smoke.scenario("storedpower", function (stage) {
    stage.fill([-10, -1, -8], [10, -1, 8], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "espeon", level: 35, moves: ["storedpower"], at: [0, 0, 0] });
    var foeA = stage.pokemon({ species: "rattata", level: 12, moves: ["splash"], at: [2.2, 0, 0] });
    var foeB = stage.pokemon({ species: "rattata", level: 12, moves: ["splash"], at: [-2.2, 0, 0.4] });
    stage.hostile(caster, foeA);
    stage.hostile(caster, foeB);
    stage.after(1, function () {
        stage.boost(caster, { spa: 2, spe: -1 });
        stage.prefer(caster, "storedpower", { spend: true });
    });
    stage.until(900, function () {
        return stage.casts("storedpower", caster) > 0 && stage.damageTo(foeA) > 0 && stage.damageTo(foeB) > 0;
    }, function () {
        stage.after(16, function () {
            stage.expect(stage.casts("storedpower", caster) > 0, "espeon committed stored power");
            stage.expect(stage.damageTo(foeA) > 0 && stage.damageTo(foeB) > 0, "the nova caught both foes inside its ring");
            const stages = stage.stages(caster);
            stage.expect((stages.spa || 0) === 0 && stages.spe === -1, "spend consumed positive power while preserving the negative speed stage");
            stage.note("The sphere caught both foes; positive contributions were consumed once after the first successful release. Temporary-window expiry is covered by the neutral stage-consumption check.", {
                casts: stage.casts("storedpower", caster),
                foeADamage: Math.round(stage.damageTo(foeA) * 10) / 10,
                foeBDamage: Math.round(stage.damageTo(foeB) * 10) / 10,
                foeAMoved: Math.round(stage.travelled(foeA) * 10) / 10
            });
            stage.done();
        });
    }, "stored power releases over both foes within 45 s");
});
