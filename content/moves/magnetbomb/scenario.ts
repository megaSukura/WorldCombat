/**
 * 磁铁炸弹 / magnetbomb —— 可执行设计说明。
 *
 * 一句话：钢弹吸住活体后各自计时起爆；撞到方块则以撞点做一枚静止炸弹，引信由独立于发射动作的 actor 级效果持有，
 * 发射动作结束后仍会起爆。
 *
 * 两场同时进行（相距 20 格以上，互不干扰）：
 *   A. 活体附着：一次付费发射把主目标吸满钢弹并致死，溅射落到旁边的旁观者，且溅射回执晚于主目标死亡回执。
 *   B. 撞块留弹：一堵墙隔开施法者与被屏蔽的敌人，另有一个可见诱饵让 AI 出手；分投给墙后敌人的钢弹撞墙成为静止炸弹。
 *      发射动作结束后引信才走完，墙后敌人吃到溅射。断言只取必然事实：一次付费发射、墙弹爆炸后墙后敌人受过伤。
 * 数值、暴击、墙弹数量与具体贴点写进 note 供读轨迹判断。
 */
Smoke.scenario("magnetbomb", function (stage) {
    stage.fill([-24, -1, -12], [24, -1, 12], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");

    // A. 活体附着：主目标必定、旁观者吃溅射。
    var caster = stage.pokemon({ species: "magnezone", level: 40, moves: ["magnetbomb"], at: [10, 0, 0] });
    var primary = stage.mob({ type: "minecraft:husk", at: [15, 0, 0] });
    var bystander = stage.mob({ type: "minecraft:silverfish", at: [15, 0, 0.8] });
    stage.noai(primary, bystander);

    // B. 撞块留弹：高个子施法者给出满爆炸半径；墙挡住墙后敌人，诱饵在墙外侧给 AI 一个可见目标。
    stage.fill([-16, 0, -6], [-16, 5, 6], "minecraft:stone");
    var wallCaster = stage.pokemon({ species: "onix", level: 40, moves: ["magnetbomb"], at: [-21, 0, 0] });
    var wallLure = stage.mob({ type: "minecraft:husk", at: [-19, 0, -4] });
    var wallFoe = stage.mob({ type: "minecraft:silverfish", at: [-14.7, 0, 0] });
    stage.noai(wallLure, wallFoe);

    stage.after(20, function () {
        stage.command("data merge entity " + primary.ref.split("/")[0] + " {Health:1.0f}");
        stage.command("attribute " + bystander.ref.split("/")[0] + " minecraft:generic.max_health base set 1000");
        stage.command("data merge entity " + bystander.ref.split("/")[0] + " {Health:1000.0f}");
        stage.command("attribute " + wallLure.ref.split("/")[0] + " minecraft:generic.max_health base set 1000");
        stage.command("data merge entity " + wallLure.ref.split("/")[0] + " {Health:1000.0f}");
        stage.command("attribute " + wallFoe.ref.split("/")[0] + " minecraft:generic.max_health base set 1000");
        stage.command("data merge entity " + wallFoe.ref.split("/")[0] + " {Health:1000.0f}");
        stage.prefer(caster, "magnetbomb", { cluster: true });
        stage.setPp(caster, "magnetbomb", 1);
        stage.prefer(wallCaster, "magnetbomb", { cluster: false });
        stage.setPp(wallCaster, "magnetbomb", 1);
        stage.expect(caster.alive() && primary.health() === 1 && bystander.health() === 1000 &&
            wallLure.health() === 1000 && wallFoe.health() === 1000,
            "the lethal primary, surviving bystander, visible wall lure and shielded wall enemy are staged");
        stage.provoke(caster, primary);
        stage.provoke(wallCaster, wallLure);

        var livingDone = false, wallDone = false;
        function maybeFinish(): void { if (livingDone && wallDone) stage.done(); }

        stage.until(600, function () { return stage.hits(primary, true) > 0; }, function () {
            stage.after(1, function () {
                var receipts = stage.damageEvents(), primaryAt = -1, splashAt = -1;
                for (var i = 0; i < receipts.length; i++) {
                    if (receipts[i].from !== caster.name) continue;
                    if (receipts[i].to === primary.name && primaryAt < 0) primaryAt = i;
                    if (receipts[i].to === bystander.name && splashAt < 0) splashAt = i;
                }
                stage.expect(stage.casts("magnetbomb", caster) === 1, "one paid cast owns the primary hit and its aftermath");
                stage.expect(stage.hadMobEffect(primary, "world_combat:status/magnetbomb"), "the primary carried the fused charge before detonation");
                stage.expect(!stage.hadMobEffect(bystander, "world_combat:status/magnetbomb"), "the bystander receives splash rather than an attached bomb");
                stage.expect(!primary.alive() && stage.hits(primary, true) === 1, "the first primary hit is lethal");
                stage.expect(bystander.alive() && stage.damageTo(bystander) > 0, "the surviving bystander receives splash after the lethal primary hit");
                stage.expect(primaryAt >= 0 && splashAt > primaryAt, "the splash receipt follows the primary death receipt");
                stage.note("living-target charge; particle appearance remains a playtest observation.", {
                    primaryDamage: stage.damageTo(primary), bystanderDamage: stage.damageTo(bystander),
                    primaryAlive: primary.alive(), bystanderAlive: bystander.alive(), receipts: receipts
                });
                livingDone = true; maybeFinish();
            });
        }, "living-target charge owns a lethal primary hit and its splash");

        stage.until(600, function () { return stage.casts("magnetbomb", wallCaster) >= 1; }, function () {
            var castAt = stage.tick();
            stage.after(120, function () {
                stage.expect(stage.casts("magnetbomb", wallCaster) === 1, "one paid cast owns the wall charge");
                stage.expect(stage.hits(wallFoe, true) >= 1 && stage.damageTo(wallFoe) > 0,
                    "the wall charge detonated after the launch action ended");
                stage.note("a block-stuck charge must outlive its launch action; splash reached the shielded enemy long after commit", {
                    castAt: castAt, observedAt: stage.tick(), foeHits: stage.hits(wallFoe, true),
                    foeDamage: Math.round(stage.damageTo(wallFoe) * 10) / 10, foeAlive: wallFoe.alive(),
                    lureAlive: wallLure.alive(), wallCasterAlive: wallCaster.alive()
                });
                wallDone = true; maybeFinish();
            });
        }, "block-stuck charge fires its fuse after the launch action");
    });
});
