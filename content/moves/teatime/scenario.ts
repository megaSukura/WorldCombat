/**
 * 茶会 / Teatime —— 可执行设计说明。
 *
 * 一句话：施法者在对手脚下摆开一席茶，茶香一飘，带树果的双方都忍不住吃掉自己那颗——受伤的对手于是把
 *   保命的文柚果提前吃掉了。
 *
 * 场面：晴天白天、铺一层草方块（茶席能落地）。只会茶会的来悲茶（polteageist，这招的学习者；技能表只给
 *   这一招）自己带着一颗橙果，与一只受伤、没有技能、携带文柚果的皮卡丘相隔 3 格并互为敌人。
 *
 * 必然事实：施术者提交过茶会；对手的树果被招呼吃掉、生命高于压血后的最低值（文柚果的回复是确定的）；
 *   落点真的铺下了茶席（`changedBlocks` 里出现地毯）。
 *   茶席半径、停留、茶汤浓度、茶气与杯盘数取决于等级、特防、特攻、亲密度与身高，写进 note。
 */
Smoke.scenario("teatime", function (stage) {
    stage.fill([-6, -1, -6], [8, -1, 6], "minecraft:grass_block");
    stage.fill([-6, 0, -6], [8, 1, 6], "minecraft:air");
    stage.weather("clear");
    stage.time("day");

    var caster = stage.pokemon({ species: "polteageist", level: 34, moves: ["teatime"], item: "cobblemon:oran_berry", at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "pikachu", level: 30, moves: [], item: "cobblemon:sitrus_berry", at: [0, 0, 0] });
    stage.hostile(caster, foe);

    var foeLow = 0;
    stage.after(8, function () {
        var at = foe.position(), max = foe.health();
        stage.command("execute positioned " + at[0] + " " + at[1] + " " + at[2]
            + " run damage @e[type=cobblemon:pokemon,distance=..1.2,limit=1,sort=nearest] "
            + Math.max(1, Math.round(max * 0.5)) + " minecraft:generic");
        stage.after(4, function () { foeLow = foe.health(); });
    });

    stage.until(900, function () {
        return foeLow > 0 && stage.casts("teatime", caster) >= 1 && foe.health() > foeLow;
    }, function () {
        stage.expect(stage.casts("teatime", caster) >= 1, "the caster held a tea party");
        stage.expect(foe.health() > foeLow, "the foe's held Berry was eaten and healed it on the spot");
        var laid = stage.changedBlocks().some(function (change) { return /azure_bluet|dandelion|short_grass|pink_petals/.test(change.after); });
        stage.expect(laid, "a tea mat of flowers and grass was laid at the selected point");
        stage.note("茶会以选定点为心，圈内每个带树果的战斗者（敌友与自己都算）吃掉自己那一颗、果子效果落到本人身上；对手的保命文柚果因此被提前吃掉并回复了它。茶席半径随等级与特防、停留随等级与亲密度、茶汤浓度随特攻、茶气随特攻与身高、杯盘随等级与身量变化；盛宴档更广更久更浓但更慢。落点的茶席（花与草）以 world.terrain 租借、linger，到期原方块回来。", {
            casterCasts: stage.casts("teatime", caster),
            foeLow: Math.round(foeLow * 10) / 10,
            foeNow: Math.round(foe.health() * 10) / 10,
            laid: stage.changedBlocks().filter(function (change) { return /azure_bluet|dandelion|short_grass|pink_petals/.test(change.after); }).length,
            casterAlive: caster.alive(),
            foeAlive: foe.alive(),
            tick: stage.tick()
        });
        stage.done();
    }, "teatime strips and triggers the foe's Berry within 45 s");
});
