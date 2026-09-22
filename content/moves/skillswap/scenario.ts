/**
 * 特性互换的可执行设计说明。
 *
 * 场面：一只只会「特性互换」的凯西（同步特性）对 4 格外的卡蒂狗（威吓特性）。双方特性不同、都是宝可梦、
 *   都未带 failskillswap，预检通过；AI 会在看到威胁后把两份特性对调。
 * 必然事实：本招被提交过；施法者与目标身上都出现过对调窗口身份 world_combat:status/skillswap——
 *   只有两侧的 ability 层真正写入时才会挂上这层窗口。
 * 特性覆盖走共享的 NativeModifiers ability 层，smoke 不能直接读特性，实际换到的特性写进 note 供读轨迹判断。
 */
Smoke.scenario("skillswap", function (stage) {
    stage.fill([-6, -1, -6], [6, -1, 6], "minecraft:stone");
    var caster = stage.pokemon({ species: "Abra", level: 24, ability: "synchronize", moves: ["skillswap"], at: [-2, 0, 0] });
    var target = stage.pokemon({ species: "Growlithe", level: 20, ability: "intimidate", moves: ["tackle"], at: [1, 0, 0] });
    stage.hostile(caster, target);
    stage.note("staged: abra(24, synchronize) skillswap vs growlithe(20, intimidate, tackle); abilities differ so the swap should be accepted");
    stage.until(1200, function () {
        return stage.casts("skillswap", caster) >= 1 && stage.hadMobEffect(caster, "world_combat:status/skillswap");
    }, function () {
        stage.expect(stage.casts("skillswap", caster) >= 1, "skillswap was committed");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/skillswap"), "the caster carried the exchange window");
        stage.expect(stage.hadMobEffect(target, "world_combat:status/skillswap"), "the target carried the exchange window");
        stage.note("both Abilities moved to the other body through the shared NativeModifiers ability layer; the window reverts when it ends", {
            casts: stage.casts("skillswap", caster), casterAlive: caster.alive(), targetAlive: target.alive()
        });
        stage.done();
    }, "the abilities exchange");
});
