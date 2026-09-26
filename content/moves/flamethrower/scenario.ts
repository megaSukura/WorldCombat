/**
 * 喷射火焰 / flamethrower 的可执行设计说明。
 *
 * 场面：只会喷射火焰的喷火龙（Charizard）对六格外只带跃起、不会还手的卡比兽（Snorlax），晴天平地。
 * 必然事实：本招被提交过（`stage.casts`）；目标受到过伤害（火舌推进到它身上、至少吃下一份接触脉冲）。
 * 引燃是约 10%（本单元整窗 burnChance）折到每份的概率、实际命中份数、暴击见实现，写进 note 供读轨迹判断。
 */
Smoke.scenario("flamethrower", function (stage) {
    stage.fill([-9, -1, -9], [9, -1, 9], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Charizard", level: 48, moves: ["flamethrower"], at: [-4, 0, 0] });
    var foe = stage.pokemon({ species: "Snorlax", level: 40, moves: ["splash"], at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("flamethrower", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("flamethrower", caster) > 0, "flamethrower was committed");
        stage.expect(stage.damageTo(foe) > 0, "the sustained jet scorched the foe");
        stage.note("持续喷窗分 4 次接触脉冲、每目标整次最多 4 份；引燃约 10%（flamethrower.burnChance 折每份）、暴击与命中份数随机", {
            casts: stage.casts("flamethrower", caster),
            onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            burned: stage.hadMobEffect(foe, "world_combat:status/burn"),
            foeAlive: foe.alive()
        });
        stage.done();
    }, "flamethrower sweeps a foe in front");
});
