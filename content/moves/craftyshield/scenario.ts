// 戏法防守的执行性设计说明：这是一面只对变化招式生效、罩住自己与队友的符阵，所以场面要有队友与变化招式的压力。
// 必然事实：施法者提交过戏法防守；施法者与半径内的队友身上都出现过共享身份 world_combat:status/craftyshield。
// 「变化招式被拨掉几条」取决于对手何时递招、瞄谁，属于随机/时机结果，写进 note。
Smoke.scenario("craftyshield", function (stage) {
    stage.weather("clear");
    stage.time("day");

    var caster = stage.pokemon({ species: "klefki", level: 34, moves: ["craftyshield"], at: [-2, 0, 0] });
    var ally = stage.pokemon({ species: "pikachu", level: 30, moves: ["tackle"], at: [0, 0, 0] });
    // 一名用变化招式（thunderwave 的 category 是 status，瞄向对手）的对手，正是符阵该拨的那一类；另加一只僵尸稳定地压上来。
    var hexer = stage.pokemon({ species: "magnemite", level: 22, moves: ["thunderwave"], at: [5, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [6, 0, 0] });
    stage.team("crafty", [caster, ally]);
    stage.hostile(ally, hexer);
    stage.hostile(caster, hexer);
    stage.hostile(ally, foe);
    stage.hostile(caster, foe);

    stage.until(900, function () {
        return stage.casts("craftyshield", caster) > 0 && stage.hadMobEffect(ally, "world_combat:status/craftyshield");
    }, function () {
        stage.expect(stage.casts("craftyshield", caster) > 0, "crafty shield was cast");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/craftyshield"), "caster carried the shared craftyshield identity");
        stage.expect(stage.hadMobEffect(ally, "world_combat:status/craftyshield"), "the nearby ally carried the shared craftyshield identity");
        stage.note("戏法防守以施法者为锚，提交时给半径内友方各挂一份身份（amplifier 记剩余拨挡次数）。带身份的活体被敌方变化招式瞄上时，该招在提交点被拒绝，拨挡画面在下一刻补播；伤害招式不受影响。对手是否在窗口内真的递来变化招式、被拨掉几条由时机决定，留给完整装配试玩核对。", {
            casts: stage.casts("craftyshield", caster), casterHp: caster.health(), allyHp: ally.health(),
            hexerCasts: stage.casts("thunderwave", hexer), casterParalyzed: stage.hadMobEffect(caster, "world_combat:status/paralysis"),
            allyParalyzed: stage.hadMobEffect(ally, "world_combat:status/paralysis"), tick: stage.tick()
        });
        stage.done();
    }, "crafty shield covers the pair");
});
