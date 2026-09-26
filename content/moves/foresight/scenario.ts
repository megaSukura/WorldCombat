/**
 * 识破 / foresight 的可执行设计说明。
 *
 * 场面：一只带「识破 + 撞击」的伊布对一只幽灵属性的鬼斯开战，隔开一段有视线的距离。撞击是一般属性招式，
 *   对幽灵属性本来免疫；识破把印记挂上之后，一般属性才接得上。
 * 必然事实：识破被提交过；目标身上出现过共享身份 world_combat:status/foresight 的印记，并被 minecraft:glowing
 *   照亮过。印记之后由 PokemonDamage.metadata 把 ghost 摘掉并在目标身上炸一次实影闪。
 * 已知边界：共享的伤害预览不携带目标，伙伴 AI 的招式评分看不到这层身份，因此它会在挂上印记后仍避开一般／格斗招；
 *   实影闪与兑现要等玩家操控的队友或手动输入才会出现。是否真的在场上兑现这一击写进 note，留给完整装配的人工试玩。
 */
Smoke.scenario("foresight", function (stage) {
    stage.fill([-10, -1, -10], [10, -1, 10], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "eevee", level: 30, moves: ["foresight", "tackle"], at: [-3, 0, 0] });
    var target = stage.pokemon({ species: "gastly", level: 30, moves: ["lick"], at: [3, 0, 0] });
    stage.hostile(caster, target);
    stage.until(900, function () {
        return stage.casts("foresight", caster) > 0
            && stage.hadMobEffect(target, "world_combat:status/foresight")
            && stage.hadMobEffect(target, "minecraft:glowing");
    }, function () {
        stage.expect(stage.casts("foresight", caster) > 0, "the foreknowledge was committed");
        stage.expect(stage.hadMobEffect(target, "world_combat:status/foresight"), "the target carried the shared foresight identity");
        stage.expect(stage.hadMobEffect(target, "minecraft:glowing"), "the target was revealed with glowing");
        stage.after(120, function () {
            stage.note("识破把共享身份挂在目标身上并照亮它；PokemonDamage.metadata 在结算前读这层身份把目标属性里的 ghost 摘掉，一般与格斗因此接得上，并在目标身上炸一次实影闪。共享伤害预览不携带目标，伙伴 AI 评分仍按原生属性看，因此它此刻可能仍不用撞击；兑现由玩家操控的队友或手动输入完成。窗口时长、剥掉几级闪避由共享结算决定。窗口随等级与速度、照亮随等级、闪避剥离随等级、目光数随物攻、距离随身高分别变化。", {
                foresightCasts: stage.casts("foresight", caster),
                tackleCasts: stage.casts("tackle", caster),
                damageToTarget: Math.round(stage.damageTo(target) * 10) / 10,
                damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                casterStages: stage.stages(caster),
                targetStages: stage.stages(target),
                targetAlive: target.alive(),
                tick: stage.tick()
            });
            stage.done();
        });
    }, "foresight marks and reveals the ghost");
});
