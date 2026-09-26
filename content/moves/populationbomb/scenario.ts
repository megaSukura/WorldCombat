/**
 * 鼠数儿 / populationbomb 的可执行设计说明。
 *
 * 场面：只会鼠数儿的一对鼠（Tandemaus，30 级，原生真实学习者）隔着 4 格，对一只只会跃起、原地站桩的
 * 卡比兽（Snorlax，30 级）叫伙伴；晴天平地、通视无遮挡。必然事实：本招被提交过（`stage.casts`）；至少一只
 * 伙伴从队伍位置真实扑到并造成伤害（默认「鼠海」下命中率约 85%、每 60 秒内会多次施放）。实际连了几只、
 * 断在第几只、是否集满写进 note 供读轨迹判断。
 */
Smoke.scenario("populationbomb", function (stage) {
    stage.fill([-10, -1, -8], [10, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "tandemaus", level: 30, moves: ["populationbomb"], at: [-2, 0, 0] });
    var foe = stage.pokemon({ species: "snorlax", level: 30, moves: ["splash"], at: [2, 0, 0] });
    stage.hostile(caster, foe);
    var last = 0, lastHitAt = 0;
    stage.until(1600, function () {
        var now = stage.damageTo(foe);
        if (now > last) { last = now; lastHitAt = stage.tick(); }
        return stage.casts("populationbomb", caster) > 0 && lastHitAt > 0 && stage.tick() >= lastHitAt + 60;
    }, function () {
        stage.expect(stage.casts("populationbomb", caster) > 0, "population bomb was committed");
        stage.expect(stage.damageTo(foe) > 0, "at least one fellow connected");
        stage.note("伙伴在自己身边排出队伍后依次真实扑出：每只独立掷命中（掷空偏航），且只有真正撞上非友方活体才结算；扑空/撞墙/目标横移走开这一串就断。默认「鼠海」上限十只、命中率约 85%，实际只数随机。配置 swarm 关闭后上限更少、每下更重更准。连段长度与命中分布由完整装配的人工试玩核对。", {
            casts: stage.casts("populationbomb", caster),
            onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            foeAlive: foe.alive(),
            casterAlive: caster.alive()
        });
        stage.done();
    }, "a fellow pounces on a standing foe");
});
