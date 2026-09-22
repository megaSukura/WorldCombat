/**
 * 大快朵颐 / Stuff Cheeks —— 可执行设计说明。
 *
 * 一句话：贪心栗鼠把手里的树果整颗吃掉，防御撑起来；树果只有一颗，吃完就没得再吃。
 *
 * 场面：夜晚、铺一层石头地，避开僵尸白昼燃烧。只会大快朵颐的贪心栗鼠（greedent，这招的原学习者；技能表
 *   只给这一招）握着一颗文柚果（sitrus），与一只僵尸相隔 4 格并互为敌人——僵尸提供「有威胁」的出手理由，
 *   又打不死栗鼠，场面稳定。
 *
 * 必然事实：这招被提交过；并且整场只提交一次（树果被吃掉后手里空了，`ready` 与 AI 的 `available` 都不再成立）。
 *   防御等级、吸收系数、果屑数与护体半径取决于体重、物攻、速度与等级；果子自身的回复效果是确定的，
 *   但舞台接口不暴露能力等级，写进 note 供读轨迹判断。
 */
Smoke.scenario("stuffcheeks", function (stage) {
    stage.fill([-6, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.fill([-6, 0, -6], [8, 1, 6], "minecraft:air");
    stage.weather("clear");
    stage.time("night");

    var caster = stage.pokemon({ species: "greedent", level: 40, moves: ["stuffcheeks"], item: "cobblemon:sitrus_berry", at: [-2, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [2, 0, 0] });
    stage.hostile(caster, foe);

    stage.until(900, function () { return stage.casts("stuffcheeks", caster) >= 1; }, function () {
        stage.after(220, function () {
            stage.expect(stage.casts("stuffcheeks", caster) >= 1, "greedent committed stuff cheeks");
            stage.expect(stage.casts("stuffcheeks", caster) === 1, "the held berry was eaten, so the move could not be used a second time");
            stage.note("大快朵颐吃下自己携带的文柚果：果子效果（回复 25%×吸收系数）落到自己身上、防御 +guard 级，之后手里空了、无法再吃。若树果没有被消耗，冷却约 4.5 秒后 AI 会再次出手，故本场景用「整场只放一次」作为消耗的必然事实。防御等级随体重、吸收随物攻、果屑随体重与物攻、护体半径随身板变化；舞台接口不暴露能力等级，具体数值留给人工试玩。", {
                casterCasts: stage.casts("stuffcheeks", caster),
                casterHealth: Math.round(caster.health() * 10) / 10,
                casterAlive: caster.alive(),
                foeAlive: foe.alive(),
                tick: stage.tick()
            });
            stage.done();
        });
    }, "stuff cheeks eats its Berry once within 45 s");
});
