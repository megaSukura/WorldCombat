// 灭亡之歌的可执行设计说明。
// 场面：一只只会灭亡之歌的卡比兽对 2 格外一只铁傀儡 listener 和 3 格外一只蜘蛛 runner；先用指令把卡比兽打到阈值
//   以下的残血逼它起唱。起唱后冻住两名听者，把 runner 传送到起唱中心两倍歌声半径之外并让它留在那里，listener 留在歌里。
//   逃生线外的 runner 撑满一整拍后应解歌存活；留场的 listener 数完三拍后按原生结算倒下。
// 必然事实：灭亡之歌被提交过；歌声作为真实 MobEffect 同时落到唱者与两名听者身上并带共享身份；跑离者解除，留场者被结清。
// 歌者必须自行绕开退路上的短墙、跑过本次起唱的逃生线并解歌；走路和倒数均不由场景代劳。
namespace PerishsongScenario {
    export let singer = "", origin: number[] | null = null, escapeRadius = 0;
    WorldCombat.on("checks:perishsong-origin", "world_combat:committed", "", event => {
        const action = event.action();
        if (!action || String(action.content()) !== "world_combat:perishsong" || String(event.actor().ref()).indexOf(singer) !== 0) return;
        const at = action.origin(); origin = [at.x(), at.y(), at.z()];
        escapeRadius = PokemonSkills.p("perishsong", "songRadius", action) * 2;
    });
}
Smoke.scenario("perishsong", function (stage) {
    function plain(ref: string): string { return String(ref).split("/")[0]; }
    var singer = stage.pokemon({ species: "snorlax", level: 30, moves: ["perishsong"], at: [0, 0, 0] });
    PerishsongScenario.singer = singer.ref;
    stage.fill([-4, 0, 0], [-4, 4, 0], "minecraft:stone");
    var listener = stage.mob({ type: "minecraft:iron_golem", at: [2, 0, 0] });
    var runner = stage.mob({ type: "minecraft:spider", at: [3, 0, 0] });
    stage.hostile(singer, listener);
    stage.hostile(singer, runner);
    stage.noai(listener, runner);
    stage.after(30, function () {
        stage.command("damage " + plain(singer.ref) + " " + Math.max(1, Math.floor(singer.health() * 0.6)) + " minecraft:magic");
    });
    stage.until(1200, function () {
        return stage.casts("perishsong", singer) > 0
            && stage.hadMobEffect(singer, "world_combat:status/perish_song")
            && stage.hadMobEffect(listener, "world_combat:status/perish_song")
            && stage.hadMobEffect(runner, "world_combat:status/perish_song");
    }, function () {
        // 把 runner 送过逃生线；listener 留在歌里。
        stage.command("tp " + plain(runner.ref) + " ~30 ~ ~");
        stage.until(700, function () { return !stage.hasMobEffect(runner, "world_combat:status/perish_song"); }, function () {
            stage.until(900, function () { return !listener.alive(); }, function () {
                stage.expect(stage.casts("perishsong", singer) > 0, "perish song was committed");
                stage.expect(stage.hadMobEffect(singer, "world_combat:perish_song"), "the song exists as a real MobEffect");
                stage.expect(stage.hadMobEffect(singer, "world_combat:status/perish_song"), "the singer carries the shared identity");
                stage.expect(stage.hadMobEffect(listener, "world_combat:status/perish_song"), "the listener carries the shared identity");
                stage.expect(!stage.hasMobEffect(runner, "world_combat:status/perish_song"), "the runner past the escape line shook the song off");
                stage.expect(runner.alive(), "the escaped runner left the list and lived");
                stage.expect(singer.alive() && !stage.hasMobEffect(singer, "world_combat:status/perish_song"), "the singer walked out and completed its own escape beat");
                const at = singer.position(), from = PerishsongScenario.origin!;
                stage.expect(!!from && Math.sqrt((at[0] - from[0]) * (at[0] - from[0]) + (at[2] - from[2]) * (at[2] - from[2])) > PerishsongScenario.escapeRadius,
                    "the singer actually crossed this song's original escape radius past the obstructed direct route");
                stage.expect(!listener.alive(), "the listener that stayed was settled");
                stage.expect(stage.damageEvents("world_combat:perishsong").length > 0, "the finale settled through the common health path");
                stage.note("everyone in the radius is marked at the moment the song starts; a carrier that gets past twice the song radius and stays out for a full beat is released, while those who remain are settled once through the common health path.", {
                    casts: stage.casts("perishsong", singer), singerAlive: singer.alive(), listenerAlive: listener.alive(),
                    runnerAlive: runner.alive(), runnerFreed: !stage.hasMobEffect(runner, "world_combat:status/perish_song"),
                    finales: stage.damageEvents("world_combat:perishsong").length
                });
                stage.done();
            }, "the listener that stayed in the song was settled");
        }, "the runner is released after a full beat outside the line");
    }, "the song marks the singer and both listeners");
});
