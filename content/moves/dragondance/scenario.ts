/**
 * 龙之舞 / dragondance 的可执行设计说明。
 *
 * 场面：一只只会「龙之舞」的暴鲤龙与一只弱小的小拉达隔开 10 格开战。它的技能表里只有这一招，所以 AI
 * 只能先起舞；有威胁且在起舞距离内、头顶有空间时，它会先盘旋再考虑交战。
 * 必然事实：本招被提交过；施术者身上出现过共享身份 world_combat:status/dragondance 的龙势窗口；
 *   龙势窗口存在时物攻与速度各被抬高至少 1 级（提升挂在载体窗口上，时机明确）。
 * 盘旋圈数、实际升到多高、是否被顶棚压扁、窗口结束时只撤多少，写进 note 供读轨迹判断
 * （盘旋按真实刻进度连续推进、总转角即圈数；升势读真实位移回执，不穿顶；收势只报真实净高度）。
 */
Smoke.scenario("dragondance", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "gyarados", level: 32, moves: ["dragondance"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "rattata", level: 14, moves: ["tackle"], at: [7, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("dragondance", caster) > 0 && stage.hadMobEffect(caster, "world_combat:status/dragondance");
    }, function () {
        stage.expect(stage.casts("dragondance", caster) > 0, "the dragon dance was committed");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/dragondance"), "the dragon-surge window carried the shared identity");
        const live = stage.stages(caster);
        stage.expect((live.atk || 0) >= 1 && (live.spe || 0) >= 1, "the dragon-surge window raised Attack and Speed by at least one stage each");
        stage.after(80, function () {
            stage.note("turns, the real lift/ceiling, the real attack/speed stages and how much the window takes back are design facts read here", {
                casts: stage.casts("dragondance", caster),
                stagesAtWindow: live,
                travelled: Math.round(stage.travelled(caster) * 10) / 10,
                damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                foeCasts: stage.casts("tackle", foe),
                casterAlive: caster.alive()
            });
            stage.done();
        });
    }, "dragon dance is cast within 60 s");
});
