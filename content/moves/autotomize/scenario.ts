/**
 * 身体轻量化 的可执行设计说明。
 *
 * 场面：一只只会「身体轻量化」的大钢蛇（钢／地，400kg）与一只僵尸隔开 9 格、石质场地上开战。
 *   技能表里只有这一招，所以 AI 只能先卸件。
 * 必然事实：本招被提交过；施术者身上出现过共享身份 world_combat:status/lightened 的轻身窗口；
 *   轻身窗口内重力属性被下调——身体真的变轻了。
 * 具体卸了几件、残件是什么物品、抬了几级速度，写进 note 供读轨迹判断——它们取决于体重与随机数，
 * 私有装配也读不到原生能力等级与掉落物清单。
 */
Smoke.scenario("autotomize", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "steelix", level: 40, moves: ["autotomize"], at: [0, 0, 0] });
    var baseGravity = stage.attribute(caster, "minecraft:generic.gravity");
    var foe = stage.mob({ type: "minecraft:zombie", at: [9, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1000, function () {
        return stage.casts("autotomize", caster) > 0
            && stage.hadMobEffect(caster, "world_combat:status/lightened")
            && stage.attribute(caster, "minecraft:generic.gravity") < baseGravity - 0.0001;
    }, function () {
        stage.expect(stage.casts("autotomize", caster) > 0, "autotomize was committed");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/lightened"), "the light window carried the shared identity");
        stage.expect(stage.attribute(caster, "minecraft:generic.gravity") < baseGravity - 0.0001,
            "the light window reduced the caster's gravity");
        stage.after(80, function () {
            stage.note("autotomize applied; shed pieces are real drops and the Speed stages are native, so only the window and the lightness are judged here", {
                casts: stage.casts("autotomize", caster),
                gravityBefore: baseGravity,
                gravityAfter: stage.attribute(caster, "minecraft:generic.gravity"),
                travelled: Math.round(stage.travelled(caster) * 10) / 10,
                damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                alive: caster.alive()
            });
            stage.done();
        });
    }, "autotomize engages");
});
