/**
 * 嚣张 / powertrip —— 可执行设计说明。
 *
 * 一句话：把攒下的能力等级摆成一身气焰，朝选中的对手直冲过去一头撞上。
 *
 * 场面：一只只会嚣张的阿勃梭鲁（35 级）在 6 格外对一只只会「跃起」、不还手的小拉达；
 *   AI 要先走近到冲撞距离内再撞，逼出「接近 → 接触冲撞」的完整过程。
 * 必然事实：本招被提交过；目标挨到过这一撞。撞了多远、顶开多少、暴击与否写进 note。
 * 本次场上没有架势层数，威力取基础档；玩家实际操作时先叠等级再冲（猛进式还能一次撞穿两个人）。
 */
Smoke.scenario("powertrip", function (stage) {
    stage.fill([-12, -1, -8], [12, -1, 8], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "absol", level: 35, moves: ["powertrip"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "rattata", level: 12, moves: ["splash"], at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("powertrip", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(16, function () {
            stage.expect(stage.casts("powertrip", caster) > 0, "absol committed power trip");
            stage.expect(stage.damageTo(foe) > 0, "the swaggering rush dealt damage");
            stage.note("the boost term was 0 in this arena, so this is the base tier; the drive form would carry the rush through to a second target", {
                casts: stage.casts("powertrip", caster),
                onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
                foeMoved: Math.round(stage.travelled(foe) * 10) / 10,
                casterMoved: Math.round(stage.travelled(caster) * 10) / 10
            });
            stage.done();
        });
    }, "power trip rushes and connects within 45 s");
});
