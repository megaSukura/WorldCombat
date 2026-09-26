// 玩泥巴的可执行设计说明：让一只会玩泥巴的宝可梦对着确知电攻的对手（带电击波的皮卡丘）铺一片泥滩。
// 必然事实：玩泥巴被放出来过；泥滩里的活体身上出现过共享身份 world_combat:status/mudsport；
// 泥滩只以薄泥面标出范围，不把地表方块换成泥（本招不再替换地表）。电招被压需要双方真的用电招交手，
// 属随机/环境结果，写进 note 供完整装配试玩核对。
Smoke.scenario("mudsport", function (stage) {
    stage.weather("clear");
    stage.time("day");
    for (let dx = -5; dx <= 5; dx++) for (let dz = -5; dz <= 5; dz++) stage.block([dx, -1, dz], "minecraft:grass_block");
    const caster = stage.pokemon({ species: "psyduck", level: 34, moves: ["mudsport"], at: [-1, 0, 0] });
    const foe = stage.pokemon({ species: "pikachu", level: 22, moves: ["thundershock"], at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("mudsport", caster) > 0
            && (stage.hadMobEffect(caster, "world_combat:status/mudsport") || stage.hadMobEffect(foe, "world_combat:status/mudsport"));
    }, function () {
        const changed = stage.changedBlocks();
        stage.expect(stage.casts("mudsport", caster) > 0, "mudsport was cast");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/mudsport") || stage.hadMobEffect(foe, "world_combat:status/mudsport"),
            "a body standing in the mud carried the shared mudsport identity");
        stage.expect(!changed.some(function (c) { return c.after === "minecraft:mud"; }),
            "the mudflat marks its range with a thin film and replaces no ground block");
        stage.note("泥滩按在施法者脚下并罩住贴近的对手（ai.advance 默认关闭）；AI 只在确知对手会电攻时才铺（皮卡丘带电击波）。泥里的活体糊泥（另带共享的 mud 身份），电招威力按 electricFactor 被压；范围由贴地薄泥面表现，地表方块不被替换。radius/时长/电招系数随身高/等级/特攻/特防变化，薄泥面点数随速度变化，厚泥与稀泥各有取舍。", {
            casts: stage.casts("mudsport", caster),
            casterMud: stage.hadMobEffect(caster, "world_combat:status/mudsport"),
            foeMud: stage.hadMobEffect(foe, "world_combat:status/mudsport"),
            changedBlocks: changed.length
        });
        stage.done();
    }, "mudsport coats the pair");
});
