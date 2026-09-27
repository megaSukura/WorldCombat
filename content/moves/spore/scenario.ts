/**
 * 蘑菇孢子 / spore 的可执行设计说明。
 *
 * 场面：晴天白天、开阔石地。只会蘑菇孢子的斗笠菇（breloom）让两只僵尸贴到身边，然后原地抖开孢子。
 *
 * 必然事实：蘑菇孢子被提交过；至少一个贴身的僵尸带上共享的睡眠身份（world_combat:status/sleep）。
 * 随机结果：具体罩住几只取决于引爆瞬间双方站位（僵尸会朝施法者挤过来）、以及每只各自掷的 landChance（很高，
 *   但不是 1），写进 note 供读轨迹判断。它不造成伤害（原生威力 0）；`damageTo` 含其他来源的伤害，故只作记录。
 */
Smoke.scenario("spore", function (stage) {
    stage.weather("clear");
    stage.time("day");
    var caster = stage.pokemon({ species: "breloom", level: 42, moves: ["spore"], at: [0, 0, 0] });
    var foeA = stage.mob({ type: "minecraft:zombie", at: [1, 0, 0] });
    var foeB = stage.mob({ type: "minecraft:zombie", at: [0, 0, 1] });
    stage.hostile(caster, foeA);
    stage.hostile(caster, foeB);
    stage.until(900, function () {
        return stage.casts("spore") > 0
            && (stage.hadMobEffect(foeA, "world_combat:status/sleep") || stage.hadMobEffect(foeB, "world_combat:status/sleep"));
    }, function () {
        stage.expect(stage.casts("spore") > 0, "spore was committed");
        stage.expect(stage.hadMobEffect(foeA, "world_combat:status/sleep")
            || stage.hadMobEffect(foeB, "world_combat:status/sleep"), "at least one adjacent target fell asleep");
        stage.note("孢子以自身为圆心一瞬炸开，半径内每个非友方在真实高度带里各掷一次高概率的 landChance；与中心之间隔墙的、按当前有效类型算草属性的、已经睡着的都会被跳过。它不造伤，不留任何东西，冷却最长。墙隔不睡与改属性前后草免疫一致由人工试玩确认。", {
            casts: stage.casts("spore"),
            sleptA: stage.hadMobEffect(foeA, "world_combat:status/sleep"),
            sleptB: stage.hadMobEffect(foeB, "world_combat:status/sleep"),
            damageToA: Math.round(stage.damageTo(foeA) * 10) / 10,
            damageToB: Math.round(stage.damageTo(foeB) * 10) / 10,
            damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10
        });
        stage.done();
    }, "spore puts an adjacent target to sleep");
});
