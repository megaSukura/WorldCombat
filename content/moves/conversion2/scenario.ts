/**
 * 纹理２的可执行设计说明。
 *
 * 场面：一只只会纹理２的多边兽２对一只贴身的僵尸开战。僵尸的原生近战是真正发生的进攻（不是脚本伤害），
 *   会带时间戳地写进它的最近进攻记忆；纹理２便读得到真实原生 damageType（minecraft:mob_attack）与物理类别，
 *   走普通生物那一支：用共享 CombatCopies.resist 对那一型原生伤害减伤，并把可见承载状态挂到自己身上。
 * 必然事实：纹理２被提交过（预检要求目标已有可读的、未过 memory 的最近原生进攻）；承载状态
 *   world_combat:conversion2_type 真的挂到了多边兽２身上。
 * 随机结果：僵尸何时打中、被打中几次、改成 25% 还是 50% 减伤写进 note 供读轨迹判断。
 * 减伤层走共享 CombatCopies.resist，smoke 无法直接读；改动记在 note 里。
 * 宝可梦那一支（读真实元素、用 CombatTypes.replace 重织属性）在同一执行里，需要目标宝可梦最近提交过招式，
 *   本场的私有装配不适合稳定制造，故不布置；那一支的源码路径与承载状态共用同一段执行。
 */
Smoke.scenario("conversion2", function (stage) {
    var caster = stage.pokemon({ species: "Porygon2", level: 40, moves: ["conversion2"], at: [-2, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [1, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("conversion2", caster) >= 1 && stage.hadMobEffect(caster, "world_combat:conversion2_type");
    }, function () {
        stage.expect(stage.casts("conversion2", caster) >= 1, "conversion2 was committed");
        stage.expect(stage.hadMobEffect(caster, "world_combat:conversion2_type"),
            "the carry status was applied so the resist layer could own its lifetime");
        stage.note("conversion2 committed against a native melee attacker; the resist layer is applied through the shared CombatCopies.resist for the real damage type read from the foe's timestamped recent attack", {
            casts: stage.casts("conversion2", caster),
            damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
            damageToFoe: Math.round(stage.damageTo(foe) * 10) / 10
        });
        stage.done();
    }, "conversion2 cast");
});
