// 掀榻榻米的执行性设计说明：这是一面只吃招式伤害、罩住自己与队友的席盾，所以场面要有队友与持续的伤害压力。
// 必然事实：施法者提交过掀榻榻米；施法者与半径内的队友身上都出现过共享身份 world_combat:status/matblock。
// 「伤害被席面吃下多少」取决于对手何时打来、打中谁，属于随机/时机结果，写进 note。
Smoke.scenario("matblock", function (stage) {
    stage.weather("clear");
    stage.time("day");

    var caster = stage.pokemon({ species: "turtwig", level: 34, moves: ["matblock"], at: [-2, 0, 0] });
    var ally = stage.pokemon({ species: "pikachu", level: 30, moves: ["tackle"], at: [0, 0, 0] });
    // 一名用伤害招式的对手（ember 的 kind 是 move），正是席子该吃的那一类；另加一只僵尸稳定地压上来。
    var burner = stage.pokemon({ species: "charmander", level: 22, moves: ["ember"], at: [5, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [6, 0, 0] });
    stage.team("mat", [caster, ally]);
    stage.hostile(ally, burner);
    stage.hostile(caster, burner);
    stage.hostile(ally, foe);
    stage.hostile(caster, foe);

    stage.until(900, function () {
        return stage.casts("matblock", caster) > 0 && stage.hadMobEffect(ally, "world_combat:status/matblock");
    }, function () {
        stage.expect(stage.casts("matblock", caster) > 0, "mat block was cast");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/matblock"), "caster carried the shared matblock identity");
        stage.expect(stage.hadMobEffect(ally, "world_combat:status/matblock"), "the nearby ally carried the shared matblock identity");
        stage.note("掀榻榻米以施法者为锚，提交时给半径内友方各挂一份身份与一层只吃 kind=move 伤害的按量吸收池；变化招式不带伤害，根本不进池。是否在窗口内真挨到招式、被吃下多少由时机与走位决定，留给完整装配试玩核对。", {
            casts: stage.casts("matblock", caster), casterHp: caster.health(), allyHp: ally.health(),
            burnerCasts: stage.casts("ember", burner), damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10, tick: stage.tick()
        });
        stage.done();
    }, "mat block covers the pair");
});
