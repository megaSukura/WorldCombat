/**
 * 描绘的可执行设计说明。
 *
 * 场面：一只只会描绘的凯西（同步特性，在 A 队）带着同队的腕力（毅力）与谜拟丘（画皮，禁止被覆盖的特性），
 *   对面 5 格外的卡蒂狗（威吓特性）。描绘的预检要求样本可抄，且自己或身边至少一只同伴的特性与它不同——
 *   腕力的毅力正好满足，所以 AI 会在看到威胁后描摹并把威吓盖给自己和腕力；谜拟丘的特性不可修改，不应被盖印。
 * 必然事实：本招被提交过；可修改的同伴腕力身上出现过“描绘”标记；不可修改的谜拟丘身上从未出现该标记。
 * 随机结果：具体盖到几只、盖印的时机写进 note 供读轨迹判断。
 * 特性覆盖走共享的 NativeModifiers ability 层，不是 MobEffect；smoke 不能直接读特性，改动记在 note 里。
 */
Smoke.scenario("doodle", function (stage) {
    var caster = stage.pokemon({ species: "Abra", level: 40, ability: "synchronize", moves: ["doodle"], at: [-2, 0, 0] });
    var ally = stage.pokemon({ species: "Machop", level: 30, ability: "guts", moves: [], at: [0, 0, 1] });
    var locked = stage.pokemon({ species: "Mimikyu", level: 30, ability: "disguise", moves: [], at: [0, 0, -1] });
    var target = stage.pokemon({ species: "Growlithe", level: 26, ability: "intimidate", moves: [], at: [3, 0, 0] });
    stage.team("doodle-ally", [caster, ally, locked]);
    stage.hostile(caster, target);
    stage.note("staged: abra(synchronize) + machop(guts) + mimikyu(disguise: unmodifiable) vs growlithe(intimidate)");
    stage.until(1200, function () { return stage.hadMobEffect(ally, "world_combat:doodle_sketch"); }, function () {
        stage.expect(stage.casts("doodle", caster) >= 1, "doodle was committed");
        stage.expect(stage.hadMobEffect(ally, "world_combat:doodle_sketch"), "a modifiable ally was stamped");
        stage.expect(!stage.hadMobEffect(locked, "world_combat:doodle_sketch"), "an unmodifiable ally never received a stamp");
        stage.note("doodle committed; only recipients that can be modified were stamped through NativeModifiers", {
            casts: stage.casts("doodle", caster)
        });
        stage.done();
    }, "doodle stamp");
});
