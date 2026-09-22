/**
 * 十万伏特 / thunderbolt —— 可执行设计说明。
 *
 * 一句话：把电压成一团沿直线射出去，命中处炸开一片电网；扩散式下电花再分摊给旁边的人。
 *
 * 场面：一只只会十万伏特的磁怪（L40）对一只昏睡的小海狮（L30），相隔 8 格——已在射程内，不必先接近；
 *   昏睡让弹体有一个不躲的目标，用来看清「飞行电弹命中并造成伤害」这条主线。地面铺平、白天晴天。
 *
 * 必然事实：本招被提交过；目标受到过电弹伤害。
 * 随机量写进 note：麻痹掷（约 10%%）与暴击；扩散式的溅射要目标旁边有人才看得到，本场景只放了一个目标。
 */
Smoke.scenario("thunderbolt", function (stage) {
    stage.fill([-10, -1, -8], [10, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "magnemite", level: 40, moves: ["thunderbolt"], at: [-4, 0, 0] });
    var foe = stage.pokemon({ species: "slowpoke", level: 30, moves: ["tackle"], status: "sleep", at: [4, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("thunderbolt", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(60, function () {
            stage.expect(stage.casts("thunderbolt", caster) >= 1, "the caster committed thunderbolt");
            stage.expect(stage.damageTo(foe) > 0, "the bolt dealt damage to the foe");
            stage.note("crit and the ~10% paralysis roll are random; the spread splash needs a neighbour, and this arena has only one target", {
                casts: stage.casts("thunderbolt", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                foeParalysed: stage.hadMobEffect(foe, "world_combat:status/paralysis"),
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "thunderbolt lands on a foe within 60 s");
});
