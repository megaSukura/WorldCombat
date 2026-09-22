/**
 * 电击 / thundershock —— 可执行设计说明。
 *
 * 一句话：一道贴身短促的电刺，瞬间扎上去；对已经麻痹的目标更狠并续麻。
 *
 * 场面：一只只会电击的磁怪（L45）对一只已麻痹、只会跃起的小海狮（L25），相隔 3 格——已在很短射程内。
 *   目标预先带麻痹，正好走「对已麻目标更狠并续麻」这条主线；只用跃起，避免它把施法者打死而中断观察。
 *   地面铺平、白天晴天。
 *
 * 必然事实：本招被提交过；目标受到过电刺伤害。
 * 随机量写进 note：未麻目标的麻痹掷、暴击，以及目标一开始带的麻痹是否已被同步成共享身份。
 */
Smoke.scenario("thundershock", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "magnemite", level: 45, moves: ["thundershock"], at: [-1, 0, 0] });
    var foe = stage.pokemon({ species: "slowpoke", level: 25, moves: ["splash"], status: "paralysis", at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("thundershock", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(60, function () {
            stage.expect(stage.casts("thundershock", caster) >= 1, "the caster committed thunder shock");
            stage.expect(stage.damageTo(foe) > 0, "the jolt dealt damage to the foe");
            stage.note("crit and the paralysis roll on an unparalysed target are random; the foe was staged already paralysed to exercise the stim branch and the top-up, but whether the staged native paralysis is mirrored into the shared identity can lag a few ticks", {
                casts: stage.casts("thundershock", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                sharedParalysis: stage.hadMobEffect(foe, "world_combat:status/paralysis"),
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "thunder shock lands on a foe within 60 s");
});
