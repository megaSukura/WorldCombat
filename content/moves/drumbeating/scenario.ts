/**
 * 鼓击的可执行设计说明。
 *
 * 场面：一只只会鼓击的轰擂金刚猩（Rillaboom），对六格外的对手。鼓点让根须沿地面冲过去、在目标脚下破土。
 * 必然事实：本招被提交过；目标受到过鼓击伤害；目标身上出现过共享身份 rootbound。
 * 敲了几拍、破土根块是否留下、掉速级数，写进 note 供读轨迹判断。
 */
Smoke.scenario("drumbeating", function (stage) {
    const caster = stage.pokemon({ species: "Rillaboom", level: 40, moves: ["drumbeating"], at: [0, 0, 0] });
    const foe = stage.pokemon({ species: "Machop", level: 25, moves: ["tackle"], at: [6, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(800, function () {
        return stage.casts("drumbeating", caster) > 0 && stage.damageTo(foe) > 0 && stage.hadMobEffect(foe, "world_combat:status/rootbound");
    }, function () {
        stage.after(40, function () {
            stage.expect(stage.casts("drumbeating", caster) > 0, "drumbeating was committed");
            stage.expect(stage.damageTo(foe) > 0, "the drum beats dealt damage");
            stage.expect(stage.hadMobEffect(foe, "world_combat:status/rootbound"), "the target was rootbound");
            stage.note("rootbound is a timed identity from the final beat; roots are leased blocks and may not survive the target moving", {
                casts: stage.casts("drumbeating", caster), onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
                moved: Math.round(stage.travelled(caster) * 10) / 10, blocks: stage.changedBlocks().length
            });
            stage.done();
        });
    }, "drumbeating lands");
});
