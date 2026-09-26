/**
 * 劈瓦 / brickbreak —— 可执行设计说明。
 *
 * 一句话：一步踏进，一记手刀自上而下劈落，劈伤目标，并震碎刀锋落点周围一整片的反射壁、光墙与极光幕。
 *
 * 场面：一只只会劈瓦的腕力（34 级）对一只贴身站立的原版僵尸开战。僵尸会主动靠近，保证这把短程手刀
 * 始终够得到、会被反复放出；僵尸够脆，第一记劈实就倒下，正好验证手刀落地。AI 只会用这一招，必然会被放出来。
 * 必然事实：本招被提交过、目标受到过伤害（手刀劈实）。
 * 碎壁依赖的反射壁／光墙／极光幕由别的招式单元生产，而单元自测只装配共享包与本单元——它们不在场，
 * 因此「落点可达屏障被劈碎」不进断言，写进 note 并在完整装配的集成试玩里核对。
 */
Smoke.scenario("brickbreak", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    const caster = stage.pokemon({ species: "machop", level: 34, moves: ["brickbreak"], at: [-1, 0, 0] });
    const foe = stage.mob({ type: "minecraft:zombie", at: [1, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1400, function () {
        return stage.casts("brickbreak", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(20, function () {
            stage.expect(stage.casts("brickbreak", caster) >= 1, "caster committed brick break");
            stage.expect(stage.damageTo(foe) > 0, "brick break dealt damage to the foe");
            stage.note("brick break observations; the ward shatter (reflect/lightscreen/auroraveil identities) needs the full assembly", {
                casts: stage.casts("brickbreak", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                moved: Math.round(stage.travelled(caster) * 10) / 10,
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "brick break lands");
});
