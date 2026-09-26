/**
 * 心之眼 / mindreader 的可执行设计说明。
 *
 * 场面：一只特攻型的勇基拉带着「心之眼 + 念力」对一只小拉达开战，隔开一段有视线的距离。技能表里的
 * 两招都由本仓库实现，AI 会先把准星读满，再出手把这次读用掉。
 * 必然事实：心之眼被提交过；施术者身上出现过共享身份 world_combat:status/mindreader；目标被 minecraft:glowing
 * 照亮过（读穿可见）。命中等级是否真的被抬起、趋势虚线是否更新、是否只对所读目标兑现，写进 note：
 * 命中等级由 boostWindow 拥有并绑在本招载体上，目标运动趋势只在客户端读出，私有装配里没有读取这些的渲染原语。
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
            stage.note("心之眼把施法者命中等级由 boostWindow 抬起、目标照亮，并在窗口期间每 4 刻按目标真实速度画一条封顶 3 格、遇墙截断的趋势虚线；只有打中所读目标且造成真实伤害才兑现并收回命中等级，打其他目标不消耗。趋势线只表示当前运动趋势，命中等级实际级数与兑现时机由共享结算与本场时机决定，留给完整装配的人工试玩。窗口时长随等级与亲密度、照亮随等级、读光随特攻、读距离随身高分别变化，执行与 AI 共用同一 reach。", {
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
