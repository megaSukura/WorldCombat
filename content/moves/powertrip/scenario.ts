/**
 * 嚣张 / powertrip —— 可执行设计说明。
 *
 * 一句话：把攒下的能力等级摆成一身风羽，朝瞄准的路线直冲过去，一路上按碰撞顺序撞开每个接触。
 *
 * 场面：一只只会嚣张的阿勃梭鲁（35 级）对着同一路线上紧挨着的两只只会「跃起」的小拉达；
 *   开打前先给施法者叠两级物攻，并选猛进式（最多撞两人）。AI 要先走近到冲撞距离内再撞，
 *   逼出「接近 → 接触 → 穿身 → 第二个接触」的完整过程。
 * 必然事实：仅给一次出招的 PP，两只目标按先后顺序各挨到这一撞；冲撞结束后施法者的正面物攻等级仍然存在。
 * 撞了多远、顶开多少、暴击与否写进 note；威力随架势走的具体倍率由公式与悬浮说明展示。
 * 无敌人时本招是自由 aim，可朝空点冲。
 */
Smoke.scenario("powertrip", function (stage) {
    stage.fill([-12, -1, -8], [12, -1, 8], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "absol", level: 35, moves: ["powertrip"], at: [-5, 0, 0] });
    var first = stage.pokemon({ species: "rattata", level: 12, moves: ["splash"], at: [0, 0, 0] });
    var second = stage.pokemon({ species: "rattata", level: 12, moves: ["splash"], at: [0.9, 0, 0] });
    // 钉住两只标靶：它们只用来量「一路两个接触」，不参与逃跑，保证冲线可复现。
    stage.noai(first);
    stage.noai(second);
    stage.hostile(caster, first);
    stage.hostile(caster, second);
    // boost／prefer 必须在角色绑定之后：用 after 等一帧，让 AI 起身前就看到这两级架势与猛进式。
    stage.after(2, function () {
        stage.boost(caster, { atk: 2 });
        stage.setPp(caster, "powertrip", 1);
        stage.prefer(caster, "powertrip", { drive: true });
    });
    stage.until(1200, function () {
        return stage.casts("powertrip", caster) > 0 && stage.damageTo(first) > 0 && stage.damageTo(second) > 0;
    }, function () {
        stage.after(16, function () {
            stage.expect(stage.casts("powertrip", caster) === 1, "absol committed its single available power trip");
            stage.expect(stage.damageTo(first) > 0 && stage.damageTo(second) > 0,
                "the drive charge reached two adjacent enemies in collision order");
            stage.expect(stage.hits(first, true) === 1 && stage.hits(second, true) === 1 && stage.hits(caster) === 2,
                "one drive charge hit both adjacent bodies exactly once each");
            stage.expect((stage.stages(caster).atk || 0) > 0, "the charge spent none of the caster's own boosts");
            stage.note("two staged attack levels feed the rush and survive it; the drive form carries the same charge through the first body into the second", {
                casts: stage.casts("powertrip", caster),
                onFirst: Math.round(stage.damageTo(first) * 10) / 10,
                onSecond: Math.round(stage.damageTo(second) * 10) / 10,
                casterMoved: Math.round(stage.travelled(caster) * 10) / 10,
                atkAfter: stage.stages(caster).atk
            });
            stage.done();
        });
    }, "power trip ploughs through two adjacent enemies within 60 s");
});
