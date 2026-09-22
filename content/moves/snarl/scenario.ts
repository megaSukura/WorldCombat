/**
 * 大声咆哮 / snarl —— 可执行设计说明。
 *
 * 一句话：施法者朝身前一锥连喝几声，锥内两只铁傀儡各自挨到伤害，先被喝中的那只带上被斥身份。
 *
 * 场面：一只只会大声咆哮的黑鲁加（houndour，L35，原生学习者之一）站在两只铁傀儡前方，隔着几格开战；
 *   铁傀儡落地慢、抗击退，用来核对「锥形范围同时罩住两只」与「第一个命中的脉冲挂上被斥身份」。
 *   地面铺平、夜晚、晴天（铁傀儡不怕日晒，也不会被锥外的因素干扰）。
 *
 * 断言只取必然事实：本招被提交过（`stage.casts`）、至少一只目标挨到伤害（`stage.damageTo`）、
 *   被喝中的目标身上出现过共享身份 world_combat:status/snarled。连斥还是断喝、命中几声、
 *   特攻掉几级、暴击都是随机或配置结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("snarl", function (stage) {
    stage.fill([-10, -1, -8], [10, -1, 8], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "houndour", level: 35, moves: ["snarl"], at: [-4, 0, 0] });
    var near = stage.mob({ type: "minecraft:iron_golem", at: [2, 0, -1] });
    var far = stage.mob({ type: "minecraft:iron_golem", at: [2, 0, 1] });
    stage.hostile(caster, near);
    stage.hostile(caster, far);
    stage.until(900, function () {
        return stage.casts("snarl", caster) > 0
            && (stage.damageTo(near) > 0 || stage.damageTo(far) > 0)
            && (stage.hadMobEffect(near, "world_combat:status/snarled") || stage.hadMobEffect(far, "world_combat:status/snarled"));
    }, function () {
        stage.after(30, function () {
            stage.expect(stage.casts("snarl", caster) > 0, "houndour committed snarl");
            stage.expect(stage.damageTo(near) > 0 || stage.damageTo(far) > 0, "the shout bit at least one target");
            stage.expect(stage.hadMobEffect(near, "world_combat:status/snarled") || stage.hadMobEffect(far, "world_combat:status/snarled"),
                "a scolded identity landed on a target");
            stage.note("number of barks, who stood inside the cone on each bark, the Sp. Atk stage drop and crits are random/positional/config results", {
                casts: stage.casts("snarl", caster),
                nearDamage: Math.round(stage.damageTo(near) * 10) / 10,
                farDamage: Math.round(stage.damageTo(far) * 10) / 10,
                snarledNear: stage.hadMobEffect(near, "world_combat:status/snarled"),
                snarledFar: stage.hadMobEffect(far, "world_combat:status/snarled"),
                nearAlive: near.alive(), farAlive: far.alive(), casterAlive: caster.alive()
            });
            stage.done();
        });
    }, "snarl scolds a target within 45 s");
});
