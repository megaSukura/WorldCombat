/**
 * 心之眼 / mindreader 的可执行设计说明。
 *
 * 场面：一只特攻型的勇基拉带着「心之眼 + 念力」对一只小拉达开战，隔开一段有视线的距离。技能表里的
 * 两招都由本仓库实现，AI 会先把这层读挂上，再出手把这次读用掉。
 * 必然事实：心之眼被提交过并支付 PP；施术者身上出现过共享身份 world_combat:status/mindreader；目标被
 * minecraft:glowing 照亮过（读穿可见）；这层读只对绑定目标按 aimRules 提高该配对的命中精度，不抬全局命中等级。
 * 趋势虚线只在客户端读出、是否只对所读目标兑现的时机写进 note。
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
        var accuracy = stage.stages(caster)["accuracy"] || 0;
        var pp = stage.pp(caster, "mindreader");
        stage.expect(stage.casts("mindreader", caster) > 0, "the read was committed");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/mindreader"), "the read window carried the shared mindreader identity");
        stage.expect(stage.hadMobEffect(foe, "minecraft:glowing"), "the target was revealed with glowing");
        // 这层读走目标成对精度（aimRules），不抬全局命中等级；这里正是要挡回全局窗口式的假命中增益。
        stage.expect(accuracy <= 0, "the read stays target-paired instead of raising a global accuracy stage");
        stage.expect(pp === null || pp < 5, "the read paid its PP cost");
        stage.after(200, function () {
            stage.note("心之眼只对绑定的那个目标生效：提交后按 focus 提高该配对的命中精度（NativeEffects.aimRules），不抬全局命中等级；目标照亮，窗口期间每 4 刻按目标真实速度画一条封顶 3 格、遇墙截断的趋势虚线（两端随目标整体平移、不反指）。只有打中所读目标、是 directOffense 直攻、且预算预约成功才兑现（DamageBudgets），毒/场伤等残伤与打其他目标都不消费。窗口时长随等级与亲密度、照亮随等级、读光随特攻、读距离随身高分别变化，执行与 AI 共用同一 reach。", {
                casterCasts: stage.casts("mindreader", caster),
                confusionCasts: stage.casts("confusion", caster),
                accuracyAtRead: accuracy,
                ppLeft: pp,
                damageByCaster: Math.round(stage.damageBy(caster) * 10) / 10,
                damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                foeAlive: foe.alive(),
                tick: stage.tick()
            });
            stage.done();
        });
    }, "mind reader is cast");
});
