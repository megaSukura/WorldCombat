/**
 * 薄雾炸裂 / mistyexplosion 的可执行设计说明。
 *
 * 场面：一只会薄雾炸裂的妖精（Clefairy）站在三只低等级对手中间——逼出「一次罩住一圈」的局面，
 *   让 AI 的 `ai.minFoes`（默认 2）条件成立。三只对手只会「跃起」、不还手，确保施法者在引爆前不会被提前打空。
 *
 * 断言只取必然事实：这招被提交过；至少一个目标挨到伤害；**使用者倒下**（原生 selfdestruct:"always"）；
 *   被罩住的目标被致盲。命中几个、暴击、残雾范围与「薄雾加成」（需要薄雾场地或既有残雾，单招场景里
 *   无法合法制造）写进 note。
 */
Smoke.scenario("mistyexplosion", function (stage) {
    stage.fill([-10, -1, -8], [10, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Clefairy", level: 40, moves: ["mistyexplosion"], at: [0, 0, 0] });
    var foeA = stage.pokemon({ species: "Rattata", level: 25, moves: ["splash"], at: [2.2, 0, 0] });
    var foeB = stage.pokemon({ species: "Rattata", level: 25, moves: ["splash"], at: [1.8, 0, 1.8] });
    var foeC = stage.pokemon({ species: "Rattata", level: 25, moves: ["splash"], at: [1.8, 0, -1.8] });
    stage.hostile(caster, foeA);
    stage.hostile(caster, foeB);
    stage.hostile(caster, foeC);
    stage.until(900, function () {
        return stage.casts("mistyexplosion", caster) > 0 && (stage.damageTo(foeA) > 0 || stage.damageTo(foeB) > 0 || stage.damageTo(foeC) > 0);
    }, function () {
        stage.after(16, function () {
            stage.expect(stage.casts("mistyexplosion", caster) > 0, "clefairy committed mistyexplosion");
            stage.expect(stage.damageTo(foeA) > 0 || stage.damageTo(foeB) > 0 || stage.damageTo(foeC) > 0, "the mist bloom dealt damage inside the ring");
            stage.expect(!caster.alive(), "the user fainted even though the move was used (selfdestruct: always)");
            stage.expect(stage.hadMobEffect(foeA, "minecraft:blindness") || stage.hadMobEffect(foeB, "minecraft:blindness") || stage.hadMobEffect(foeC, "minecraft:blindness"),
                "the mist blinded at least one caught target");
            stage.note("原生 selfdestruct:\"always\"——有没有炸到使用者都倒下；命中几个、暴击、残雾范围与时长随局面变化。薄雾加成需要脚下已有薄雾（薄雾场地或上一次残雾），单招场景里无法合法制造，故不在此断言", {
                casts: stage.casts("mistyexplosion", caster),
                foeADamage: Math.round(stage.damageTo(foeA) * 10) / 10,
                foeBDamage: Math.round(stage.damageTo(foeB) * 10) / 10,
                foeCDamage: Math.round(stage.damageTo(foeC) * 10) / 10,
                casterAlive: caster.alive(),
                blindedA: stage.hadMobEffect(foeA, "minecraft:blindness"),
                blindedB: stage.hadMobEffect(foeB, "minecraft:blindness"),
                blindedC: stage.hadMobEffect(foeC, "minecraft:blindness")
            });
            stage.done();
        });
    }, "mistyexplosion blooms and the user faints within 45 s");
});
