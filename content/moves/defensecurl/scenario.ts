/**
 * 变圆 的可执行设计说明。
 *
 * 场面：一只只会「变圆」的穿山鼠（20 级）与一只僵尸隔开 3 格、石质场地上开战；技能表里只有这一招，
 *   所以 AI 只能先卷成球。僵尸贴上来打它，触发滚动。
 * 必然事实：本招被提交过；施术者身上出现过共享身份 world_combat:status/defensecurl 的卷球窗口。
 *   滚动是受击（且为真实直接攻击）触发的随机时机，滚了多远、挨了几下写进 note 供读轨迹判断。
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
            stage.note("the curl is cheap and short; only a real hostile direct attack rolls the caster, and the roll sweeps its weight/speed-derived distance in 2-4 ticks along the horizontal incoming direction (a wall stops it short). DoT ticks and off-axis shooters never pull the body upward, and the rate limit keeps a multi-hit move from pushing it away every hit.", {
                casts: stage.casts("defensecurl", caster),
                travelled: Math.round(stage.travelled(caster) * 10) / 10,
                damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                alive: caster.alive()
            });
            stage.done();
        });
    }, "defense curl engages");
});
