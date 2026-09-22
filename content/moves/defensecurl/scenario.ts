/**
 * 变圆 的可执行设计说明。
 *
 * 场面：一只只会「变圆」的穿山鼠（20 级）与一只僵尸隔开 3 格、石质场地上开战；技能表里只有这一招，
 *   所以 AI 只能先卷成球。僵尸贴上来打它，触发滚动。
 * 必然事实：本招被提交过；施术者身上出现过共享身份 world_combat:status/defensecurl 的卷球窗口。
 * 滚动是受击触发的随机时机，滚了多远、挨了几下写进 note 供读轨迹判断。
 */
Smoke.scenario("defensecurl", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "sandshrew", level: 20, moves: ["defensecurl"], at: [0, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1000, function () {
        return stage.casts("defensecurl", caster) > 0
            && stage.hadMobEffect(caster, "world_combat:status/defensecurl");
    }, function () {
        stage.expect(stage.casts("defensecurl", caster) > 0, "defense curl was committed");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/defensecurl"), "the curled window carried the shared identity");
        stage.after(60, function () {
            stage.note("the curl is cheap and short; the roll on being hit moves the caster by the weight/speed-derived distance and leaves a dust trail, rate-limited so a multi-hit move does not push it away every hit.", {
                casts: stage.casts("defensecurl", caster),
                travelled: Math.round(stage.travelled(caster) * 10) / 10,
                damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                alive: caster.alive()
            });
            stage.done();
        });
    }, "defense curl engages");
});
