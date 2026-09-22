/**
 * 波动冲 / wavecrash 的可执行设计说明。
 *
 * 场面：会波动冲的浮潜鼬（Floatzel）对 4.5 格外只会跃起、不会还手的卡比兽（Snorlax），双方贴身开战。
 * 选厚血、不还手的靶子：目标挨过一撞仍活着，湿身身份才能被观察到；施法者的掉血也只可能来自这一招的反震。
 * 必然事实：本招被提交过；目标受到过伤害（水墙撞实）；目标身上出现过共享身份
 * `world_combat:status/soaked`（命中即浇湿，与水流裂破、水流尾共用同一身份）；施法者自己也受到过伤害（反震）。
 * 是否在湿身下施放、暴击与冲开距离，写进 note 供读轨迹判断。
 */
Smoke.scenario("wavecrash", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var soaked = "world_combat:status/soaked";
    var caster = stage.pokemon({ species: "Floatzel", level: 36, moves: ["wavecrash"], at: [-2.5, 0, 0] });
    // 靶子只带跃起、不会还手：施法者的掉血只可能来自这一招的反震。
    var foe = stage.pokemon({ species: "Snorlax", level: 36, moves: ["splash"], at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("wavecrash", caster) > 0 && stage.damageTo(foe) > 0 && stage.hadMobEffect(foe, soaked);
    }, function () {
        stage.expect(stage.casts("wavecrash", caster) > 0, "wavecrash was committed");
        stage.expect(stage.damageTo(foe) > 0, "the wave dealt damage to the target");
        stage.expect(stage.hadMobEffect(foe, soaked), "the wave left the target soaked");
        stage.expect(stage.damageTo(caster) > 0, "the user paid recoil for the hit");
        stage.note("命中即浇上共享身份 world_combat:status/soaked；施法者湿透（雨里/水里）时威力与射程更高、反伤更轻；反震数值由防御与体重决定", {
            casts: stage.casts("wavecrash", caster),
            onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            selfDamage: Math.round(stage.damageTo(caster) * 10) / 10,
            soaked: stage.hadMobEffect(foe, soaked),
            casterHp: caster.health(),
            foeAlive: foe.alive(),
            moved: Math.round(stage.travelled(caster) * 10) / 10
        });
        stage.done();
    }, "wavecrash lands and soaks the target");
});
