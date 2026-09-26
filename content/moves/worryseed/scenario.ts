/**
 * 烦恼种子的可执行设计说明。
 *
 * 场面：只会烦恼种子的臭臭花（40 级）身边有一个同队、睡着的吉利蛋（30 级，技能表为空），
 *   3 格外站着一只特性「绝对睡眠」（comatose，原生 cantsuppress）的树枕尾熊。
 *   友方睡着＝支援分支成立；对手特性不可替换＝进攻分支不成立，因此伙伴只会朝伙伴投种。
 * 必然事实：本招被提交过；睡觉中的伙伴身上出现过共享身份 world_combat:status/worryseed 的标记，
 *   且睡觉身份被真正清掉；不可替换的对手没有拿到种子。
 * 随机结果：种子飞行与落地时机写进 note 供读轨迹判断；特性顶替走共享 NativeModifiers ability 层。
 */
Smoke.scenario("worryseed", function (stage) {
    stage.fill([-6, -1, -6], [6, -1, 6], "minecraft:stone");
    stage.time("day");
    var caster = stage.pokemon({ species: "Gloom", level: 40, moves: ["worryseed"], at: [-2, 0, 0] });
    var ally = stage.pokemon({ species: "Chansey", level: 30, moves: [], at: [0, 0, 0], status: "sleep" });
    var foe = stage.pokemon({ species: "Komala", level: 30, moves: [], at: [3, 0, 0], ability: "comatose" });
    stage.team("worry", [caster, ally]);
    stage.hostile(caster, foe);
    stage.note("staged: gloom(40) worryseed + sleeping chansey ally vs komala(comatose, unsuppressible). The sleeping ally makes the support branch meaningful; the foe's Ability cannot be replaced, so the companion should only seed the ally");
    stage.until(1400, function () { return stage.hadMobEffect(ally, "world_combat:status/worryseed"); }, function () {
        stage.expect(stage.casts("worryseed", caster) >= 1, "worryseed was committed");
        stage.expect(stage.hadMobEffect(ally, "world_combat:status/sleep"), "the ally had carried the sleep identity before the seed");
        stage.expect(stage.hadMobEffect(ally, "world_combat:status/worryseed"), "the worry-seed status appeared on the sleeping ally");
        stage.expect(!stage.hasMobEffect(ally, "world_combat:status/sleep"), "the seed woke the sleeping ally");
        stage.expect(!stage.hasMobEffect(foe, "world_combat:status/worryseed"), "the unsuppressible foe was not seeded");
        stage.note("worryseed committed; the seed is a real homing projectile, and rules.ts blocks sleep for any worry-seed or Insomnia holder. The ally was woken and protected; the comatose foe was refused by the native cantsuppress rule.", {
            casts: stage.casts("worryseed", caster),
            allySleepEver: stage.hadMobEffect(ally, "world_combat:status/sleep"),
            allySleepNow: stage.hasMobEffect(ally, "world_combat:status/sleep"),
            allySeedNow: stage.hasMobEffect(ally, "world_combat:status/worryseed"),
            foeSeedNow: stage.hasMobEffect(foe, "world_combat:status/worryseed")
        });
        stage.done();
    }, "worry seed reaches the sleeping ally");
});
