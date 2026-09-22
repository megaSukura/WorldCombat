/**
 * 毒液陷阱 / venomdrench 的可执行设计说明。
 *
 * 场面：一只只会「毒液陷阱」的阿柏蛇与一只**已经中毒**的伊布贴身开战。毒液只黏中毒的人，所以 AI 只在
 * 圈里有中毒的非友方时出手；伊布本身是普通系，不会被自身的毒类型免疫掉。
 * 必然事实：本招被提交过；中毒的目标身上出现过共享身份 world_combat:status/drenched 的印记。
 * 没中毒者是否只被淋湿、真实攻／特攻／速度等级与印记时长，都写进 note 供读轨迹判断
 * （私有装配没有读取原生能力等级的读取原语）。
 */
Smoke.scenario("venomdrench", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "ekans", level: 40, moves: ["venomdrench"], at: [0, 0, 0] });
    var foe = stage.pokemon({ species: "eevee", level: 20, moves: ["tackle"], at: [3, 0, 0], status: "poison" });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("venomdrench", caster) > 0 && stage.hadMobEffect(foe, "world_combat:status/drenched");
    }, function () {
        stage.expect(stage.casts("venomdrench", caster) > 0, "the venom drench was committed");
        stage.expect(stage.hadMobEffect(foe, "world_combat:status/drenched"), "the poisoned target carried the drenched identity");
        stage.note("deep vs shallow, whether a healthy bystander is only washed, the real Attack/Sp. Atk/Speed stages and the mark duration are design facts read here; the private assembly has no reader for native stat stages", {
            casts: stage.casts("venomdrench", caster),
            foeCasts: stage.casts("tackle", foe),
            foeHp: foe.health(), casterAlive: caster.alive(), casterHp: caster.health()
        });
        stage.done();
    }, "venom drench lands on the poisoned target within 60 s");
});
