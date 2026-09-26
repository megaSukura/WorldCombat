/**
 * 大扫除 / tidyup 的可执行设计说明。
 *
 * 场面：一只只会「大扫除」的喵喵与一只只会「撞击」的小拉达隔开 9 格、石质场地上开战。喵喵的技能表里只有
 *   这一招，所以它会先扫一轮再考虑交战；有威胁且在扫除距离内时按整备节奏出手。
 * 必然事实：本招被提交过；施术者身上出现过共享身份 world_combat:status/tidyup 的轻快窗口；
 *   公共能力阶梯上物攻与速度各自真的被抬高了至少一级。
 *   说明：本单元的场景只装配自身，四条陷阱规则（撒菱等）与替身单元不在装配里，所以这里没有真实陷阱可扫；
 *   清场路径读 `world_combat:field` 的场地效果与替身承载，私有装配没有读取它们的断言原语。实际扫掉几件写进 note。
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
        const stages = stage.stages(caster);
        stage.expect((stages.atk || 0) >= 1, "tidy up really raised Attack on the shared ladder");
        stage.expect((stages.spe || 0) >= 1, "tidy up really raised Speed on the shared ladder");
        stage.after(90, function () {
            stage.note("no hazard or substitute unit is assembled in this private scene, so the clearing path runs against empty ground; the Attack/Speed ladder gain is asserted above", {
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
