/**
 * 劈开 / slash —— 可执行设计说明。
 *
 * 一句话：站定举刃，朝身前一道窄而高的斜压刀面压下去；刃尖从高处斜下推进，扫到的非友方各挨一次，墙先截断够不到的刃段。
 *
 * 场面：一只只会劈开的猫鼬斩（45 级）对一只被点住、不会还手的铁傀儡（耐打又不会跑掉的靶子）。
 * 选取为 `kind: "aim"`，AI 仍按仇恨推荐这个敌人；判定与画面共用同一道被墙截短的斜刀面。
 * 断言只取必然事实：这招被提交过、目标受过伤害、每次出手对同一目标最多结算一次。暴击是否出现是随机的，写进 note。
 */
Smoke.scenario("slash", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "zangoose", level: 45, moves: ["slash"], at: [-2, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.noai(foe);
    stage.until(600, function () {
        return stage.casts("slash", caster) >= 2 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("slash", caster) >= 1, "caster committed slash");
        stage.expect(stage.damageTo(foe) > 0, "slash dealt damage to the foe");
        stage.expect(stage.hits(caster) <= stage.casts("slash", caster), "each slash settled the same body at most once");
        stage.note("the tip sweeps a real diagonal face from high down to the strike point; a wall would truncate the face first, so the blade never reaches behind it. Critical hits come from the native critRatio 2 roll and are shown by the crit moment.", {
            casts: stage.casts("slash", caster),
            hits: stage.hits(caster),
            damage: Math.round(stage.damageTo(foe) * 10) / 10,
            foeAlive: foe.alive()
        });
        stage.done();
    }, "slash lands within 30 s");
});
