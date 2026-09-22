/**
 * 破灭之光 / lightofruin 的可执行设计说明。
 *
 * 场面：会破灭之光的花洁夫人（Florges，妖精属性）在 5 格外、正前方一条线上摆两只被点住、不会还手的铁傀儡
 * （3 格间隔，都在光柱长度内），晴天平地。两只都是敌人。
 * 必然事实：本招被提交过；两个目标都受到过伤害（光柱贯穿整条线）；**施法者也受到过伤害**——
 * 反噬按实际造成的总伤害结算，靶子不还手，所以掉血只可能来自这一招自己。
 * 命中率、暴击、贯穿几个、反噬的具体数值随个体数据浮动，写进 note 供读轨迹判断。
 */
Smoke.scenario("lightofruin", function (stage) {
    stage.fill([-12, -1, -8], [12, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Florges", level: 50, moves: ["lightofruin"], at: [-5, 0, 0] });
    var first = stage.mob({ type: "minecraft:iron_golem", at: [0, 0, 0] });
    var second = stage.mob({ type: "minecraft:iron_golem", at: [3, 0, 0] });
    stage.command("execute as @e[type=minecraft:iron_golem,distance=..12] run data merge entity @s {NoAI:1b}");
    stage.hostile(caster, first);
    stage.hostile(caster, second);
    stage.until(1400, function () {
        return stage.casts("lightofruin", caster) > 0 && stage.damageTo(first) > 0 && stage.damageTo(second) > 0
            && stage.damageTo(caster) > 0;
    }, function () {
        stage.expect(stage.casts("lightofruin", caster) > 0, "lightofruin was committed");
        stage.expect(stage.damageTo(first) > 0 && stage.damageTo(second) > 0, "the ray pierced both bodies in the line");
        stage.expect(stage.damageTo(caster) > 0, "the user paid recoil proportional to the damage dealt");
        stage.note("反噬按实际造成的总伤害结算（默认约为一半），穿得越多自己越危险；打空或打在免疫上都不付账。命中率、暴击与贯穿人数随个体数据浮动。", {
            casts: stage.casts("lightofruin", caster),
            onFirst: Math.round(stage.damageTo(first) * 10) / 10,
            onSecond: Math.round(stage.damageTo(second) * 10) / 10,
            selfDamage: Math.round(stage.damageTo(caster) * 10) / 10,
            casterHp: caster.health()
        });
        stage.done();
    }, "lightofruin pierces the line and the user pays the recoil");
});
