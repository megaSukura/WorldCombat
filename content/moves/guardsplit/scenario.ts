/**
 * 防守平分的可执行设计说明：一只只会「防守平分」的幸福蛋，对一只穿着钻石护甲的僵尸开战，相隔 3 格。
 * 僵尸的实际护甲/韧性与幸福蛋不同，施术者读到差距后出手，把两端拉到同一个世界护甲数值上。
 * 必然事实：本招被提交过；施术者身上出现过共享身份 world_combat:status/guardsplit 的平分窗口；
 *   窗口生效时双方的实际护甲与护甲韧性相等；窗口走完后两端各自回到原来的底子。
 */
Smoke.scenario("guardsplit", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "chansey", level: 40, moves: ["guardsplit"], at: [-2, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [1, 0, 0] });
    stage.command("item replace entity @e[type=minecraft:zombie,limit=1,sort=nearest] armor.head with minecraft:diamond_helmet");
    stage.command("item replace entity @e[type=minecraft:zombie,limit=1,sort=nearest] armor.chest with minecraft:diamond_chestplate");
    stage.hostile(caster, foe);
    var armorBefore = stage.attribute(caster, "minecraft:generic.armor");
    var toughBefore = stage.attribute(caster, "minecraft:generic.armor_toughness");
    stage.until(1400, function () {
        return stage.casts("guardsplit", caster) > 0
            && stage.hadMobEffect(caster, "world_combat:status/guardsplit");
    }, function () {
        var armorCaster = stage.attribute(caster, "minecraft:generic.armor");
        var armorFoe = stage.attribute(foe, "minecraft:generic.armor");
        var toughCaster = stage.attribute(caster, "minecraft:generic.armor_toughness");
        var toughFoe = stage.attribute(foe, "minecraft:generic.armor_toughness");
        stage.expect(stage.casts("guardsplit", caster) > 0, "防守平分被放出来了");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/guardsplit"), "平分窗口带上了共享身份");
        stage.expect(Math.abs(armorCaster - armorFoe) < 0.02 && Math.abs(toughCaster - toughFoe) < 0.02,
            "窗口生效时双方实际护甲与韧性相等");
        stage.note("僵尸穿装备、幸福蛋空身，两者同一套世界护甲单位不同；平分后两端落在同一数值，窗口维持后各自回到原底子。",
            { casts: stage.casts("guardsplit", caster), casterArmor: Math.round(armorCaster * 10) / 10, foeArmor: Math.round(armorFoe * 10) / 10,
              casterTough: Math.round(toughCaster * 10) / 10, foeTough: Math.round(toughFoe * 10) / 10,
              casterAlive: caster.alive() });
        stage.until(900, function () { return !stage.hasMobEffect(caster, "world_combat:status/guardsplit"); }, function () {
            var armorAfter = stage.attribute(caster, "minecraft:generic.armor");
            var toughAfter = stage.attribute(caster, "minecraft:generic.armor_toughness");
            stage.expect(Math.abs(armorAfter - armorBefore) < 0.02 && Math.abs(toughAfter - toughBefore) < 0.02,
                "窗口结束后施术者护甲与韧性回到原底子");
            stage.note("窗口到期后载体撤销本次加性层，两端回到各自原来的世界护甲数值。",
                { armorBefore: Math.round(armorBefore * 10) / 10, armorAfter: Math.round(armorAfter * 10) / 10,
                  toughBefore: Math.round(toughBefore * 10) / 10, toughAfter: Math.round(toughAfter * 10) / 10 });
            stage.done();
        }, "平分窗口结束");
    }, "防守平分");
});
