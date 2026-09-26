/**
 * 铁头 / ironhead 的可执行设计说明。
 *
 * 场面：只会铁头的可多拉（Lairon，钢／岩）对一只劫掠兽（ravager，100 血、自带部分击退抗性），
 * 贴身距离、夜间、劫掠兽 `noai` 站定，两者开战。
 * 必然事实：本招被提交过；目标受到过伤害（铁砧砸实）。
 * 本招是 `kind: "aim"`：手动可朝任意方向空顶，这里交给 AI 按仇恨推荐目标。
 * 劫掠兽的击退抗性让它只被推动一部分，仍能活下来看这一段真实位移；实际格数受抗性与原生碰撞限制，
 * 是否震懵、暴击也随机，全部写进 note 供读轨迹判断。
 */
Smoke.scenario("ironhead", function (stage) {
    stage.time("night");
    var caster = stage.pokemon({ species: "Lairon", level: 35, moves: ["ironhead"], at: [-1, 0, 0] });
    var foe = stage.mob({ type: "minecraft:ravager", at: [1, 0, 0] });
    stage.noai(foe);
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("ironhead", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("ironhead", caster) > 0, "ironhead was committed");
        stage.expect(stage.damageTo(foe) > 0, "the iron head slam dealt damage");
        stage.note("the flinch roll, crits and how far the resistant target was hurled are random/positional", {
            casts: stage.casts("ironhead", caster),
            onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            foeMoved: Math.round(stage.travelled(foe) * 10) / 10,
            foeKnockbackResistance: stage.attribute(foe, "minecraft:generic.knockback_resistance"),
            flinched: stage.hadMobEffect(foe, "world_combat:status/flinch"),
            foeAlive: foe.alive()
        });
        stage.done();
    }, "ironhead lands on a foe at close range");
});
