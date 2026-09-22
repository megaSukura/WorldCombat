/**
 * 集沙 / Shore Up —— 可执行设计说明。
 *
 * 一句话：掉血后把脚边的散沙卷起来糊住伤口；AI 只在自身生命低于 ai.healBelow（默认 0.6）时动用，
 *   收多少取决于此刻能从地面取到多少沙。
 *
 * 场面：晴天白天。只在沙地上铺一片松散沙（`minecraft:sand`），只会集沙的沙丘娃（sandygast，会学这招；
 *   技能表只给这一招）站在沙上，附近没有敌人；开局被一次性压到自身最大生命约 55%，跨过阈值。
 *
 * 必然事实：施术者提交过集沙；结算后生命高于压血后的最低值（站在沙上，取得到沙）；
 *   并且地面的沙真的被取走（`changedBlocks` 里出现由 sand 变成空气的格子）。
 *   取沙量、回复比例与沙粒密度取决于等级、防御、体重与身高，写进 note。
 */
Smoke.scenario("shoreup", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:sand");
    stage.weather("clear");
    stage.time("day");

    var caster = stage.pokemon({ species: "sandygast", level: 55, moves: ["shoreup"], at: [-3, 0, 0] });

    var woundedAt = 0;
    stage.after(8, function () {
        var maximum = caster.health();
        var at = caster.position();
        stage.command("execute positioned " + at[0] + " " + at[1] + " " + at[2]
            + " run damage @e[type=cobblemon:pokemon,distance=..2,limit=1,sort=nearest] "
            + Math.max(1, Math.round(maximum * 0.45)) + " minecraft:generic");
        stage.after(4, function () { woundedAt = caster.health(); });
    });

    stage.until(900, function () {
        return stage.casts("shoreup", caster) >= 1 && woundedAt > 0;
    }, function () {
        stage.expect(stage.casts("shoreup", caster) >= 1, "the wounded sandygast gathered sand below the threshold");
        stage.after(60, function () {
            stage.expect(caster.health() > woundedAt + 3, "shoring up restored the caster");
            var consumed = stage.changedBlocks().some(function (change) { return change.before === "minecraft:sand"; });
            stage.expect(consumed, "shore up pulled loose sand out of the ground");
            stage.note("集沙按 grains 从探沙范围内挖走松散沙块（world.breakBlock，沙被消耗后留下挖开的状态），再按 heal 回复；heal 读取沙那一刻的散沙密度（身边 3×3 一层的沙块密度）与共享身份 world_combat:status/sandstorm，所以站在沙地上明显更足、沙暴中回到约 2/3。取沙量随等级、回复随防御与散沙密度、沙粒密度随体重、探沙范围随身高变化；沙暴分支需要另一个施法者的沙暴场地，留给完整装配的人工试玩。", {
                casterCasts: stage.casts("shoreup", caster),
                woundedHealth: Math.round(woundedAt * 10) / 10,
                casterHealthNow: Math.round(caster.health() * 10) / 10,
                sandCellsRemoved: stage.changedBlocks().filter(function (change) { return change.before === "minecraft:sand"; }).length,
                casterAlive: caster.alive(),
                tick: stage.tick()
            });
            stage.done();
        });
    }, "shore up is cast below the threshold within 45 s");
});
