/**
 * 以牙还牙 / payback —— 可执行设计说明。
 *
 * 一句话：迎上去回击；目标在自己被击中的窗口内先动过手时，这一记翻倍。
 *
 * 场面：一只物攻手贴到三格外对一只低等级对手，只带这一招；平地、夜晚，避免日光与地形干扰读数。
 * 断言只取必然事实：这招被提交过、目标受过伤害。翻倍条件（目标在窗口内先打过施法者）取决于谁先动手，
 * 写进 note 供读轨迹判断。
 */
Smoke.scenario("payback", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    const caster = stage.pokemon({ species: "krookodile", level: 48, moves: ["payback"], at: [-2, 0, 0], properties: "nature=adamant" });
    const target = stage.pokemon({ species: "rattata", level: 25, moves: ["tackle"], at: [1.5, 0, 0] });
    stage.hostile(caster, target);
    // 固定靶：让短迎步在确定距离内可达，读数不被逃跑走位干扰。
    stage.noai(target);
    stage.until(600, function () { return stage.casts("payback", caster) >= 1 && stage.damageTo(target) > 0; }, function () {
        stage.expect(stage.casts("payback", caster) >= 1, "krookodile committed payback");
        stage.expect(stage.damageTo(target) > 0, "the counter blow dealt damage");
        stage.note("whether the target had already struck the caster inside the window (and so the doubling) is positional and random; the step-in shows as movedBy while the strike lands on the actually reached foe", {
            casts: stage.casts("payback", caster),
            dealt: Math.round(stage.damageBy(caster) * 10) / 10,
            taken: Math.round(stage.damageTo(caster) * 10) / 10,
            targetDamage: Math.round(stage.damageTo(target) * 10) / 10,
            movedBy: Math.round(stage.travelled(caster) * 10) / 10,
            tick: stage.tick()
        });
        stage.done();
    }, "payback lands on the target within 30 s");
});
