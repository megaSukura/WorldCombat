/**
 * 装饰的可执行设计说明。
 *
 * 场面：一只只会装饰的霜奶仙（Alcremie）与一只僵尸队友（同队）在 3 格外；再往前 2 格是一只敌对僵尸。
 * 队友僵尸立刻去咬敌人（因此是共享观测里的「交战中」伙伴），AI 会走近到射程内，把装饰作为真实投射物送过去。
 * 必然事实：本招被提交过；缎带真正到达后，队友身上出现过共享身份 world_combat:status/decorated，物攻属性被抬高过。
 * 送了几件装饰、飞了多久、AI 是先送还是先挨打，随站位变化，写进 note 供读轨迹判断；
 * 被墙或别的身体挡下、或队友离场则不会加攻，这一支由代码路径与人工试玩覆盖。
 */
Smoke.scenario("decorate", function (stage) {
    stage.fill([-10, -1, -8], [14, -1, 8], "minecraft:stone");
    var caster = stage.pokemon({ species: "Alcremie", level: 50, moves: ["decorate"], at: [0, 0, 0] });
    var ally = stage.mob({ type: "minecraft:zombie", at: [3, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [5, 0, 0] });
    var attack0 = stage.attribute(ally, "minecraft:generic.attack_damage");
    stage.team("decorated", [caster, ally]);
    stage.hostile(caster, foe);
    stage.hostile(ally, foe);
    stage.until(1200, function () {
        return stage.casts("decorate", caster) > 0 && stage.hadMobEffect(ally, "world_combat:status/decorated");
    }, function () {
        stage.expect(stage.casts("decorate", caster) > 0, "decorate was committed");
        stage.expect(stage.hadMobEffect(ally, "world_combat:status/decorated"), "the ally carried the shared decorated identity");
        stage.expect(stage.attribute(ally, "minecraft:generic.attack_damage") > attack0 + 0.001, "the ally's Attack rose");
        stage.note("decorate observations", {
            casts: stage.casts("decorate", caster),
            allyAttack: [attack0, stage.attribute(ally, "minecraft:generic.attack_damage")],
            allyDecorated: stage.hadMobEffect(ally, "world_combat:status/decorated"),
            casterHealth: Math.round(caster.health() * 10) / 10,
            hurtBack: Math.round(stage.damageTo(caster) * 10) / 10
        });
        stage.done();
    }, "decorate lands on the ally");
});
