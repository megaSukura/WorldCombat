/**
 * 高速星星 / swift —— 可执行设计说明。
 *
 * 一句话：从身上迸出一圈追人的星，每颗星各锁一个对手；不掷随机命中，但撞墙或飞完射程会落空。
 *
 * 场面：一只只会高速星星的精灵，对一位五格外的对手。场地铺平，白天晴天（AI 会给出一个敌人 ref 作为瞄准目标）。
 * 断言只取必然事实：这招被提交过、对手受过高速星星的伤害。星数、暴击、命中比例等写进 note 供读轨迹判断。
 */
Smoke.scenario("swift", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "pikachu", level: 40, moves: ["swift"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "rattata", level: 18, moves: ["tackle"], at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1000, function () {
        return stage.casts("swift", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(120, function () {
            stage.expect(stage.casts("swift", caster) >= 1, "caster committed swift");
            stage.expect(stage.damageTo(foe) > 0, "swift dealt damage to the foe");
            stage.note("how many of the homing stars landed, plus crit, are positional/random", {
                casts: stage.casts("swift", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                foeAt: foe.position().map(function (n: number) { return Math.round(n * 10) / 10; }),
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "swift lands on a foe within 50 s");
});
