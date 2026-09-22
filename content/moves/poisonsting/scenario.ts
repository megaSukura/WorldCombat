/**
 * 毒针 / poisonsting —— 可执行设计说明。
 *
 * 一句话：甩出一发廉价的远程细针，扎中后毒在伤口里慢慢渗开。
 *
 * 场面：一只只会毒针的线球（spinarak，L30，原生学习者）对一只只会跃起、站桩的卡比兽（snorlax，L30），
 *   相隔 7 格——在射程内，AI 可以直接点射；地面铺平、白天晴天。
 *
 * 必然事实：本招被提交过（`stage.casts`）；目标受到过针尖伤害（`stage.damageTo`）。
 * 随机量写进 note：中毒概率（原生 30%%，受特攻与倒钩针影响）、暴击、以及渗毒延迟后的结果，供读轨迹判断。
 */
Smoke.scenario("poisonsting", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "spinarak", level: 30, moves: ["poisonsting"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "snorlax", level: 30, moves: ["splash"], at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("poisonsting", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(80, function () {
            stage.expect(stage.casts("poisonsting", caster) >= 1, "the caster committed poison sting");
            stage.expect(stage.damageTo(foe) > 0, "poison sting dealt damage to the foe");
            stage.note("poison is a seep roll after the needle lands (native 30%%, shifted by special attack); crit is variable too", {
                casts: stage.casts("poisonsting", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                foePoisoned: stage.hadMobEffect(foe, "world_combat:status/poison"),
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "poison sting hits a foe within 60 s");
});
