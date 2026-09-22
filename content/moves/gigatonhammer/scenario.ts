/**
 * 巨力锤 / gigatonhammer —— 可执行设计说明。
 *
 * 一句话：一只巨锻匠（L60，原生学习者）旋身蓄力后把巨锤砸在站桩的卡比兽脚下，锤落造成伤害；砸完它短时间内
 *   不能再次抡锤——这就是原生「无法连续使出2次」。
 *
 * 场面：巨锻匠（tinkaton）只会巨力锤，卡比兽（snorlax）只会跃起、原地站桩，相隔 3 格——在射程内，
 *   巨锻匠可以直接起手；地面铺平、白天晴天。
 *
 * 必然事实：本招被提交过（`stage.casts`）；目标受到过伤害（`stage.damageTo`）；首次落锤后 60 刻内没有再被使出
 *   （禁复门禁——它在 60 刻内只有巨力锤一招可用，重试会被顶回去）。暴击、冲击波波及与顶开位移都是随机或配置结果，
 *   写进 note 供读轨迹判断。
 */
Smoke.scenario("gigatonhammer", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "tinkaton", level: 60, moves: ["gigatonhammer"], at: [-1.5, 0, 0] });
    var foe = stage.pokemon({ species: "snorlax", level: 60, moves: ["splash"], at: [1.5, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(2400, function () {
        return stage.casts("gigatonhammer", caster) >= 1;
    }, function () {
        stage.after(60, function () {
            stage.expect(stage.casts("gigatonhammer", caster) >= 1, "the caster committed gigatonhammer");
            stage.expect(stage.damageTo(foe) > 0, "gigatonhammer dealt damage to the foe");
            stage.expect(stage.casts("gigatonhammer", caster) === 1, "gigatonhammer could not be used twice in a row within the spent window");
            stage.note("the first slam is counted; within the spent window the only move it knows is rejected, so the count stays 1", {
                casts: stage.casts("gigatonhammer", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                foeAlive: foe.alive(),
                casterAlive: caster.alive(),
                block: stage.changedBlocks().length
            });
            stage.done();
        });
    }, "gigatonhammer lands within 120 s");
});
