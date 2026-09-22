/**
 * 虚张声势的可执行设计说明。
 *
 * 场面：一只只会虚张声势的喵喵与一只敌人僵尸相隔 7 格开战。僵尸会走近并近战，必然打到喵喵；
 * 喵喵的攻击礼物与混乱都会落在僵尸身上。没有墙，保证双方视线相通、AI 能读到威胁。
 * 必然事实：本招被提交过；僵尸被挂上共享身份 world_combat:status/confusion；礼物让它的攻击属性升高；
 * 它随后打中喵喵时被怒火反噬（damageTo(僵尸) > 0，且喵喵只有这一招、不结算任何伤害）。
 * 出手挥空（混乱的随机失手）在这只僵尸身上不出现（原版近战不走技能提交），写进 note。
 */
Smoke.scenario("swagger", function (stage) {
    var caster = stage.pokemon({ species: "Meowth", level: 32, moves: ["swagger"], at: [0, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [7, 0, 0] });
    var before = stage.attribute(foe, "minecraft:generic.attack_damage");
    stage.hostile(caster, foe);
    stage.until(800, function () {
        return stage.casts("swagger") > 0
            && stage.hadMobEffect(foe, "world_combat:status/confusion")
            && stage.attribute(foe, "minecraft:generic.attack_damage") > before + 0.001
            && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("swagger") > 0, "swagger was committed");
        stage.expect(stage.hadMobEffect(foe, "world_combat:status/confusion"), "the target was confused");
        stage.expect(stage.attribute(foe, "minecraft:generic.attack_damage") > before + 0.001, "the attack gift landed");
        stage.expect(stage.damageTo(foe) > 0, "the enraged target hurt itself");
        stage.note("swagger observations", {
            casts: stage.casts("swagger"),
            attackBefore: before,
            attackAfter: stage.attribute(foe, "minecraft:generic.attack_damage"),
            recoilOnFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            moved: Math.round(stage.travelled(foe) * 10) / 10
        });
        stage.done();
    }, "swagger lands and the target recoils");
});
