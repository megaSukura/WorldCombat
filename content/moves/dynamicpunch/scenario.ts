/**
 * 爆裂拳 / dynamicpunch 的可执行设计说明。
 *
 * 场面：会爆裂拳的怪力（Machamp）对一只血厚、只带跃起、不会还手的鲤鱼王（Wailmer），背后立一堵石砖墙。
 * 必然事实：本招被提交过；目标受到过伤害；**被打中的目标一定带上了共享混乱身份**（扫中必定混乱，
 * 不受概率影响）。扇面是位置判定，靶子不躲就会被罩住。
 * 血厚靶子活过这一抡，所以“必定混乱”这条断言能稳定验证。
 */
Smoke.scenario("dynamicpunch", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Machamp", level: 36, moves: ["dynamicpunch"], at: [-2, 0, 0] });
    var foe = stage.pokemon({ species: "Wailmer", level: 30, moves: ["splash"], at: [1.5, 0, 0] });
    stage.fill([3, 0, -1], [3, 2, 1], "minecraft:stone_bricks");
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("dynamicpunch", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        // 效果事件比伤害晚一拍进入观察，等两拍再读共享混乱身份。
        stage.after(3, function () {
            stage.expect(stage.casts("dynamicpunch", caster) > 0, "dynamicpunch was committed");
            stage.expect(stage.damageTo(foe) > 0, "the wide swing dealt damage to the foe that stayed in the fan");
            stage.expect(stage.hadMobEffect(foe, "world_combat:status/confusion"), "the swept target always carries the shared confusion identity");
            stage.note("扇面是位置判定：走出扇面就不吃这一抡；扫中必定挂共享混乱身份，靶子会因此失手并自伤", {
                casts: stage.casts("dynamicpunch", caster),
                onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
                confused: stage.hadMobEffect(foe, "world_combat:status/confusion"),
                onCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "dynamicpunch lands on the target");
});
