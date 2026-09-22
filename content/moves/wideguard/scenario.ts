// 广域防守的执行性设计说明：这是一面罩住自己与队友的短墙，所以场面要有队友、也要有让 AI 立墙的威胁与远程攻击。
// 必然事实：施法者提交过广域防守；施法者与半径内的队友身上都出现过共享身份 world_combat:status/wideguard。
// 「远程被卸掉多少」取决于对手何时打来、打中谁，属于随机/时机结果，写进 note。
Smoke.scenario("wideguard", function (stage) {
    stage.weather("clear");
    stage.time("day");

    var caster = stage.pokemon({ species: "shieldon", level: 34, moves: ["wideguard"], at: [-2, 0, 0] });
    var ally = stage.pokemon({ species: "pikachu", level: 30, moves: ["tackle"], at: [0, 0, 0] });
    // 敌人用远程招式（ember 不带 contact 旗标），正是宽墙该挡的那一类。
    var foe = stage.pokemon({ species: "charmander", level: 20, moves: ["ember"], at: [6, 0, 0] });
    stage.team("wall", [caster, ally]);
    stage.hostile(ally, foe);
    stage.hostile(caster, foe);

    stage.until(900, function () {
        return stage.casts("wideguard", caster) > 0 && stage.hadMobEffect(ally, "world_combat:status/wideguard");
    }, function () {
        stage.expect(stage.casts("wideguard", caster) > 0, "wide guard was cast");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/wideguard"), "caster carried the shared wideguard identity");
        stage.expect(stage.hadMobEffect(ally, "world_combat:status/wideguard"), "the nearby ally carried the shared wideguard identity");
        stage.note("广域防守以施法者为锚，提交时给半径内友方各挂一份身份与一层按量吸收池（只截非接触的远程/范围伤害，贴身近战穿得过）。是否在窗口内真挨到远程、被卸掉多少由时机与走位决定，留给完整装配试玩核对。", {
            casts: stage.casts("wideguard", caster), casterHp: caster.health(), allyHp: ally.health(), tick: stage.tick()
        });
        stage.done();
    }, "wide guard covers the pair");
});
