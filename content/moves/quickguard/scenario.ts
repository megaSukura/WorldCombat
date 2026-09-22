// 快速防守的执行性设计说明：这是一面只对先制攻击生效、罩住自己与队友的短墙，所以场面要有队友与持续的威胁。
// 必然事实：施法者提交过快速防守；施法者与半径内的队友身上都出现过共享身份 world_combat:status/quickguard。
// 「先制伤害被磕掉多少」取决于对手何时打来、打中谁，属于随机/时机结果，写进 note。
Smoke.scenario("quickguard", function (stage) {
    stage.weather("clear");
    stage.time("day");

    var caster = stage.pokemon({ species: "shieldon", level: 34, moves: ["quickguard"], at: [-2, 0, 0] });
    var ally = stage.pokemon({ species: "pikachu", level: 30, moves: ["tackle"], at: [0, 0, 0] });
    // 一名用先制招式（quickattack 的优先度大于 0）的对手，正是快板该磕的那一类；另加一只僵尸稳定地压上来。
    var swift = stage.pokemon({ species: "sneasel", level: 20, moves: ["quickattack"], at: [5, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [6, 0, 0] });
    stage.team("quick", [caster, ally]);
    stage.hostile(ally, swift);
    stage.hostile(caster, swift);
    stage.hostile(ally, foe);
    stage.hostile(caster, foe);

    stage.until(900, function () {
        return stage.casts("quickguard", caster) > 0 && stage.hadMobEffect(ally, "world_combat:status/quickguard");
    }, function () {
        stage.expect(stage.casts("quickguard", caster) > 0, "quick guard was cast");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/quickguard"), "caster carried the shared quickguard identity");
        stage.expect(stage.hadMobEffect(ally, "world_combat:status/quickguard"), "the nearby ally carried the shared quickguard identity");
        stage.note("快速防守以施法者为锚，提交时给半径内友方各挂一份身份与一层只截先制伤害的按量吸收池（priority > 0 的伤害才被磕）。是否在窗口内真挨到先制、被磕掉多少由时机与走位决定，留给完整装配试玩核对。", {
            casts: stage.casts("quickguard", caster), casterHp: caster.health(), allyHp: ally.health(),
            swiftCasts: stage.casts("quickattack", swift), damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10, tick: stage.tick()
        });
        stage.done();
    }, "quick guard covers the pair");
});
