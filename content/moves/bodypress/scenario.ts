/**
 * 扑击的可执行设计说明。
 *
 * 场面：一只身板厚实的精灵（Machop）对 2.5 格外的一只厚血精灵（Snorlax，只会撞击）开战。选厚血对手是为了
 * 让目标在挨过第一顶后仍然活着，顶推（位移）才能被观察到；夜晚避免无关的日光灼烧污染伤害统计。
 * 双方敌对，AI 只有这些招可用。
 * 必然事实：本招被提交过；目标受到过伤害（顶实）；施法者移动过（推进了整段距离）。
 * 目标被顶推了多远、暴击、是否被障碍提前拦下，都是位置结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("bodypress", function (stage) {
    stage.time("night");
    var caster = stage.pokemon({ species: "Machop", level: 32, moves: ["bodypress"], at: [0, 0, 0] });
    var foe = stage.pokemon({ species: "Snorlax", level: 34, moves: ["tackle"], at: [2.5, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("bodypress") > 0 && stage.damageTo(foe) > 0 && stage.travelled(caster) > 0.5;
    }, function () {
        stage.after(40, function () {
            stage.expect(stage.casts("bodypress") > 0, "bodypress was committed");
            stage.expect(stage.damageTo(foe) > 0, "the body press dealt damage");
            stage.expect(stage.travelled(caster) > 0.5, "the caster advanced while pressing");
            stage.note("bodypress observations", { casts: stage.casts("bodypress"), onFoe: stage.damageTo(foe),
                moved: Math.round(stage.travelled(caster) * 10) / 10, foeMoved: Math.round(stage.travelled(foe) * 10) / 10,
                hurtBack: stage.damageTo(caster) });
            stage.done();
        });
    }, "bodypress lands and drives");
});
