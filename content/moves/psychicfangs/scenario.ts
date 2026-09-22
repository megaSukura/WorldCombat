/**
 * 精神之牙 / psychicfangs —— 可执行设计说明。
 *
 * 一句话：用意念把身体送出去一口咬住，咬伤目标并把咬合点周围的屏障咬碎吞成额外力道。
 *
 * 场面：一只只会精神之牙的磨牙彩皮鱼（34 级）对一只只会撞击的卡比兽（40 级）开战。厚血对手让它活到
 * 被咬第二口；AI 只有这一招，必然会被放出来。
 * 必然事实：本招被提交过、目标受到过伤害、施法者被意念送出去过（位移格数 > 0）。
 * 咬碎的屏障层数与随之追加的威力是依赖屏障的结果，写进 note；碎壁本身在完整装配的集成试玩里核对。
 */
Smoke.scenario("psychicfangs", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    const caster = stage.pokemon({ species: "bruxish", level: 34, moves: ["psychicfangs"], at: [-2, 0, 0] });
    const foe = stage.pokemon({ species: "snorlax", level: 40, moves: ["tackle"], at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1400, function () {
        return stage.casts("psychicfangs", caster) >= 1 && stage.damageTo(foe) > 0 && stage.travelled(caster) > 0.2;
    }, function () {
        stage.after(20, function () {
            stage.expect(stage.casts("psychicfangs", caster) >= 1, "caster committed psychic fangs");
            stage.expect(stage.damageTo(foe) > 0, "psychic fangs dealt damage to the foe");
            stage.expect(stage.travelled(caster) > 0.2, "the caster was carried forward by the lunge");
            stage.note("psychic fangs observations; the ward devour needs the full assembly (screen producers are other units)", {
                casts: stage.casts("psychicfangs", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                moved: Math.round(stage.travelled(caster) * 10) / 10,
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "psychic fangs lands");
});
