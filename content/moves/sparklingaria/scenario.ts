/**
 * 泡影的咏叹调 / sparklingaria —— 可执行设计说明。
 *
 * 一句话：以自身为中心唱出一圈气泡，圈内的敌人被水压轰中，圈内别人身上的灼伤被洗净并回一点血。
 *
 * 场面：会这支歌的西狮海壬带这一招，站在一只**带着灼伤**的小敌前；小敌用撞击还手，逼出起唱与洗净的场面。
 *
 * 断言只取必然事实：这招被放过、目标挨到伤害、目标在被唱到之前身上确实带着共享灼伤身份、
 * 唱完之后灼伤身份消失。暴击、边缘衰减、回血量写进 note 供读轨迹判断。
 */
Smoke.scenario("sparklingaria", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "primarina", level: 40, moves: ["sparklingaria"], at: [-2, 0, 0] });
    var target = stage.pokemon({ species: "rattata", level: 20, moves: ["tackle"], at: [2, 0, 0], status: "burn" });
    stage.hostile(caster, target);
    var castTick = 0, sawBurn = false;
    stage.until(1400, function () {
        if (stage.hasMobEffect(target, "world_combat:status/burn")) sawBurn = true;
        if (castTick === 0 && stage.casts("sparklingaria", caster) >= 1) castTick = stage.tick();
        return castTick > 0 && stage.tick() >= castTick + 40 && stage.damageTo(target) > 0;
    }, function () {
        stage.expect(stage.casts("sparklingaria", caster) >= 1, "primarina committed sparkling aria");
        stage.expect(stage.damageTo(target) > 0, "the bubble wave dealt damage");
        stage.expect(sawBurn, "the target wore the shared burn identity before the aria");
        stage.expect(!stage.hasMobEffect(target, "world_combat:status/burn"), "the aria washed the burn away");
        stage.note("crit, the distance falloff and the cure heal amount are random; the cure only applies to the ring at the moment of the cast", {
            casts: stage.casts("sparklingaria", caster),
            damage: Math.round(stage.damageTo(target) * 10) / 10,
            sawBurn: sawBurn,
            stillBurned: stage.hasMobEffect(target, "world_combat:status/burn"),
            alive: target.alive()
        });
        stage.done();
    }, "sparkling aria hits and washes the target within 70 s");
});
