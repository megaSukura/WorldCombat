/**
 * 奇迹之眼 / miracleeye 的可执行设计说明。
 *
 * 场面：一只带「奇迹之眼 + 意念头锤」的玛沙那对一只恶属性的土狼犬开战，隔开一段有视线的距离。意念头锤是接触的
 *   超能属性招式，对恶属性本来免疫；心眼印记挂上之后，超能才接得上。
 * 必然事实：奇迹之眼被提交过；目标身上出现过共享身份 world_combat:status/miracleeye 的心眼，并被
 *   minecraft:glowing 照亮过。窗口多久、剥掉几级闪避、抬了几级命中由时机与共享结算决定，写进 note。
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
            && stage.hadMobEffect(target, "minecraft:glowing");
    }, function () {
        stage.expect(stage.casts("miracleeye", caster) > 0, "the eye of insight was committed");
        stage.expect(stage.hadMobEffect(target, "world_combat:status/miracleeye"), "the target carried the shared miracleeye identity");
        stage.expect(stage.hadMobEffect(target, "minecraft:glowing"), "the target was revealed with glowing");
        stage.after(120, function () {
                            stage.note("奇迹之眼把共享身份挂在目标身上并照亮它；PokemonDamage.metadata 结算前把目标属性里的恶（dark）摘掉，超能因此接得上（此前对它为 0）；施法者同时被抬了几级命中。这一击是否真的落地取决于 AI 何时选择超能招与印记是否还在窗口内；窗口、闪避剥离与心见级数由共享结算决定，留给完整装配的人工试玩。窗口随等级与特攻、照亮随等级、心见随特攻、心眼数随特攻、距离随身高分别变化。", {
                casts: stage.casts("miracleeye", caster),
                zenheadbuttCasts: stage.casts("zenheadbutt", caster),
                damageToTarget: Math.round(stage.damageTo(target) * 10) / 10,
                targetAlive: target.alive(),
                tick: stage.tick()
            });
            stage.done();
        });
    }, "miracle eye marks and reveals the dark target");
});
