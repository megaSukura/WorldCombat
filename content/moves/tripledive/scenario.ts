/**
 * 三连钻 / tripledive 的可执行设计说明。
 *
 * 场面：只会三连钻的轻身鳕（Veluza，35 级，原生唯一学习者）贴着 2 格，对一只只会跃起、厚血的卡比兽
 * （Snorlax，35 级）连钻；晴天平地。必然事实：本招被提交过（`stage.casts`）；至少一钻真实接触命中并造成伤害；
 * 命中必定把目标打湿——只要伤害 > 0，共享身份「湿透」（`world_combat:status/soaked`）就必定被加上过。
 * 三钻各中几下、落点是否真实、两跳之间的换点都写进 note 供读轨迹判断。
 */
Smoke.scenario("tripledive", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "veluza", level: 35, moves: ["tripledive"], at: [-1, 0, 0] });
    var foe = stage.pokemon({ species: "snorlax", level: 35, moves: ["splash"], at: [1, 0, 0] });
    stage.hostile(caster, foe);
    // 钻击距离很短；把对手冻在原地，让各跳都能在可达范围内真实起落。
    stage.noai(foe);
    var last = 0, lastHitAt = 0;
    stage.until(1500, function () {
        var now = stage.damageTo(foe);
        if (now > last) { last = now; lastHitAt = stage.tick(); }
        return stage.casts("tripledive", caster) > 0 && lastHitAt > 0 && stage.tick() >= lastHitAt + 40;
    }, function () {
        stage.expect(stage.casts("tripledive", caster) > 0, "triple dive was committed");
        stage.expect(stage.damageTo(foe) > 0, "at least one dive connected");
        stage.expect(stage.hadMobEffect(foe, "world_combat:status/soaked"), "a landed dive soaked the target through the shared identity");
        stage.note("每次施放固定三钻，每钻是真实身体短弧：落点取真实地面支撑，先升后降；只有下降首次碰到敌体、或真正落地后水花半径内有通视的敌人才结算，上升段穿过敌体不计钻。落点悬空或被友体/侧墙停在半空时不假落地、不隔墙补伤。已经湿透（或本来淋湿/泡水）的目标吃到 soakBonus 倍威力。三钻命中数与实际落点由完整装配的人工试玩核对。", {
            casts: stage.casts("tripledive", caster),
            onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            moved: Math.round(stage.travelled(caster) * 10) / 10,
            soaked: stage.hadMobEffect(foe, "world_combat:status/soaked"),
            foeAlive: foe.alive()
        });
        stage.done();
    }, "triple dive lands on a foe at close range");
});
