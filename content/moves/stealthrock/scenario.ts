/**
 * 隐形岩 / stealthrock —— 可执行设计说明。
 *
 * 一句话：把一圈碎石抬到敌人所在地点悬浮起来，谁进入这片空域就被岩块砸中；它不要求目标落地。
 *
 * 场面：会隐形岩的化石翼龙带这一招；对面是一只铁傀儡（体积大、走得慢，会留在石阵里）。
 * 石阵中心落在铁傀儡身上，铁傀儡当场被砸。
 *
 * 断言只取必然事实：这招被放过、进入石阵的铁傀儡挨到伤害。相性倍率、暴击与落点写进 note。
 */
Smoke.scenario("stealthrock", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "aerodactyl", level: 40, moves: ["stealthrock"], at: [-5, 0, 0] });
    var heavy = stage.mob({ type: "minecraft:iron_golem", at: [1.5, 0, 0] });
    stage.hostile(caster, heavy);
    stage.until(900, function () {
        return stage.casts("stealthrock", caster) >= 1 && stage.damageTo(heavy) > 0;
    }, function () {
        stage.after(10, function () {
            stage.expect(stage.casts("stealthrock", caster) >= 1, "aerodactyl committed stealth rock");
            stage.expect(stage.damageTo(heavy) > 0, "the iron golem inside the stone field was struck");
            stage.note("rock effectiveness, crit and the exact landing spot are random; airborne coverage has no grounded check by design", {
                casts: stage.casts("stealthrock", caster),
                heavyDamage: Math.round(stage.damageTo(heavy) * 10) / 10,
                heavyAlive: heavy.alive()
            });
            stage.done();
        });
    }, "stealth rock strikes a foe within 30 s");
});
