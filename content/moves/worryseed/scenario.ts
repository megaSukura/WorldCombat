/**
 * 烦恼种子的可执行设计说明。
 *
 * 场面：一只只会烦恼种子的臭臭花（等级 40）对 5 格外的卡蒂狗（威吓特性，没有招式）。地面铺一层石头，
 *   这样命中处被顶出的那小块苔能在 changedBlocks 里读出来。预检要求目标在射程内、有通视直线、
 *   还没被种过、特性可被顶掉，因此它一定是在看到威胁、走近到能通视之后才投的。
 * 必然事实：本招被提交过；目标身上出现过共享身份 world_combat:status/worryseed 的标记；
 *   命中处至少有一格地面被换过（种子顶出的苔，租借到期会自己还原）。
 * 随机结果：命中的具体时机、目标是否走动、苔在哪一格写进 note 供读轨迹判断。
 * 特性顶替走共享 NativeModifiers ability 层，不眠走共享 CombatStatus 门；smoke 不能直接读特性，
 * 实际效果记在 note 里。
 */
Smoke.scenario("worryseed", function (stage) {
    stage.fill([-6, -1, -6], [6, -1, 6], "minecraft:stone");
    var caster = stage.pokemon({ species: "Gloom", level: 40, moves: ["worryseed"], at: [-3, 0, 0] });
    var target = stage.pokemon({ species: "Growlithe", level: 24, ability: "intimidate", moves: [], at: [2, 0, 0] });
    stage.hostile(caster, target);
    stage.note("staged: gloom(40) worryseed vs growlithe(24, intimidate); the target's Ability is suppressible so the cast should be accepted");
    stage.until(1200, function () { return stage.hadMobEffect(target, "world_combat:status/worryseed"); }, function () {
        stage.expect(stage.casts("worryseed", caster) >= 1, "worryseed was committed");
        stage.expect(stage.hadMobEffect(target, "world_combat:status/worryseed"), "the worry-seed status appeared on the target");
        stage.expect(stage.changedBlocks().length >= 1, "the seed rooted and changed at least one ground block");
        stage.note("worryseed committed; the target's Ability is overridden with insomnia through the shared NativeModifiers ability layer, and rules.ts blocks sleep for any insomnia holder", {
            casts: stage.casts("worryseed", caster),
            changed: stage.changedBlocks()
        });
        stage.done();
    }, "worry seed planted");
});
