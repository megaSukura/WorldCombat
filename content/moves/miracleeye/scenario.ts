/**
 * 奇迹之眼 / miracleeye 的可执行设计说明。
 *
 * 场面：一只带「奇迹之眼 + 意念头锤」的玛沙那对一只恶属性的土狼犬开战，隔开一段有视线的距离。意念头锤是接触的
 *   超能属性招式，对恶属性本来免疫；心眼印记挂上、dark 被摘掉之后，超能才接得上。
 * 必然事实：奇迹之眼被提交过；目标身上出现过共享身份 world_combat:status/miracleeye 的心眼，并被
 *   minecraft:glowing 照亮过；施法者自己抬命中时带过 world_combat:status/miracleeye_focus（两端分开到期）。
 * 已知边界：共享的伤害预览不携带目标，伙伴 AI 的招式评分看不到这层身份，因此它会在挂上印记后仍避开超能招；
 *   兑现由玩家操控的队友或手动输入完成。这一击是否真的落地写进 note，留给完整装配的人工试玩。
 */
Smoke.scenario("miracleeye", function (stage) {
    stage.fill([-10, -1, -10], [10, -1, 10], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "meditite", level: 30, moves: ["miracleeye", "zenheadbutt"], at: [-3, 0, 0] });
    var target = stage.pokemon({ species: "poochyena", level: 30, moves: ["tackle"], at: [3, 0, 0] });
    stage.hostile(caster, target);
    stage.until(900, function () {
        return stage.casts("miracleeye", caster) > 0
            && stage.hadMobEffect(target, "world_combat:status/miracleeye")
            && stage.hadMobEffect(target, "minecraft:glowing")
            && stage.hadMobEffect(caster, "world_combat:status/miracleeye_focus");
    }, function () {
        stage.expect(stage.casts("miracleeye", caster) > 0, "the eye of insight was committed");
        stage.expect(stage.hadMobEffect(target, "world_combat:status/miracleeye"), "the target carried the shared miracleeye identity");
        stage.expect(stage.hadMobEffect(target, "minecraft:glowing"), "the target was revealed with glowing");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/miracleeye_focus"), "the caster carried its own self-focus identity");
        stage.after(120, function () {
            stage.note("奇迹之眼把共享身份挂在目标身上并照亮它；PokemonDamage.metadata 结算前把目标属性里的恶（dark）摘掉，超能因此接得上（此前对它为 0）。施法者同时在自专注窗口里被抬了命中，这段命中是绑定在 world_combat:miracleeye_focus 上的独立窗口，和目标印记分开到期。共享伤害预览不携带目标，伙伴 AI 评分仍按原生属性看，因此它此刻可能仍不用意念头锤；兑现由玩家操控的队友或手动输入完成。窗口、闪避剥离与心见级数由共享结算决定。窗口随等级与特攻、照亮随等级、自专注随等级与特攻、心眼数随特攻、距离随身高分别变化。", {
                casts: stage.casts("miracleeye", caster),
                zenheadbuttCasts: stage.casts("zenheadbutt", caster),
                damageToTarget: Math.round(stage.damageTo(target) * 10) / 10,
                casterStages: stage.stages(caster),
                targetStages: stage.stages(target),
                targetAlive: target.alive(),
                tick: stage.tick()
            });
            stage.done();
        });
    }, "miracle eye marks and reveals the dark target");
});
