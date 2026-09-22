// 灭亡之歌的可执行设计说明。
// 场面：一只只会灭亡之歌的卡比兽对 2 格外一只关掉 AI 的蜘蛛；先用指令把卡比兽打到阈值以下的残血逼它起唱。
// 关掉 AI 的蜘蛛不会反击也不会被日光点燃，保证双方都撑到歌走完；它作为「听见歌声的活物」被写进名单。
// 必然事实：灭亡之歌被提交过；歌声作为真实 MobEffect 同时落到唱者与听者身上并带共享身份；数完三拍双方一同倒下。
// 随机结果：起唱用了多久、双方是否在同一拍结清写进 note 供读轨迹判断。
Smoke.scenario("perishsong", function (stage) {
    var singer = stage.pokemon({ species: "snorlax", level: 30, moves: ["perishsong"], at: [0, 0, 0] });
    var listener = stage.mob({ type: "minecraft:spider", at: [2, 0, 0] });
    stage.hostile(singer, listener);
    stage.command("data merge entity @e[type=minecraft:spider,distance=..6,limit=1] {NoAI:1b}");
    stage.after(30, function () {
        stage.command("damage " + String(singer.ref).split("/")[0] + " " + Math.max(1, Math.floor(singer.health() * 0.6)) + " minecraft:magic");
    });
    stage.until(1500, function () {
        return stage.casts("perishsong", singer) > 0
            && stage.hadMobEffect(singer, "world_combat:status/perish_song")
            && stage.hadMobEffect(listener, "world_combat:status/perish_song")
            && !singer.alive() && !listener.alive();
    }, function () {
        stage.expect(stage.casts("perishsong", singer) > 0, "perish song was committed");
        stage.expect(stage.hadMobEffect(singer, "world_combat:perish_song"), "the song exists as a real MobEffect");
        stage.expect(stage.hadMobEffect(singer, "world_combat:status/perish_song"), "the singer carries the shared identity");
        stage.expect(stage.hadMobEffect(listener, "world_combat:status/perish_song"), "the listener carries the shared identity");
        stage.expect(!singer.alive(), "the singer also went down at the end of the countdown");
        stage.expect(!listener.alive(), "the listener went down at the end of the countdown");
        stage.note("the song marks everyone in the radius including the singer; each mark expires into a drop-to-zero through the common health path. A Pokemon that disengages early shakes the song off instead.", {
            casts: stage.casts("perishsong", singer), singerAlive: singer.alive(), listenerAlive: listener.alive()
        });
        stage.done();
    }, "both the singer and the listener fall to the song");
});
