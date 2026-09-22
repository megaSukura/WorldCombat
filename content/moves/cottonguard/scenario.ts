/**
 * 棉花防守 的可执行设计说明。
 *
 * 场面：一只只会「棉花防守」的毛辫羊与一只僵尸隔开 8 格、石质场地上开战。技能表里只有这一招，所以 AI 只能先裹绒衣。
 * 必然事实：本招被提交过；施术者身上出现过共享身份 world_combat:status/cottonguard 的绒衣窗口；
 *   默认「厚裹」的移速减益生效——移动速度属性低于裹身之前。
 * 具体裹了几层、防御等级抬了多少、绒衣撑多久，写进 note 供读轨迹判断（私有装配读不到原生能力等级）。
 */
Smoke.scenario("cottonguard", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "wooloo", level: 35, moves: ["cottonguard"], at: [0, 0, 0] });
    var baseSpeed = stage.attribute(caster, "minecraft:generic.movement_speed");
    var foe = stage.mob({ type: "minecraft:zombie", at: [8, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1000, function () {
        return stage.casts("cottonguard", caster) > 0
            && stage.hadMobEffect(caster, "world_combat:status/cottonguard")
            && stage.attribute(caster, "minecraft:generic.movement_speed") < baseSpeed - 0.001;
    }, function () {
        stage.expect(stage.casts("cottonguard", caster) > 0, "cotton guard was committed");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/cottonguard"), "the coat window carried the shared identity");
        stage.expect(stage.attribute(caster, "minecraft:generic.movement_speed") < baseSpeed - 0.001,
            "the default thick coat slowed the caster's movement speed");
        stage.after(60, function () {
            stage.note("cotton guard applied; the Defense stages are native and unreadable here, the thick coat's movement penalty is the visible trade-off", {
                casts: stage.casts("cottonguard", caster),
                speedBefore: baseSpeed,
                speedAfter: stage.attribute(caster, "minecraft:generic.movement_speed"),
                damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                alive: caster.alive()
            });
            stage.done();
        });
    }, "cotton guard engages");
});
