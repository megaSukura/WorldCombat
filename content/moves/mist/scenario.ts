// 白雾的可执行设计说明：这是一层罩住自己与队友的防御雾，来源各记一份，一个结束不会撤掉另一个。
// 必然事实：两名施法者都放出过白雾；半径内的队友身上出现过共享身份 world_combat:status/mist；
//   一名来源消失后队友仍带雾，最后一个来源消失后失去。
// 能力下降被雾吞掉需要在雾里挨一次降级招，本私有装配不含对应招式，写进 note 供完整装配试玩核对。
Smoke.scenario("mist", function (stage) {
    // 两名施法者相距 6 格（各自半径约 4 格），谁都罩不到对方，所以会各张一片雾，队友同时落在两片里。
    var a = stage.pokemon({ species: "swablu", level: 50, moves: ["mist"], at: [-3, 0, 0] });
    var b = stage.pokemon({ species: "swablu", level: 50, moves: ["mist"], at: [3, 0, 0] });
    var ally = stage.pokemon({ species: "pikachu", level: 30, moves: [], at: [0, 0, 0] });
    var foe = stage.pokemon({ species: "magikarp", level: 20, moves: ["tackle"], at: [7, 0, 0] });
    stage.team("veiled", [a, b, ally]);
    stage.hostile(a, foe);
    stage.hostile(b, foe);
    stage.until(900, function () {
        return stage.casts("mist", a) > 0 && stage.casts("mist", b) > 0
            && stage.hasMobEffect(ally, "world_combat:status/mist");
    }, function () {
        stage.expect(stage.casts("mist", a) > 0, "the first source cast mist");
        stage.expect(stage.casts("mist", b) > 0, "the second source cast mist");
        stage.expect(stage.hasMobEffect(ally, "world_combat:status/mist"), "the nearby ally carried the shared mist identity");
        // 一名来源倒下：另一名来源的贡献还在，队友不该失去雾。
        stage.hurt(b, 10000, "minecraft:generic", { source: foe });
        stage.after(12, function () {
            stage.expect(stage.hasMobEffect(ally, "world_combat:status/mist"), "the ally keeps mist after one source ends");
            // 最后一个来源也倒下：队友才失去这一份保护。
            stage.hurt(a, 10000, "minecraft:generic", { source: foe });
            stage.after(12, function () {
                stage.expect(!stage.hasMobEffect(ally, "world_combat:status/mist"), "the ally loses mist after the last source ends");
                stage.note("白雾以施法者为来源租约：每 20 刻把自己的雾补给半径内的友方，同一受护者身上多个来源各记一份。一个来源（b）倒下只撤它自己的贡献，队友仍被另一个来源（a）罩着；最后一个来源倒下才真正散雾。半径、时长、浓度随身高/特防/等级变化，浓雾与薄雾各有取舍；离开半径的队友不再被这份来源续期，短续期走完即失雾（本装配用双双倒下代表来源退出）。", {
                    castsA: stage.casts("mist", a), castsB: stage.casts("mist", b),
                    bAlive: b.alive(), aAlive: a.alive(), allyHp: ally.health()
                });
                stage.done();
            });
        });
    }, "two mist sources cover the ally");
});
