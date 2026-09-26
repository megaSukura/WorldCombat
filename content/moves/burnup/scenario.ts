/**
 * 燃尽 / burnup 的可执行设计说明。
 *
 * 一句话：把全身的火一次喷出去，喷完自己不再是火属性。
 *
 * 场面：一只火暴兽（Typhlosion，纯火）只带这一招，对 5 格外的厚血陪练（Snorlax）开战；夜战、平地。
 * 必然事实：本招被提交过；卡比兽吃到过白焰的伤害；施法者身上出现过燃尽身份 world_combat:status/burned_out。
 * 首发放出后是否还能再放（ready 应当拒绝）、锥内是否烧到多个目标、暴击与否写进 note，供读轨迹判断。
 */
Smoke.scenario("burnup", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    var user = stage.pokemon({ species: "Typhlosion", level: 40, moves: ["burnup"], at: [-2.5, 0, 0] });
    var foe = stage.pokemon({ species: "Snorlax", level: 55, moves: ["tackle"], at: [2.5, 0, 0] });
    stage.hostile(user, foe);
    stage.until(1400, function () {
        return stage.casts("burnup", user) > 0 && stage.damageBy(user) > 0;
    }, function () {
        stage.after(40, function () {
            stage.expect(stage.casts("burnup", user) > 0, "burn up was committed");
            stage.expect(stage.damageTo(foe) > 0, "the white fire dealt damage");
            stage.expect(stage.hadMobEffect(user, "world_combat:status/burned_out"), "the user became burned out");
            stage.expect(stage.casts("burnup", user) === 1, "The consumed Fire identity blocked another cast during the spent window");
            stage.note("burn out strips the Fire type via a shared NativeModifiers types layer for the effect's lifetime; the ready gate then refuses another cast", {
                casts: stage.casts("burnup", user),
                dealt: Math.round(stage.damageBy(user) * 10) / 10,
                onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
                burnedOut: stage.hasMobEffect(user, "world_combat:status/burned_out"),
                tick: stage.tick()
            });
            stage.done();
        });
    }, "burn up fires and burns the caster out");
});
