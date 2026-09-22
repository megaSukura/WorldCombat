// 玩泥巴的可执行设计说明：让一只会玩泥巴的宝可梦对着电属性的对手铺一片泥滩。
// 必然事实：玩泥巴被放出来过；泥滩里的活体身上出现过共享身份 world_combat:status/mudsport；
// 泥滩把地表方块租借成了泥。电招被压需要真正的电属性招式，属随机/环境结果，写进 note 供完整装配试玩核对。
Smoke.scenario("mudsport", function (stage) {
    stage.weather("clear");
    stage.time("day");
    for (let dx = -5; dx <= 5; dx++) for (let dz = -5; dz <= 5; dz++) stage.block([dx, -1, dz], "minecraft:grass_block");
    const caster = stage.pokemon({ species: "psyduck", level: 34, moves: ["mudsport"], at: [-1, 0, 0] });
    const foe = stage.pokemon({ species: "pikachu", level: 22, moves: [], at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("mudsport", caster) > 0
            && (stage.hadMobEffect(caster, "world_combat:status/mudsport") || stage.hadMobEffect(foe, "world_combat:status/mudsport"));
    }, function () {
        const changed = stage.changedBlocks();
        stage.expect(stage.casts("mudsport", caster) > 0, "mudsport was cast");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/mudsport") || stage.hadMobEffect(foe, "world_combat:status/mudsport"),
            "a body standing in the mud carried the shared mudsport identity");
        stage.expect(changed.some(function (c) { return c.after === "minecraft:mud"; }), "the mudflat turned part of the ground to mud");
        stage.note("泥滩按在施法者脚下并罩住贴近的对手（ai.advance 默认关闭）；泥里的活体糊泥（另带共享的 mud 身份），电招威力按 electricFactor 被压，地表方块被租借成泥、到期回来。radius/时长/电招系数随身高/等级/特攻/特防变化，厚泥与稀泥各有取舍。", {
            casts: stage.casts("mudsport", caster),
            casterMud: stage.hadMobEffect(caster, "world_combat:status/mudsport"),
            foeMud: stage.hadMobEffect(foe, "world_combat:status/mudsport"),
            changed: changed.length
        });
        stage.done();
    }, "mudsport coats the pair");
});
