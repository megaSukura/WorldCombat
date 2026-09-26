/**
 * 三连钻 / tripledive 的可执行设计说明。
 *
 * 场面：只会三连钻的轻身鳕（Veluza，35 级，原生唯一学习者）贴着 2 格，对一只只会跃起、厚血的卡比兽
 * （Snorlax，35 级）连钻；晴天平地。必然事实：本招被提交过（`stage.casts`）；至少一钻真实接触命中并造成伤害；
 * 命中必定把目标打湿——只要伤害 > 0，「湿透」（`world_combat:status/drenched`）就必定被加上过。
 * 三钻各中几下、湿身加成与两跳之间的换点，写进 note 供读轨迹判断。
 */
Smoke.scenario("tripledive", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "veluza", level: 35, moves: ["tripledive"], at: [-1, 0, 0] });
    var foe = stage.pokemon({ species: "snorlax", level: 35, moves: ["splash"], at: [2, 0, 0] });
    stage.hostile(caster, foe);
    var last = 0, lastHitAt = 0;
    stage.until(1500, function () {
        var now = stage.damageTo(foe);
        if (now > last) { last = now; lastHitAt = stage.tick(); }
        return stage.casts("tripledive", caster) > 0 && lastHitAt > 0 && stage.tick() >= lastHitAt + 40;
    }, function () {
        stage.expect(stage.casts("tripledive", caster) > 0, "triple dive was committed");
        stage.expect(stage.damageTo(foe) > 0, "at least one dive connected");
        stage.expect(stage.hadMobEffect(foe, "world_combat:status/drenched"), "a landed dive drenched the target");
        stage.note("每次施放固定三钻，每钻是真实身体短弧：当刻自由瞄准的落点被限制在 diveSpan 内，逐刻移动，下落首次碰到敌体或落地水花范围内有敌人才结算。已经湿透的目标吃到 soakBonus 倍威力，所以三钻都命中同一目标时后一钻更重。三钻命中数与实际落点由完整装配的人工试玩核对。", {
            casts: stage.casts("tripledive", caster),
            onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            moved: Math.round(stage.travelled(caster) * 10) / 10,
            drenched: stage.hadMobEffect(foe, "world_combat:status/drenched"),
            foeAlive: foe.alive()
        });
        stage.done();
    }, "triple dive lands on a foe at close range");
});
