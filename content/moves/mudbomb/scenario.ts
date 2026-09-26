/**
 * 泥巴炸弹的可执行设计说明。
 *
 * 场面：一只只会泥巴炸弹的施法者，对八格外的对手。泥弹直线飞出并炸开。
 * 必然事实：本招被提交过；对手受到过泥巴炸弹伤害；战场地板没有被换成泥。
 * 致盲是 30% 概率、级数由特攻决定；爆开泼溅与真实表面泥印见实现，写进 note 供读轨迹判断。
 */
Smoke.scenario("mudbomb", function (stage) {
    const caster = stage.pokemon({ species: "Graveler", level: 34, moves: ["mudbomb"], at: [-4, 0, 0] });
    const foe = stage.pokemon({ species: "Machop", level: 20, moves: ["tackle"], at: [4, 0, 0] });
    stage.watch([-8, -1, -4], [8, 2, 4]);
    stage.hostile(caster, foe);
    stage.until(700, function () { return stage.casts("mudbomb", caster) >= 1 && stage.damageTo(foe) > 0; }, function () {
        let mudded = false;
        const changed = stage.changedBlocks();
        for (let i = 0; i < changed.length; i++) if (changed[i].after === "minecraft:mud") mudded = true;
        stage.expect(stage.casts("mudbomb", caster) >= 1, "mudbomb was committed");
        stage.expect(stage.damageTo(foe) > 0, "the target took mudbomb damage");
        stage.expect(!mudded, "the floor was not changed into mud");
        stage.note("致盲只有 30% 概率（mudbomb.chance），命中下降级数由特攻决定；主目标留泥印、旁人吃较小泥粒，落点不再替换方块", {
            casts: stage.casts("mudbomb", caster), onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            changedBlocks: changed.length
        });
        stage.done();
    }, "mudbomb cast and hit");
});
