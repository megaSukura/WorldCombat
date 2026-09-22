// 芳香薄雾的执行性设计说明：这是一片留在世界上的特防香云，所以场面要有队友、也要有让 AI 出手的威胁。
// 必然事实：施法者提交过芳香薄雾；被香云罩住的队友身上出现过共享身份 world_combat:status/aromaticmist。
// 云的位置、罩住几人、留香多久随数据与走位变化，写进 note。
Smoke.scenario("aromaticmist", function (stage) {
    stage.weather("clear");
    stage.time("day");

    var caster = stage.pokemon({ species: "spritzee", level: 34, moves: ["aromaticmist"], at: [-2, 0, 0] });
    var ally = stage.pokemon({ species: "pikachu", level: 30, moves: ["tackle"], at: [0, 0, 0] });
    var foeAlly = stage.pokemon({ species: "rattata", level: 18, moves: ["tackle"], at: [7, 0, 0] });
    var foeCaster = stage.pokemon({ species: "rattata", level: 18, moves: [], at: [4, 0, 4] });
    stage.team("aroma", [caster, ally]);
    stage.hostile(ally, foeAlly);
    stage.hostile(caster, foeCaster);

    stage.until(900, function () {
        return stage.casts("aromaticmist", caster) > 0 && stage.hadMobEffect(ally, "world_combat:status/aromaticmist");
    }, function () {
        stage.expect(stage.casts("aromaticmist", caster) > 0, "aromatic mist was cast");
        stage.expect(stage.hadMobEffect(ally, "world_combat:status/aromaticmist"), "the ally under the cloud carried the shared aromaticmist identity");
        stage.note("芳香薄雾以选定点为落点留一片香云，云每 5 刻扫一次给雾里的友方挂身份并写特防；离雾后香随留香窗口自行走完。具体罩住几人、留香多久随特防/等级/亲密度与走位变化，留给完整装配试玩核对。", {
            casts: stage.casts("aromaticmist", caster), casterHp: caster.health(), allyHp: ally.health(), tick: stage.tick()
        });
        stage.done();
    }, "aromatic mist covers the ally");
});
