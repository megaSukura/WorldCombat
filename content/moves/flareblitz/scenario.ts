/**
 * 闪焰冲锋 / flareblitz 的可执行设计说明。
 *
 * 场面：会闪焰冲锋的风速狗（Arcanine）对一只只会跃起、不会还手的鲤鱼王（Magikarp）。
 * 必然事实：本招被提交过；它命中过靶子且施法者因此掉过血（反作用力）。
 * 命中 100，但冲空仍可能发生（被目标移开或撞墙），所以轮询等到至少命中一次。
 * 是否点着目标（默认约 10%）是概率结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("flareblitz", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "arcanine", level: 45, moves: ["flareblitz"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "magikarp", level: 20, moves: ["splash"], at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("flareblitz", caster) > 0 && stage.damageTo(caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("flareblitz", caster) > 0, "flareblitz was committed");
        stage.expect(stage.damageTo(foe) > 0, "the burning charge landed");
        stage.expect(stage.damageTo(caster) > 0, "the recoil hurt the user");
        stage.note("灼伤是概率结果（默认约 10%），这里只记录是否被点着", {
            casts: stage.casts("flareblitz", caster),
            onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            selfDamage: Math.round(stage.damageTo(caster) * 10) / 10,
            burning: stage.hadMobEffect(foe, "world_combat:status/burn"),
            casterHp: caster.health(),
            foeAlive: foe.alive()
        });
        stage.done();
    }, "flareblitz lands, burns or not, and the recoil costs the user");
});
