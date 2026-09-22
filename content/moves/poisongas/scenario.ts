/**
 * 毒瓦斯的可执行设计说明。
 *
 * 场面：一只只会毒瓦斯的瓦斯弹对 4 格外的卡比兽喷云，卡比兽没有招式、站在云里挨毒；毒验完之后在它脚下点一把火。
 * 必然事实：本招被提交过；目标身上出现过共享毒性（`world_combat:status/poison` 身份与 `minecraft:poison` 效果）；
 * 毒性跳过一次伤害；在云里点火之后，云爆燃并把目标点着（共享灼伤身份）。
 * 随机结果：命中率 90、卡比兽是否走出云外都写进 note 供读轨迹判断。
 */
Smoke.scenario("poisongas", function (stage) {
    var caster = stage.pokemon({ species: "Koffing", level: 35, moves: ["poisongas"], at: [-2, 0, 0] });
    var target = stage.pokemon({ species: "Snorlax", level: 30, moves: [], at: [2, 0, 0] });
    stage.hostile(caster, target);
    stage.until(900, function () {
        return stage.casts("poisongas") > 0 && stage.hadMobEffect(target, "world_combat:status/poison");
    }, function () {
        stage.expect(stage.casts("poisongas") > 0, "poison gas was committed");
        stage.expect(stage.hadMobEffect(target, "world_combat:status/poison"), "the shared poison identity landed on the target");
        stage.expect(stage.hadMobEffect(target, "minecraft:poison"), "the shared default poison effect landed on the target");
        var start = target.health();
        stage.note("cloud settled", { casts: stage.casts("poisongas"), health: start });
        stage.until(300, function () { return stage.damageTo(target) > 0; }, function () {
            stage.expect(stage.damageTo(target) > 0, "the cloud's poison dealt damage");
            stage.note("poison ticked", { damageToTarget: Math.round(stage.damageTo(target) * 10) / 10,
                from: start, to: target.health() });
            // 在目标脚下点一把火，验证云的第二种结局：整片爆燃并点燃里面的人。
            var at = target.position();
            stage.command("setblock " + Math.floor(at[0]) + " " + Math.floor(at[1]) + " " + Math.floor(at[2]) + " minecraft:fire");
            stage.until(200, function () { return stage.hadMobEffect(target, "world_combat:status/burn"); }, function () {
                stage.expect(stage.hadMobEffect(target, "world_combat:status/burn"), "fire in the cloud ignited it and burned the target");
                stage.note("cloud ignited", { burnSeen: stage.hadMobEffect(target, "world_combat:status/burn"),
                    damageToTarget: Math.round(stage.damageTo(target) * 10) / 10, alive: target.alive() });
                stage.done();
            }, "cloud ignites");
        }, "poison ticks");
    }, "cloud poisons");
});
