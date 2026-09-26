/**
 * 火之誓约 / firepledge 的可执行设计说明。
 *
 * 场面：一只会火之誓约的火系（Charmander）隔着 5 格对一只低等级对手开战，双方都只会这一招／跃起，
 *   逼出「立火柱、烧着柱内目标、柱脚留痕」这一幕。
 *
 * 断言只取必然事实：这招被提交过；火柱造成了伤害；目标被点燃（共享身份 `world_combat:status/burn`）。
 *   命中几个、暴击、誓约印停留与共鸣（需要另一元素的誓约印在附近，单招场景里造不出）写进 note 供读轨迹判断。
 *   火柱不再替换地表方块，柱脚焦痕只由粒子表达，故不再断言 changedBlocks。
 */
Smoke.scenario("firepledge", function (stage) {
    stage.fill([-9, -1, -9], [9, -1, 9], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Charmander", level: 42, moves: ["firepledge"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "Rattata", level: 30, moves: ["splash"], at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("firepledge", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(10, function () {
            stage.expect(stage.casts("firepledge", caster) > 0, "firepledge was committed");
            stage.expect(stage.damageTo(foe) > 0, "the fire pillar dealt damage");
            stage.expect(stage.hadMobEffect(foe, "world_combat:status/burn"), "the pillar set the target burning (shared status identity)");
            stage.note("火柱命中与点燃是必然；命中几个、暴击、誓约印半径与停留、共鸣由局面决定。单火印只是短寿共鸣标记、本身不持续灼烧，共鸣需要另一元素的誓约印（草／水）在落点附近，单招场景里无法合法制造，故不在此断言；柱脚焦痕只由粒子表达，不再替换地表方块", {
                casts: stage.casts("firepledge", caster),
                foeDamage: Math.round(stage.damageTo(foe) * 10) / 10,
                burned: stage.hadMobEffect(foe, "world_combat:status/burn")
            });
            stage.done();
        });
    }, "firepledge erupts and burns its target");
});
