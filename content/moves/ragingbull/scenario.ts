/**
 * 怒牛 / ragingbull —— 可执行设计说明。
 *
 * 一句话：低头压角沿直线冲出去，撞开路上的一切，角尖把沿途的屏障整片震碎；属性随形态变化。
 *
 * 场面：一只只会怒牛的肯泰罗（36 级）对一只只会撞击的卡比兽（45 级）开战。厚血对手让它冲完还活着；
 * AI 只有这一招，必然会被放出来。
 * 必然事实：本招被提交过、目标受到过伤害、施法者真的冲出去过（位移格数 > 0.9）。
 * 撞到几个目标、震碎几层屏障、形态属性，随场面与形态变化，写进 note；碎壁与形态属性在完整装配里核对。
 */
Smoke.scenario("ragingbull", function (stage) {
    stage.fill([-10, -1, -8], [10, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    const caster = stage.pokemon({ species: "tauros", level: 36, moves: ["ragingbull"], at: [-3, 0, 0] });
    const foe = stage.pokemon({ species: "snorlax", level: 45, moves: ["tackle"], at: [4, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1400, function () {
        return stage.casts("ragingbull", caster) >= 1 && stage.damageTo(foe) > 0 && stage.travelled(caster) > 0.9;
    }, function () {
        stage.after(20, function () {
            stage.expect(stage.casts("ragingbull", caster) >= 1, "caster committed raging bull");
            stage.expect(stage.damageTo(foe) > 0, "raging bull dealt damage to the foe");
            stage.expect(stage.travelled(caster) > 0.9, "the caster really charged forward");
            stage.note("raging bull observations; the ward shatter and the form-typed damage need the full assembly", {
                casts: stage.casts("ragingbull", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                moved: Math.round(stage.travelled(caster) * 10) / 10,
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "raging bull charges and lands");
});
