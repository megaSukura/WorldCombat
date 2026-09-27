/**
 * 识破 / foresight 的可执行设计说明。
 *
 * 场面：一只带「识破」的伊布对一只幽灵属性的鬼斯开战，隔开一段有视线的距离；鬼斯被冻结不动，
 *   角色绑定后再垫 +3 级外部闪避，用来验证识破只撤自己这一份、窗口结束原样还回。
 * 必然事实：识破被提交过；目标身上出现过共享身份 world_combat:status/foresight 的印记，并被 minecraft:glowing
 *   照亮过；印记窗口内它当前的正闪避被压到 0 或更低，窗口走完后回到外来的 +3（不凭空返级）。
 * 已知边界：共享的伤害预览不携带目标，伙伴 AI 的招式评分看不到这层身份，因此它会在挂上印记后仍避开一般／格斗招；
 *   实影闪与兑现要等玩家操控的队友或手动输入才会出现。是否真的在场上兑现这一击写进 note，留给完整装配的人工试玩。
 */
Smoke.scenario("foresight", function (stage) {
    stage.fill([-10, -1, -10], [10, -1, 10], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "eevee", level: 30, moves: ["foresight"], at: [-3, 0, 0] });
    var target = stage.pokemon({ species: "gastly", level: 40, moves: ["lick"], at: [3, 0, 0] });
    stage.hostile(caster, target);
    stage.noai(target);
    stage.setPp(caster, "foresight", 1);
    stage.after(3, function () {
        // 角色绑定后再由外部来源垫 +3 级持久闪避；窗口结束必须原样保留这份外来的等级。
        stage.boost(target, { evasion: 3 });
        stage.until(1200, function () {
            return stage.casts("foresight", caster) > 0
                && stage.hadMobEffect(target, "world_combat:status/foresight")
                && stage.hadMobEffect(target, "minecraft:glowing");
        }, function () {
            stage.expect(stage.casts("foresight", caster) > 0, "the foreknowledge was committed");
            stage.expect(stage.hadMobEffect(target, "world_combat:status/foresight"), "the target carried the shared foresight identity");
            stage.expect(stage.hadMobEffect(target, "minecraft:glowing"), "the target was revealed with glowing");
            stage.expect((stage.stages(target).evasion || 0) <= 0, "the marked target's positive evasion is actually stripped inside the window");
            stage.after(280, function () {
                stage.expect(!stage.hasMobEffect(target, "world_combat:status/foresight"), "the mark expires after its window");
                stage.expect((stage.stages(target).evasion || 0) === 3, "expiry returns exactly the external +3, minting no extra stage");
                stage.note("识破把共享身份挂在目标身上并照亮它；目标的正闪避由 boostWindow 绑在印记载体上临时下降，印记一结束只收回本招这一份，外来的 +3 原样保留。PokemonDamage.metadata 在结算前读这层身份把目标属性里的 ghost 摘掉，一般与格斗因此接得上，并在真正造成伤害（damage_applied 的 actual > 0）时炸一次实影闪。共享伤害预览不携带目标，伙伴 AI 评分仍按原生属性看，兑现由玩家操控的队友或手动输入完成。窗口时长随等级与速度、照亮随等级、目光数随物攻、距离随身高分别变化；AI 只在目标有幽灵属性、正闪避或队伍最近真的打出一股一般/格斗攻击时才提高优先级。", {
                    foresightCasts: stage.casts("foresight", caster),
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
});
