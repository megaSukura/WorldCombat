/**
 * 气味侦测 / odorsleuth 的可执行设计说明。
 *
 * 场面：一只带「气味侦测 + 撞击」的尾立对一只幽灵属性的鬼斯开战，隔开一段有视线的距离。撞击是一般属性招式，
 *   对幽灵属性本来免疫；气味印记挂上之后，一般属性才接得上。
 * 必然事实：气味侦测被提交过；目标身上出现过共享身份 world_combat:status/foresight 与
 *   world_combat:status/odorsleuth 的印记，并被 minecraft:glowing 照亮过。拖慢比例、窗口多久、剥掉几级闪避
 *   由时机与共享结算决定，写进 note。
 */
Smoke.scenario("odorsleuth", function (stage) {
    stage.fill([-10, -1, -10], [10, -1, 10], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "sentret", level: 30, moves: ["odorsleuth", "tackle"], at: [-3, 0, 0] });
    var target = stage.pokemon({ species: "gastly", level: 30, moves: ["lick"], at: [3, 0, 0] });
    stage.hostile(caster, target);
    stage.until(900, function () {
        return stage.casts("odorsleuth", caster) > 0
            && stage.hadMobEffect(target, "world_combat:status/foresight")
            && stage.hadMobEffect(target, "minecraft:glowing");
    }, function () {
        stage.expect(stage.casts("odorsleuth", caster) > 0, "the scent trail was committed");
        stage.expect(stage.hadMobEffect(target, "world_combat:status/foresight"), "the target carried the shared foresight identity");
        stage.expect(stage.hadMobEffect(target, "world_combat:status/odorsleuth"), "the target carried this move's own scent identity");
        stage.expect(stage.hadMobEffect(target, "minecraft:glowing"), "the target was revealed with glowing");
        stage.after(120, function () {
            stage.note("气味侦测与识破共用 world_combat:status/foresight 身份，所以一般/格斗同样接得上；额外之处是 world_combat:navigate 读取印记按 drag 拖慢目标，以及更长的窗口。拖慢多少、窗口多久、这一击是否真的落地由 AI 选择与共享结算决定，留给完整装配的人工试玩。窗口随等级与亲密度、照亮随等级、拖慢随等级、气味数随物攻、距离随身高分别变化。", {
                casts: stage.casts("odorsleuth", caster),
                tackleCasts: stage.casts("tackle", caster),
                damageToTarget: Math.round(stage.damageTo(target) * 10) / 10,
                travelledTarget: Math.round(stage.travelled(target) * 10) / 10,
                targetAlive: target.alive(),
                tick: stage.tick()
            });
            stage.done();
        });
    }, "scent marks and reveals the ghost");
});
