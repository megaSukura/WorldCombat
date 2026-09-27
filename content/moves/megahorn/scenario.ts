/**
 * 超级角击的可执行设计说明。
 *
 * 场面：只会超级角击的赫拉克罗斯（Heracross，长角重刺）对着被点住、不会走开的铁傀儡（体型高大、耐打，临时抬高最大生命
 * 保证一次角刺打不死，才能观察到深植），晴天平地，初始距离约 3 格（角程内）。默认配置为深植式。
 * 必然事实：本招被提交过（`stage.casts`）；目标受到过伤害（角线贯穿）；目标被残刺减速过（`minecraft:slowness`）。
 * 一次命中（窄线与长蓄势是位置判定）、目标被真正推动的距离，写进 note 供读轨迹判断。
 * 若第一刺直接打死目标，设计上不再挂减速、也不留刺——这条由代码里的存活检查保证，不在本场景断言。
 */
Smoke.scenario("megahorn", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Heracross", level: 40, moves: ["megahorn"], at: [-1.5, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [1.5, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..8,limit=1] {NoAI:1b}");
    // 抬高最大生命并回满：一次角刺打不死，深植的减速才有机会被观察到。
    stage.command("attribute @e[type=minecraft:iron_golem,distance=..8,limit=1] minecraft:generic.max_health 400");
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..8,limit=1] {Health:400f}");
    stage.until(1200, function () {
        return stage.casts("megahorn", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(60, function () {
            stage.expect(stage.casts("megahorn", caster) > 0, "megahorn was committed");
            stage.expect(stage.damageTo(foe) > 0, "the horn pierce dealt damage");
            stage.expect(stage.hadMobEffect(foe, "minecraft:slowness"), "the residual barb slowed the foe");
            stage.note("深植式把残刺留在伤口里减速；窄角线是位置判定，蓄势期对手可走开", {
                casts: stage.casts("megahorn", caster),
                onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
                foeMoved: Math.round(stage.travelled(foe) * 10) / 10,
                onCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "megahorn lands its narrow horn line on a planted foe");
});
