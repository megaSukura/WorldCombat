/**
 * 碎岩 / rocksmash —— 可执行设计说明。
 *
 * 一句话：贴脸连出几记快拳，收拳时若打实就有机会砸低对手防御。
 *
 * 场面：一只只会碎岩的怪力（55 级）对一只只会跃起的铁掌力士（60 级，只挨打不还手，血厚到挨得住多次施放）。
 * 断言只取必然事实：这招被提交过、目标受到过伤害。等多次施放是为了让 50–60% 的破防掷骰在轨迹里至少出现一次；
 * 破防本身仍是概率结果，写进 note。
 */
Smoke.scenario("rocksmash", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "machamp", level: 55, moves: ["rocksmash"], at: [-2, 0, 0] });
    var foe = stage.pokemon({ species: "hariyama", level: 60, moves: ["splash"], at: [4, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1600, function () {
        return stage.casts("rocksmash", caster) >= 4 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("rocksmash", caster) >= 1, "caster committed rock smash");
        stage.expect(stage.damageTo(foe) > 0, "rock smash dealt damage to the foe");
        stage.note("the crack is a 50% roll; the mark tag records whether it landed at all", {
            casts: stage.casts("rocksmash", caster),
            damage: Math.round(stage.damageTo(foe) * 10) / 10,
            cracked: stage.hadMobEffect(foe, "world_combat:status/guardbroken"),
            foeAlive: foe.alive()
        });
        stage.done();
    }, "rock smash lands within 80 s");
});
