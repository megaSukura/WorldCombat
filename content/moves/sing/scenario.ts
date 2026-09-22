/**
 * 唱歌 / sing 的可执行设计说明。
 *
 * 场面：晴天白天、开阔石地。只会唱歌的胖丁（jigglypuff）对一只只会朝它走来的僵尸开口；僵尸会自己走进声场，
 *   让「声音荡过去、听满几句睡下」这件事可复现。
 *
 * 必然事实：唱歌被提交过；目标身上出现过共享的睡意身份（world_combat:status/drowsy）与共享的睡眠身份
 *   （world_combat:status/sleep）。歌声不认遮挡，所以本场景不摆墙。
 * 随机结果：目标是否在唱完前走出声场、唱了几首歌才把它哄睡，都写进 note 供读轨迹判断。
 */
Smoke.scenario("sing", function (stage) {
    stage.weather("clear");
    stage.time("day");
    var caster = stage.pokemon({ species: "jigglypuff", level: 42, moves: ["sing"], at: [0, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1600, function () {
        return stage.casts("sing", caster) > 0 && stage.hadMobEffect(foe, "world_combat:status/sleep");
    }, function () {
        stage.expect(stage.casts("sing", caster) > 0, "sing was committed");
        stage.expect(stage.hadMobEffect(foe, "world_combat:status/drowsy"), "the lullaby left the shared drowsy identity");
        stage.expect(stage.hadMobEffect(foe, "world_combat:status/sleep"), "the listener fell asleep to the song");
        stage.note("歌声从施法者身上一圈圈荡出、不认遮挡；每唱一句给圈里还醒着的目标记一分睡意，凑够句数才睡下。目标是否在唱完前走出声场、用了几个乐句，见轨迹。", {
            casts: stage.casts("sing", caster),
            travelled: Math.round(stage.travelled(foe) * 10) / 10,
            casterHp: Math.round(caster.health() * 10) / 10,
            foeHp: Math.round(foe.health() * 10) / 10
        });
        stage.done();
    }, "the lullaby puts the listener to sleep");
});
