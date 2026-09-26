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
    // 让队友先带上一层关键异常（麻痹）：默认 AI 的「友方已承关键异常」判据据此必然成立，
    // 不依赖对手是否抢到先手丢出变化招式；magnemite 的 thunderwave 仍作为变化招式威胁写进 note。
    stage.after(30, function () {
        stage.command("effect give " + String(ally.ref).split("/")[0] + " world_combat:paralysis 200 0");
    });

    stage.until(900, function () {
        return stage.casts("craftyshield", caster) > 0 && stage.hadMobEffect(ally, "world_combat:status/craftyshield");
    }, function () {
        stage.expect(stage.casts("craftyshield", caster) > 0, "crafty shield was cast");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/craftyshield"), "caster carried the shared craftyshield identity");
        stage.expect(stage.hadMobEffect(ally, "world_combat:status/craftyshield"), "the nearby ally carried the shared craftyshield identity");
        stage.note("戏法防守以施法者为锚，提交时给半径内友方各挂一份身份（amplifier 记剩余拨挡次数）与一枚承载标记；持续画面绑在这枚标记上，随它到期、被驱散或收阵一起清理。带身份的活体被敌方变化招式瞄上时，该招在提交点被拒绝，每一次真实被拒出手扣一枚法印（同一招多个回调按 action 实例去重），拨挡画面在下一刻补播并显示余量；伤害招式不受影响。默认 AI 在「已见敌用变化招式、队友已中关键异常或对手正扑向自家人」时才织阵，本场景由队友的麻痹必然触发；对手是否在窗口内真的递来变化招式、被拨掉几条由时机决定，留给完整装配试玩核对。", {
            casts: stage.casts("craftyshield", caster), casterHp: caster.health(), allyHp: ally.health(),
            hexerCasts: stage.casts("thunderwave", hexer), casterParalyzed: stage.hadMobEffect(caster, "world_combat:status/paralysis"),
            allyParalyzed: stage.hadMobEffect(ally, "world_combat:status/paralysis"), tick: stage.tick()
        });
        stage.done();
    }, "crafty shield covers the pair");
});
