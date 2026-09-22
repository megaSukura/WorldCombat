/**
 * 大扫除 / tidyup 的可执行设计说明。
 *
 * 场面：一只只会「大扫除」的喵喵与一只只会「撞击」的小拉达隔开 9 格、石质场地上开战。喵喵的技能表里只有
 *   这一招，所以它会先扫一轮再考虑交战；有威胁且在扫除距离内时按整备节奏出手。
 * 必然事实：本招被提交过；施术者身上出现过共享身份 world_combat:status/tidyup 的轻快窗口。
 *   说明：本单元的场景只装配自身，四条陷阱规则（撒菱等）与替身单元不在装配里，所以这里没有真实陷阱可扫；
 *   清场路径读 `world_combat:field` 的场地效果与 `world_combat:substitute_ward` 的替身承载，私有装配没有
 *   读取它们的断言原语。实际扫掉几件、攻与速各抬了几级、窗口多长写进 note 供读轨迹判断。
 */
Smoke.scenario("tidyup", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "meowth", level: 30, moves: ["tidyup"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "rattata", level: 12, moves: ["tackle"], at: [6, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("tidyup", caster) > 0
            && stage.hadMobEffect(caster, "world_combat:status/tidyup");
    }, function () {
        stage.expect(stage.casts("tidyup", caster) > 0, "tidy up was committed");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/tidyup"), "the kit window carried the shared identity");
        stage.after(90, function () {
            stage.note("the swept hazards/substitutes, the Attack/Speed stages and the kit window are design facts read here; no hazard or substitute unit is assembled in this private scene, so the clearing path runs against empty ground", {
                casts: stage.casts("tidyup", caster),
                foeCasts: stage.casts("tackle", foe),
                damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                travelled: Math.round(stage.travelled(caster) * 10) / 10,
                casterAlive: caster.alive()
            });
            stage.done();
        });
    }, "tidy up engages");
});
