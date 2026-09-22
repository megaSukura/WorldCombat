// 白雾的可执行设计说明：这是一层罩住自己与队友的防御雾，所以场面要有队友、也要有让 AI 张雾的威胁。
// 必然事实：白雾被放出来过；施法者与半径内的队友身上都出现过共享身份 world_combat:status/mist。
// 能力下降被雾吞掉需要在雾里挨一次降级招，本私有装配不含对应招式，写进 note 供完整装配试玩核对。
Smoke.scenario("mist", function (stage) {
    var caster = stage.pokemon({ species: "swablu", level: 34, moves: ["mist"], at: [-2, 0, 0] });
    var ally = stage.pokemon({ species: "pikachu", level: 30, moves: [], at: [0, 0, 0] });
    var foe = stage.pokemon({ species: "magikarp", level: 20, moves: ["tackle"], at: [5, 0, 0] });
    stage.team("veiled", [caster, ally]);
    stage.hostile(ally, foe);
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("mist", caster) > 0 && stage.hadMobEffect(caster, "world_combat:status/mist") && stage.hadMobEffect(ally, "world_combat:status/mist");
    }, function () {
        stage.expect(stage.casts("mist", caster) > 0, "mist was cast");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/mist"), "caster carried the shared mist identity");
        stage.expect(stage.hadMobEffect(ally, "world_combat:status/mist"), "the nearby ally carried the shared mist identity");
        stage.note("白雾以施法者为锚，提交时与之后每 20 刻把同一份雾补给半径内的友方；雾里谁的能力等级下降都会被下一刻还原（本私有装配不含降级招，兑现留给完整装配试玩）。半径、时长、浓度随身高/特防/等级变化，浓雾与薄雾各有取舍。", {
            casts: stage.casts("mist", caster), casterHp: caster.health(), allyHp: ally.health()
        });
        stage.done();
    }, "mist covers the pair");
});
