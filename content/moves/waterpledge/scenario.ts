/**
 * 水之誓约 / waterpledge 的可执行设计说明。
 *
 * 场面：一只会水之誓约的水系（Squirtle）隔着 5 格对一只稍高等级的对手开战，逼出「水柱涌起、浇湿拖慢、
 *   把目标推开顶起、柱脚浸出水渍」这一幕。
 * 必然事实：本招被提交过；水柱造成过伤害；目标被拖慢（`minecraft:slowness`）；目标被水势推动了；
 *   地面留下浸水的租借水渍。命中几个、暴击、推开多远、誓约印与共鸣写进 note。
 */
Smoke.scenario("waterpledge", function (stage) {
    stage.fill([-9, -1, -9], [9, -1, 9], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Squirtle", level: 42, moves: ["waterpledge"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "Rattata", level: 30, moves: ["splash"], at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("waterpledge", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(12, function () {
            stage.expect(stage.casts("waterpledge", caster) > 0, "waterpledge was committed");
            stage.expect(stage.damageTo(foe) > 0, "the water pillar dealt damage");
            stage.expect(stage.hadMobEffect(foe, "minecraft:slowness"), "the pillar soaked and slowed the target");
            stage.expect(stage.travelled(foe) > 0, "the surge pushed the target");
            stage.expect(stage.changedBlocks().length > 0, "the pillar left a leased waterlogged scar on the ground");
            stage.note("水柱命中、拖慢、推开、地面留痕都是必然；命中几个、暴击、推开多远与共鸣由局面决定。共鸣需要另一元素（火／草）的誓约印在落点附近，单招场景里无法合法制造，故不在此断言", {
                casts: stage.casts("waterpledge", caster),
                foeDamage: Math.round(stage.damageTo(foe) * 10) / 10,
                slowed: stage.hadMobEffect(foe, "minecraft:slowness"),
                travelled: Math.round(stage.travelled(foe) * 10) / 10,
                changed: stage.changedBlocks().length
            });
            stage.done();
        });
    }, "waterpledge surges on its target");
});
