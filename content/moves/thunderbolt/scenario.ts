/**
 * 十万伏特 / thunderbolt —— 可执行设计说明。
 *
 * 一句话：先射出一束沿瞄准线推进的主电，命中后从命中者向最近的邻敌分叉传导。
 *
 * 场面：一只只会十万伏特的磁怪（L40）对一只昏睡的小海狮（L30），相隔 8 格——已在射程内，不必先接近；
 *   另放一只紧挨着的小海狮，并把主人的「扩散式」打开，让主束真实命中后能长出第一条短电链（边长约 1 格、
 *   在主爆范围内且通视）。昏睡让目标不动，主束沿固定线必中；地面铺平、白天晴天。
 *
 * 必然事实：本招被提交过；主目标受到过主束伤害；紧邻的副目标受到过电链伤害。
 * 随机量写进 note：麻痹掷（约 10%%）与暴击；链的其它分支、后续施放的目标都不写死。
 */
Smoke.scenario("thunderbolt", function (stage) {
    stage.fill([-10, -1, -8], [10, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "magnemite", level: 40, moves: ["thunderbolt"], at: [-4, 0, 0] });
    var foe = stage.pokemon({ species: "slowpoke", level: 30, moves: ["tackle"], status: "sleep", at: [4, 0, 0] });
    var neighbour = stage.pokemon({ species: "slowpoke", level: 30, moves: ["tackle"], status: "sleep", at: [4, 0, 1] });
    stage.hostile(caster, foe);
    stage.hostile(caster, neighbour);
    // 偏好写入需要一个可用的现场世界作用域，出生后下一拍再写（与既有的偏好场景一致）。
    stage.after(5, function () { stage.prefer(caster, "thunderbolt", { spread: true }); });
    stage.until(1200, function () {
        return stage.casts("thunderbolt", caster) >= 1 && stage.damageTo(foe) > 0 && stage.damageTo(neighbour) > 0;
    }, function () {
        stage.after(60, function () {
            stage.expect(stage.casts("thunderbolt", caster) >= 1, "the caster committed thunderbolt");
            stage.expect(stage.damageTo(foe) > 0, "the main beam dealt damage to the foe");
            stage.expect(stage.damageTo(neighbour) > 0, "the spread chain reached the adjacent foe");
            stage.note("spread mode is staged on; crit and the ~10% paralysis roll stay random, and how many further branches grow depends on what is still within reach", {
                casts: stage.casts("thunderbolt", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                chainDamage: Math.round(stage.damageTo(neighbour) * 10) / 10,
                foeParalysed: stage.hadMobEffect(foe, "world_combat:status/paralysis"),
                foeAlive: foe.alive(),
                neighbourAlive: neighbour.alive()
            });
            stage.done();
        });
    }, "thunderbolt beams and branches within 60 s");
});
