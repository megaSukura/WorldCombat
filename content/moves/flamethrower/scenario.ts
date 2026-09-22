/**
 * 喷射火焰 / flamethrower 的可执行设计说明。
 *
 * 场面：只会喷射火焰的喷火龙（Charizard）对五格外只带跃起、不会还手的卡比兽（Snorlax），晴天平地。
 * 必然事实：本招被提交过（`stage.casts`）；目标受到过伤害（火舌推进到它身上）。
 * 引燃是 10% 起的概率（本单元 burnChance 公式）、命中数、暴击见实现，写进 note 供读轨迹判断。
 */
Smoke.scenario("flamethrower", function (stage) {
    stage.fill([-9, -1, -9], [9, -1, 9], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Charizard", level: 48, moves: ["flamethrower"], at: [-4, 0, 0] });
    var foe = stage.pokemon({ species: "Snorlax", level: 40, moves: ["splash"], at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1000, function () {
        return stage.casts("flamethrower", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("flamethrower", caster) > 0, "flamethrower was committed");
        stage.expect(stage.damageTo(foe) > 0, "the flame reached and scorched the foe");
        stage.note("引燃约 10% 起（flamethrower.burnChance）、暴击与扇面/集束命中数随机", {
            casts: stage.casts("flamethrower", caster),
            onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            burned: stage.hadMobEffect(foe, "world_combat:status/burn"),
            foeAlive: foe.alive()
        });
        stage.done();
    }, "flamethrower sweeps a foe in front");
});
