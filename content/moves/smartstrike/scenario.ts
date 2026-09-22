/**
 * 修长之角 / smartstrike —— 可执行设计说明。
 *
 * 一句话：锁定对手后带着长角一路拐过去扎进甲缝；角追着人修正方向，所以躲不掉，甲越硬咬得越深。
 *
 * 场面：一只长角突刺者对七格外的硬壳对手（锁定距离之内，让它拐着角追上去）。场地铺平，白天晴天。
 * 断言只取必然事实：这招被提交过、目标受过修长之角伤害。暴击、转向修正是否追上移动写进 note 供读轨迹判断。
 */
Smoke.scenario("smartstrike", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "samurott", level: 40, moves: ["smartstrike"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "golem", level: 30, moves: ["tackle"], at: [4, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1000, function () {
        return stage.casts("smartstrike", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(80, function () {
            stage.expect(stage.casts("smartstrike", caster) >= 1, "caster committed smart strike");
            stage.expect(stage.damageTo(foe) > 0, "smart strike dealt damage to the foe");
            stage.note("crit and how far the homing charge had to steer are positional/random", {
                casts: stage.casts("smartstrike", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                movedBy: Math.round(stage.travelled(caster) * 10) / 10,
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "smart strike lands on a foe within 50 s");
});
