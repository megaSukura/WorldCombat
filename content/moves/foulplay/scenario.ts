/**
 * 欺诈 / foulplay 的可执行设计说明。
 *
 * 一句话：借对手的力气打它——它越壮，这一记越重。
 *
 * 场面：一只物攻很低的勾魂眼（Sableye，暗／幽灵）只带这一招，对一只物攻极高的怪力（Machamp）开战，
 *   相隔 4 格；夜战避免无关的日光干扰，平地。
 * 必然事实：本招被提交过；怪力吃到过伤害。
 * 借来的力气有多大、是否触发纠缠的拖拽与踉跄、暴击与否写进 note，供读轨迹判断。
 */
Smoke.scenario("foulplay", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    var user = stage.pokemon({ species: "Sableye", level: 40, moves: ["foulplay"], at: [-2, 0, 0] });
    var foe = stage.pokemon({ species: "Machamp", level: 45, moves: ["tackle"], at: [2, 0, 0] });
    stage.hostile(user, foe);
    // 目标站定，让暗手沿释放时锁定的方向真实首碰；跑动会走位属于另行观察。
    stage.noai(foe);
    stage.until(1200, function () {
        return stage.casts("foulplay", user) > 0 && stage.damageBy(user) > 0;
    }, function () {
        stage.expect(stage.casts("foulplay", user) > 0, "foul play was committed");
        stage.expect(stage.damageTo(foe) > 0, "the borrowed strength dealt damage to the strong target");
        stage.note("foul play borrows the target's Attack; the damage the low-Attack caster dealt comes from Machamp's stat", {
            casts: stage.casts("foulplay", user),
            casterAttack: stage.attribute(user, "minecraft:generic.attack_damage"),
            foeAttack: stage.attribute(foe, "minecraft:generic.attack_damage"),
            dealt: Math.round(stage.damageBy(user) * 10) / 10,
            onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            foeMoved: Math.round(stage.travelled(foe) * 10) / 10
        });
        stage.done();
    }, "foul play lands");
});
