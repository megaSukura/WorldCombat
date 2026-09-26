// 细雪的可执行设计说明：一只只会细雪的冰系宝可梦朝身前两个挤在一起的敌人吹出一片扇面雪霰。
// 必然事实：本招被提交过；至少一个敌人受到过伤害（扇面瞬发，范围内未被掩体挡住的目标不会落空）；
// 本招不留下任何持续场地。
// 具体吹到几个、冰冻是否触发（概率）、推退与位移都写进 note 供读轨迹判断。
Smoke.scenario("powdersnow", function (stage) {
    stage.fill([-10, -1, -8], [10, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "glaceon", level: 38, moves: ["powdersnow"], at: [-3, 0, 0] });
    var front = stage.pokemon({ species: "rattata", level: 16, moves: ["tackle"], at: [1, 0, 0] });
    var side = stage.pokemon({ species: "rattata", level: 16, moves: ["tackle"], at: [1.6, 0, 0.9] });
    stage.hostile(caster, front);
    stage.hostile(caster, side);
    stage.until(900, function () {
        return stage.casts("powdersnow", caster) >= 1 && stage.damageTo(front) + stage.damageTo(side) > 0;
    }, function () {
        stage.expect(stage.casts("powdersnow", caster) >= 1, "glaceon committed powder snow");
        stage.expect(stage.damageTo(front) + stage.damageTo(side) > 0, "the fan dealt damage");
        stage.expect(stage.changedBlocks().length === 0, "the fan leaves no lingering field");
        stage.note("how many the fan caught, the freeze roll, the push and cover blocking are positional/random", {
            casts: stage.casts("powdersnow", caster),
            frontDamage: Math.round(stage.damageTo(front) * 10) / 10,
            sideDamage: Math.round(stage.damageTo(side) * 10) / 10,
            frontFrozen: stage.hadMobEffect(front, "world_combat:status/frozen"),
            changed: stage.changedBlocks().length,
            casterMoved: Math.round(stage.travelled(caster) * 10) / 10
        });
        stage.done();
    }, "powder snow lands on a foe within 45 s");
});
