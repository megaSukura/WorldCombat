/**
 * 草之誓约 / grasspledge 的可执行设计说明。
 *
 * 场面：一只会草之誓约的草系（Bulbasaur）隔着 5 格对一只低等级对手开战。
 * 必然事实：本招被提交过；草柱造成过伤害；目标被拖慢（`minecraft:slowness`）；地面留下盘根的租借草皮。
 * 命中几个、暴击、缠住时长、誓约印与共鸣（需另一元素的誓约印在附近，单招场景里造不出）写进 note。
 */
Smoke.scenario("grasspledge", function (stage) {
    stage.fill([-9, -1, -9], [9, -1, 9], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Bulbasaur", level: 42, moves: ["grasspledge"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "Rattata", level: 30, moves: ["splash"], at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("grasspledge", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(10, function () {
            stage.expect(stage.casts("grasspledge", caster) > 0, "grasspledge was committed");
            stage.expect(stage.damageTo(foe) > 0, "the grass pillar dealt damage");
            stage.expect(stage.hadMobEffect(foe, "minecraft:slowness"), "the pillar entangled and slowed the target");
            stage.expect(stage.changedBlocks().length > 0, "the pillar left a leased mossy tangle on the ground");
            stage.note("草柱命中、拖慢、地面留痕都是必然；命中几个、暴击、缠住时长与共鸣由局面决定。共鸣需要另一元素（火／水）的誓约印在落点附近，单招场景里无法合法制造，故不在此断言", {
                casts: stage.casts("grasspledge", caster),
                foeDamage: Math.round(stage.damageTo(foe) * 10) / 10,
                slowed: stage.hadMobEffect(foe, "minecraft:slowness"),
                changed: stage.changedBlocks().length
            });
            stage.done();
        });
    }, "grasspledge entangles its target");
});
