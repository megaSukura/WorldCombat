// 神秘守护的可执行设计说明：这是一层罩住自己与队友的异常状态护罩，所以场面要有队友、也要有让 AI 张罩的威胁。
// 必然事实：神秘守护被放出来过；施法者与半径内的队友身上都出现过共享身份 world_combat:status/safeguard。
// 「异常状态被挡下」需要在罩里挨一次带异常状态的招，本私有装配不含对应招式（对手只有撞击），写进 note 留给完整装配试玩核对。
Smoke.scenario("safeguard", function (stage) {
    var caster = stage.pokemon({ species: "swablu", level: 34, moves: ["safeguard"], at: [-2, 0, 0] });
    var ally = stage.pokemon({ species: "pikachu", level: 30, moves: [], at: [0, 0, 0] });
    var foe = stage.pokemon({ species: "magikarp", level: 20, moves: ["tackle"], at: [5, 0, 0] });
    stage.team("warded", [caster, ally]);
    stage.hostile(ally, foe);
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("safeguard", caster) > 0 && stage.hadMobEffect(caster, "world_combat:status/safeguard") && stage.hadMobEffect(ally, "world_combat:status/safeguard");
    }, function () {
        stage.expect(stage.casts("safeguard", caster) > 0, "safeguard was cast");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/safeguard"), "caster carried the shared safeguard identity");
        stage.expect(stage.hadMobEffect(ally, "world_combat:status/safeguard"), "the nearby ally carried the shared safeguard identity");
        stage.note("神秘守护以施法者为锚，提交时与之后每 20 刻把同一份守护补给半径内的友方；带身份的活体上，经共享状态路由落下的异常都会被 gate 拒绝（本私有装配对手只有撞击，不带异常状态，兑现留给完整装配试玩）。半径、时长、光点数随身高/特防/等级变化，深守与早守各有取舍。", {
            casts: stage.casts("safeguard", caster), casterHp: caster.health(), allyHp: ally.health()
        });
        stage.done();
    }, "safeguard covers the pair");
});
