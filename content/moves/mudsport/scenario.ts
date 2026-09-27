// 玩泥巴的可执行设计说明：让一只会玩泥巴的宝可梦对着确知电攻的对手（带电击波的皮卡丘）铺一片泥滩。
// 必然事实：玩泥巴被放出来过；真实踩在泥面上的活体身上出现了共享身份 world_combat:status/mudsport，
// 并且它的移动速度被泥地压低；泥滩只以薄泥面标出范围，不把地表方块换成泥。
// 电招被压需要双方真的交手用电招，属随机/环境结果，写进 note 供完整装配试玩核对。
Smoke.scenario("mudsport", function (stage) {
    stage.weather("clear");
    stage.time("day");
    for (let dx = -5; dx <= 5; dx++) for (let dz = -5; dz <= 5; dz++) stage.block([dx, -1, dz], "minecraft:grass_block");
    const caster = stage.pokemon({ species: "psyduck", level: 34, moves: ["mudsport"], at: [-1, 0, 0] });
    const foe = stage.pokemon({ species: "pikachu", level: 22, moves: ["thundershock"], at: [2, 0, 0] });
    stage.hostile(caster, foe);
    const casterBase = stage.attribute(caster, "minecraft:generic.movement_speed");
    const foeBase = stage.attribute(foe, "minecraft:generic.movement_speed");
    stage.until(900, function () {
        return stage.casts("mudsport", caster) > 0
            && (stage.hasMobEffect(caster, "world_combat:status/mudsport") || stage.hasMobEffect(foe, "world_combat:status/mudsport"));
    }, function () {
        const changed = stage.changedBlocks();
        const casterMud = stage.hasMobEffect(caster, "world_combat:status/mudsport");
        const foeMud = stage.hasMobEffect(foe, "world_combat:status/mudsport");
        const speed = casterMud ? stage.attribute(caster, "minecraft:generic.movement_speed") : stage.attribute(foe, "minecraft:generic.movement_speed");
        const base = casterMud ? casterBase : foeBase;
        stage.expect(stage.casts("mudsport", caster) > 0, "mudsport was cast");
        stage.expect(casterMud || foeMud, "a grounded body standing in the mud carried the shared mudsport identity");
        stage.expect(speed < base - 0.0001, "the mudflat lowered the grounded body's movement speed");
        stage.expect(!changed.some(function (c) { return c.after === "minecraft:mud"; }),
            "the mudflat marks its range with a thin film and replaces no ground block");
        stage.note("泥滩按在施法者脚下并罩住贴近的对手（ai.advance 默认关闭）；AI 只在可见威胁靠近时铺，电攻威胁优先。只有真实脚底踩在泥面上的活体才糊泥（另带共享的 mud 身份）：移动速度上限降低 15%，电招威力按 electricFactor 被压；离地或离场立即撤销，范围由贴地薄泥面表现，地表方块不被替换。radius/时长/电招系数随身高/等级/特攻/特防变化，薄泥面点数随速度变化，厚泥与稀泥各有取舍。", {
            casts: stage.casts("mudsport", caster),
            casterMud: casterMud,
            foeMud: foeMud,
            casterSpeed: [Math.round(casterBase * 1000) / 1000, Math.round(stage.attribute(caster, "minecraft:generic.movement_speed") * 1000) / 1000],
            foeSpeed: [Math.round(foeBase * 1000) / 1000, Math.round(stage.attribute(foe, "minecraft:generic.movement_speed") * 1000) / 1000],
            changedBlocks: changed.length
        });
        stage.done();
    }, "mudsport coats the pair");
});
