// 幸运咒语的可执行设计说明：这是一层罩住自己与队友的祝福，所以场面要有队友、也要有让 AI 起唱的威胁。
// 必然事实：幸运咒语被放出来过；施法者与半径内的队友身上都出现过共享身份 world_combat:status/luckychant。
// 暴击被抚平需要一次真实暴击，属随机结果，写进 note 供完整装配试玩核对。
Smoke.scenario("luckychant", function (stage) {
    var caster = stage.pokemon({ species: "cherubi", level: 42, moves: ["luckychant"], at: [-2, 0, 0] });
    var ally = stage.pokemon({ species: "pikachu", level: 30, moves: [], at: [0, 0, 0] });
    var foe = stage.pokemon({ species: "magikarp", level: 20, moves: ["tackle"], at: [5, 0, 0] });
    stage.team("lucky", [caster, ally]);
    stage.hostile(ally, foe);
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("luckychant", caster) > 0 && stage.hadMobEffect(caster, "world_combat:status/luckychant") && stage.hadMobEffect(ally, "world_combat:status/luckychant");
    }, function () {
        stage.expect(stage.casts("luckychant", caster) > 0, "luckychant was cast");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/luckychant"), "caster carried the shared luckychant identity");
        stage.expect(stage.hadMobEffect(ally, "world_combat:status/luckychant"), "the nearby ally carried the shared luckychant identity");
        stage.note("幸运咒语以施法者为锚，提交时与之后每 20 刻把同一份祝福补给半径内的友方；带身份的活体被暴击时伤害按普通命中结算（暴击是随机结果，兑现留给完整装配试玩）。半径、时长、星光数随身高/特攻/等级变化，早愿与深愿各有取舍。", {
            casts: stage.casts("luckychant", caster), casterHp: caster.health(), allyHp: ally.health()
        });
        stage.done();
    }, "luckychant covers the pair");
});
