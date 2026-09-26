/**
 * 地狱翻滚 / submission 的可执行设计说明。
 *
 * 场面：会地狱翻滚的豪力（Machoke）对一只只会跃起、不会还手、血厚到摔不死的卡比兽（Snorlax），贴身开战。
 * 必然事实（开阔地的可搬动分支）：本招被提交过；它抓住过目标（`world_combat:submission_grip` 事件）、把目标摔伤过
 * （`damageTo(foe) > 0`）、给目标挂上过倒地（`world_combat:submission_pin`），且施法者自己因此反噬掉血（`damageTo(caster) > 0`）。
 * 靶子不还手且血厚，所以前几项不会因目标死亡而丢失；摔击与压制的具体数值写进 note 供读轨迹判断。
 * 推不动（贴墙等）时只播角力接触、不按倒的分支不是这块开阔场地里必然发生的，留给人工试玩验证。
 */
Smoke.scenario("submission", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Machoke", level: 45, moves: ["submission"], at: [-2, 0, 0] });
    // 血厚、只带跃起：能扛住多次摔击，抓取/倒地状态能被观察到，且不会误伤施法者。
    var foe = stage.pokemon({ species: "Snorlax", level: 45, moves: ["splash"], at: [2, 0, 0] });
    stage.hostile(caster, foe);
    // 抓取与倒地的事件在效果挂上的下一个 tick 才到；等到两者都被看到再断言，避免同 tick 竞态。
    stage.until(1400, function () {
        return stage.casts("submission", caster) > 0 && stage.damageTo(foe) > 0 && stage.damageTo(caster) > 0
            && stage.hadMobEffect(foe, "world_combat:submission_grip") && stage.hadMobEffect(foe, "world_combat:submission_pin");
    }, function () {
        stage.expect(stage.casts("submission", caster) > 0, "submission was committed");
        stage.expect(stage.hadMobEffect(foe, "world_combat:submission_grip"), "the user grabbed the target");
        stage.expect(stage.hadMobEffect(foe, "world_combat:submission_pin"), "the target was slammed and pinned down");
        stage.expect(stage.damageTo(foe) > 0, "the slam dealt damage to the target");
        stage.expect(stage.damageTo(caster) > 0, "the user took recoil from diving to the ground");
        stage.note("扑抓有 80 命中对应的即时判定；抓空不反噬，抓中才有 grip→slam 两拍", {
            casts: stage.casts("submission", caster),
            onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            selfDamage: Math.round(stage.damageTo(caster) * 10) / 10,
            gripped: stage.hadMobEffect(foe, "world_combat:submission_grip"),
            pinned: stage.hadMobEffect(foe, "world_combat:submission_pin"),
            casterHp: caster.health(),
            foeAlive: foe.alive()
        });
        stage.done();
    }, "submission grabs, slams, pins and the user pays the recoil");
});
