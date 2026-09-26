/**
 * 秘密之力的可执行设计说明：让会借力的一只精灵在草地上贴身打一名目标，验证它会沿瞄准方向突进、
 * 造成伤害。用原版僵尸当目标、石地打底、只在目标脚下铺一格草方块：目标不逃走、夜晚不燃烧，
 * 伤害只可能来自这一记借力，命中点的场所也就是这块草地。
 * 抽到什么场所状态、是否抽中，以及命中/暴击都是随机结果，写进 note。
 */
Smoke.scenario("secretpower", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.fill([-1, -1, -1], [1, -1, 1], "minecraft:grass_block");
    stage.time("night");
    stage.weather("clear");
    var sentret = stage.pokemon({ species: "sentret", level: 30, moves: ["secretpower"], at: [-4, 0, 0] });
    var zombie = stage.mob({ type: "minecraft:zombie", at: [0, 0, 0] });
    stage.hostile(sentret, zombie);
    stage.until(900, function () { return stage.casts("secretpower", sentret) > 0 && stage.damageTo(zombie) > 0; }, function () {
        stage.expect(stage.casts("secretpower", sentret) > 0, "秘密之力被放出来了");
        stage.expect(stage.damageTo(zombie) > 0, "借力一击打到了目标身上");
        stage.expect(stage.travelled(sentret) > 0, "借力的突进把施法者带向了目标");
        stage.note("目标脚下是草地（应抽睡眠）；追加是否抽中、以及命中/暴击都是随机结果。",
            { casts: stage.casts("secretpower", sentret), damage: stage.damageTo(zombie),
                slept: stage.hadMobEffect(zombie, "world_combat:status/sleep"), travelled: stage.travelled(sentret) });
        stage.done();
    }, "秘密之力命中并造成伤害");
});
