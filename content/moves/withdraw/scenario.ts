/**
 * 缩入壳中 的可执行设计说明。
 *
 * 场面：一只只会「缩入壳中」的杰尼龟（20 级）与一只僵尸隔开 5 格、石质场地上开战；技能表里只有这一招。
 *   有威胁时它会收进壳里，僵尸随即来打——壳按次替它挡下来袭。
 * 必然事实：本招被提交过；施术者身上出现过共享身份 world_combat:status/withdraw 的壳窗口；
 *   壳在身时用世界已有的 world_combat:rooted 把施法者钉住，移动速度属性降到基础值以下。
 * 挡了几下、壳挡满没有写进 note 供读轨迹判断。
 */
Smoke.scenario("withdraw", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "squirtle", level: 20, moves: ["withdraw"], at: [0, 0, 0] });
    var baseSpeed = stage.attribute(caster, "minecraft:generic.movement_speed");
    var foe = stage.mob({ type: "minecraft:zombie", at: [5, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1000, function () {
        return stage.casts("withdraw", caster) > 0
            && stage.hadMobEffect(caster, "world_combat:status/withdraw")
            && stage.attribute(caster, "minecraft:generic.movement_speed") < baseSpeed - 0.001;
    }, function () {
        stage.expect(stage.casts("withdraw", caster) > 0, "withdraw was committed");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/withdraw"), "the shell window carried the shared identity");
        stage.expect(stage.attribute(caster, "minecraft:generic.movement_speed") < baseSpeed - 0.001,
            "the shell rooted the caster through the shared rooted effect");
        stage.after(60, function () {
            stage.note("the shell fully blocks the first few hostile hits (count from level and the deep-shallow choice), then cracks; the root lasts as long as the window and is released when the shell ends.", {
                casts: stage.casts("withdraw", caster),
                speedBefore: baseSpeed,
                speedAfter: stage.attribute(caster, "minecraft:generic.movement_speed"),
                damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                alive: caster.alive()
            });
            stage.done();
        });
    }, "withdraw engages");
});
