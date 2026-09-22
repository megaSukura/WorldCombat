/**
 * 自由落体 / skydrop —— 可执行设计说明。
 *
 * 一句话：贴身抓住一个对手，把它拎到空中停一段（这几刻它不能行动），再摔到地面上。
 *
 * 场面：会自由落体的大比鸟带这一招，站在一只轻量小敌前；小敌用撞击还手，逼出抓取与滞空的场面。
 * 目标选轻的（大比鸟起吊上限远高于它），保证抓取一定成功；体重上限那一条另见 note。
 *
 * 断言只取必然事实：这招被放过、目标挨到摔落伤害、目标身上出现过 world_combat:status/skydrop、
 * 双方都被提起过（travelled > 0）。暴击、抓取时长、落地高度系数写进 note 供读轨迹判断。
 */
Smoke.scenario("skydrop", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "pidgeot", level: 40, moves: ["skydrop"], at: [-2, 0, 0] });
    var target = stage.pokemon({ species: "rattata", level: 20, moves: ["tackle"], at: [2, 0, 0] });
    stage.hostile(caster, target);
    var castTick = 0;
    stage.until(1400, function () {
        if (castTick === 0 && stage.casts("skydrop", caster) >= 1) castTick = stage.tick();
        return castTick > 0 && stage.tick() >= castTick + 60 && stage.damageTo(target) > 0;
    }, function () {
        stage.expect(stage.casts("skydrop", caster) >= 1, "pidgeot committed skydrop");
        stage.expect(stage.damageTo(target) > 0, "the slam dealt damage");
        stage.expect(stage.hadMobEffect(target, "world_combat:status/skydrop"), "the carried target wore the skydrop identity");
        stage.expect(stage.travelled(target) > 0.5, "the target was moved off the ground");
        stage.note("crit, hold length and the height factor are random; the lift-cap refusal needs a heavy target and is not asserted here", {
            casts: stage.casts("skydrop", caster),
            damage: Math.round(stage.damageTo(target) * 10) / 10,
            targetTravel: Math.round(stage.travelled(target) * 10) / 10,
            alive: target.alive()
        });
        stage.done();
    }, "skydrop slams a light foe within 70 s");
});
