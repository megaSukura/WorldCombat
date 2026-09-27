/**
 * 守住的执行设计说明。
 *
 * 场面：石质场地、白天晴空。两只只会「守住」的护城龙（bastiodon，40 级）站在近处，一只设守据、一只设瞬罩；
 *   6 格外一只僵尸（NoAI，只作伤害来源）与两者敌对，但被钉住不动，好让打击时点由场景自己控制。
 *
 * 必然事实：两种姿态都被提交过；守据档在撑罩期间被 rooted（移动速度读数被压到低于基准，rooted 的临时属性修饰可被读到），
 *   瞬罩档不 root（速度不变）；两种姿态都在罩还在时完整挡下一次受控打击（damageTo 不增加）；
 *   随后对守据档注入一次足以耗尽护盾总量的重击，穹顶提前碎裂，本次自己挂上的定身随即松开（速度回到基准），
 *   施术者仍存活——超出的伤害落到本体，而不是继续留在穹顶里。
 * 罩的真实半径、容量与画面亮度写进 note；smoke API 读不到 guard 本身，穹顶的真实罩径与观感留给人工试玩核对。
 */
Smoke.scenario("protect", function (stage) {
    stage.fill([-10, -1, -10], [10, -1, 10], "minecraft:stone");
    stage.fill([-10, 0, -10], [10, 6, 10], "minecraft:air");
    stage.weather("clear");
    stage.time("day");

    var braced = stage.pokemon({ species: "bastiodon", level: 40, moves: ["protect"], at: [-2, 0, 0] });
    var instant = stage.pokemon({ species: "bastiodon", level: 40, moves: ["protect"], at: [2, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [6, 0, 0] });
    stage.team("protect-check", [braced, instant]);
    stage.noai(foe);

    var baseSpeed = stage.attribute(braced, "minecraft:generic.movement_speed");
    var instantSpeed = stage.attribute(instant, "minecraft:generic.movement_speed");
    // 新建的宝可梦要等下一刻原生数据备好，才写偏好并宣战；这样也保证两档在真的敌对之后才可能起罩。
    stage.after(2, function () {
        stage.prefer(braced, "protect", { braced: true });
        stage.prefer(instant, "protect", { braced: false });
        stage.hostile(braced, foe);
        stage.hostile(instant, foe);
    });

    var bracedRooted = false, instantRooted = false;
    stage.until(1200, function () {
        if (stage.attribute(braced, "minecraft:generic.movement_speed") < baseSpeed - 0.0001) bracedRooted = true;
        if (stage.attribute(instant, "minecraft:generic.movement_speed") < instantSpeed - 0.0001) instantRooted = true;
        return stage.casts("protect", braced) >= 1 && stage.casts("protect", instant) >= 1 && bracedRooted;
    }, function () {
        stage.expect(stage.casts("protect", braced) >= 1, "the braced caster committed protect");
        stage.expect(stage.casts("protect", instant) >= 1, "the instant caster committed protect");
        stage.expect(bracedRooted, "the braced dome rooted its caster while it held");
        stage.expect(!instantRooted, "the instant dome let its caster keep moving");

        // 两顶罩都还在：同一击分别被两边完整挡下，damageTo 不增加。
        var beforeBraced = stage.damageTo(braced), beforeInstant = stage.damageTo(instant);
        stage.hurt(braced, 6, "minecraft:generic", { source: foe });
        stage.hurt(instant, 6, "minecraft:generic", { source: foe });
        stage.after(3, function () {
            stage.expect(stage.damageTo(braced) <= beforeBraced + 0.001, "the braced dome blocked the blow");
            stage.expect(stage.damageTo(instant) <= beforeInstant + 0.001, "the instant dome blocked the blow");

            // 补满生命，再注入一次远大于护盾总量的重击：护盾耗尽即碎，本次定身必须立刻松开，本体仍活着。
            var uuid = braced.ref.split("/")[0];
            stage.command("effect give " + uuid + " minecraft:instant_health 1 10 true");
            var maximum = stage.attribute(braced, "minecraft:generic.max_health");
            stage.after(3, function () {
                stage.hurt(braced, maximum * 1.6, "minecraft:generic", { source: foe });
                stage.after(2, function () {
                    stage.expect(braced.alive(), "the braced caster survived the shattered dome");
                    stage.expect(stage.attribute(braced, "minecraft:generic.movement_speed") >= baseSpeed - 0.0001,
                        "the shattered dome released the braced root instead of holding it for the whole window");
                    stage.note("protect keeps a personal pool that blocks enemy-source damage (capacity ~24 + 0.35*health + 0.35*Defence, "
                        + "braced x1.15), roots only in the braced stance, and releases that root the moment the dome shatters; damage beyond the "
                        + "remaining pool lands on the body. The dome radius formula (1.7 + 0.6*(height-1.4) blocks, clamped 1.6..3.4) and the "
                        + "hold brightness (remaining/initial) are read from the real carrier but the smoke API cannot see the guard, so the true "
                        + "dome radius on a large body is left to playtest.", {
                        bracedCasts: stage.casts("protect", braced), instantCasts: stage.casts("protect", instant),
                        baseSpeed: baseSpeed, bracedSpeed: stage.attribute(braced, "minecraft:generic.movement_speed"),
                        instantSpeedNow: stage.attribute(instant, "minecraft:generic.movement_speed"),
                        bracedHealth: braced.health(), instantHealth: instant.health(),
                        bracedDamageTaken: Math.round(stage.damageTo(braced) * 10) / 10,
                        instantDamageTaken: Math.round(stage.damageTo(instant) * 10) / 10,
                        bracedAlive: braced.alive(), instantAlive: instant.alive(),
                        tick: stage.tick()
                    });
                    stage.done();
                });
            });
        });
    }, "both protect stances engage within 60 s");
});
