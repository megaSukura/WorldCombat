/**
 * 毒液陷阱 / venomdrench 的可执行设计说明。
 *
 * 场面：一只只会「毒液陷阱」的阿柏蛇与一只**已经中毒**的伊布贴身开战；另有一只同样中毒、被实体方块挡在墙后的
 * 伊布（冻结不动）。毒液只黏中毒的人，而且会被真实方块挡住，所以 AI 在圈里有可削的中毒非友方时出手，
 * 墙后的那只不该被泼到。
 * 必然事实：本招被提交过；身前中毒的目标身上出现过共享身份 world_combat:status/drenched 的印记；
 * 墙后的中毒目标从未被泼到（墙面先挡下液体）。
 * 没中毒者是否只被淋湿、实际攻／特攻／速度等级与印记时长，都写进 note 供读轨迹判断
 * （私有装配没有读取原生能力等级的读取原语）。
 */
Smoke.scenario("venomdrench", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.fill([-3, 0, 1], [3, 3, 1], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "ekans", level: 40, moves: ["venomdrench"], at: [0, 0, 0] });
    var foe = stage.pokemon({ species: "eevee", level: 20, moves: ["tackle"], at: [2.5, 0, 0], status: "poison" });
    var behind = stage.pokemon({ species: "eevee", level: 20, moves: ["tackle"], at: [0, 0, 3], status: "poison" });
    stage.noai(behind);
    stage.hostile(caster, foe);
    stage.hostile(caster, behind);
    stage.until(1200, function () {
        return stage.casts("venomdrench", caster) > 0 && stage.hadMobEffect(foe, "world_combat:status/drenched");
    }, function () {
        stage.expect(stage.casts("venomdrench", caster) > 0, "the venom drench was committed");
        stage.expect(stage.hadMobEffect(foe, "world_combat:status/drenched"), "the poisoned target in front carried the drenched identity");
        stage.expect(!stage.hadMobEffect(behind, "world_combat:status/drenched"), "the solid wall stopped the pour to the poisoned target behind it");
        stage.note("deep vs shallow, whether a healthy bystander is only washed, the real Attack/Sp. Atk/Speed stages and the mark duration are design facts read here; the private assembly has no reader for native stat stages", {
            casts: stage.casts("venomdrench", caster),
            foeCasts: stage.casts("tackle", foe),
            foeHp: foe.health(), casterAlive: caster.alive(), casterHp: caster.health(),
            behindHp: behind.health()
        });
        stage.done();
    }, "venom drench lands on the poisoned target within 60 s");
});
