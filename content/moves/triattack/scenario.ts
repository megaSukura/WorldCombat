/**
 * 三重攻击 / triattack —— 可执行设计说明。
 *
 * 一句话：火、冰、电三束光线同时离手、各走各的，命中后各掷一次该元素的余痕（灼伤／冰冻／麻痹）。
 *
 * 场面：一只会三重攻击的多边兽（L40）对一只昏睡的小海狮（L30），相隔 7 格——已在射程内。
 *   昏睡让目标不躲不走，能清楚看到三束命中与余痕。地面铺平、白天晴天。
 *
 * 必然事实：本招被提交过；目标受到过至少一束的伤害。
 * 随机量写进 note：三束各掷一次余痕（每束约 20%%）、暴击、命中几束都是随机的；小海狮没有元素免疫。
 */
Smoke.scenario("triattack", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "porygon", level: 40, moves: ["triattack"], at: [-5, 0, 0] });
    var foe = stage.pokemon({ species: "slowpoke", level: 30, moves: ["tackle"], status: "sleep", at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1400, function () {
        return stage.casts("triattack", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(80, function () {
            stage.expect(stage.casts("triattack", caster) >= 1, "the caster committed triattack");
            stage.expect(stage.damageTo(foe) > 0, "at least one of the three rays dealt damage to the foe");
            stage.note("how many rays connect and which element marks land are random (about 20% per ray); slowpoke has no element immunity", {
                casts: stage.casts("triattack", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                burnt: stage.hadMobEffect(foe, "world_combat:status/burn"),
                frozen: stage.hadMobEffect(foe, "world_combat:status/frozen"),
                paralysed: stage.hadMobEffect(foe, "world_combat:status/paralysis"),
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "triattack lands at least one ray within 70 s");
});
