/**
 * 心之眼 / mindreader 的可执行设计说明。
 *
 * 场面：一只特攻型的凯西（勇基拉）带着「心之眼 + 念力」对一只小拉达开战，隔开一段有视线的距离。技能表里的
 * 两招都由本仓库实现，AI 会先把准星读满，再出手把这次读用掉。
 * 必然事实：心之眼被提交过；施术者身上出现过共享身份 world_combat:status/mindreader；目标被 minecraft:glowing
 * 照亮过（读穿可见）。命中等级是否真的拉到 6 级（私有装配没有读取原生能力等级的读取原语）与何时兑现，写进 note。
 */
Smoke.scenario("mindreader", function (stage) {
    stage.fill([-10, -1, -10], [10, -1, 10], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "kadabra", level: 34, moves: ["mindreader", "confusion"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "rattata", level: 16, moves: ["tackle"], at: [4, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("mindreader", caster) > 0
            && stage.hadMobEffect(caster, "world_combat:status/mindreader")
            && stage.hadMobEffect(foe, "minecraft:glowing");
    }, function () {
        stage.expect(stage.casts("mindreader", caster) > 0, "the read was committed");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/mindreader"), "the read window carried the shared mindreader identity");
        stage.expect(stage.hadMobEffect(foe, "minecraft:glowing"), "the target was revealed with glowing");
        stage.after(200, function () {
            stage.note("心之眼把施法者的命中等级拉到满、目标照亮；下一次伤害命中时由入场规则用掉并原样收回等级。实际命中等级与兑现时机由共享结算与本场时机决定，留给完整装配的人工试玩。窗口时长随等级与亲密度、照亮随等级、读光随特攻、距离随身高分别变化。", {
                casterCasts: stage.casts("mindreader", caster),
                confusionCasts: stage.casts("confusion", caster),
                damageByCaster: Math.round(stage.damageBy(caster) * 10) / 10,
                damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                foeAlive: foe.alive(),
                tick: stage.tick()
            });
            stage.done();
        });
    }, "mind reader is cast");
});
