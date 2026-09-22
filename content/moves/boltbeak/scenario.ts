/**
 * 电喙 / boltbeak —— 可执行设计说明。
 *
 * 一句话：抢在对手反应前用带电的喙直线啄上去；目标尚未打过施法者时翻倍，啄完退步拉开。
 *
 * 场面：一只电系物攻手站在四格外对一只低等级对手，只带这一招；平地、白天，避免日光与地形干扰读数。
 * 断言只取必然事实：这招被提交过、目标受过伤害。先手翻倍取决于目标此前有没有打过施法者，
 * 写进 note 供读轨迹判断。
 */
Smoke.scenario("boltbeak", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    const caster = stage.pokemon({ species: "pikachu", level: 45, moves: ["boltbeak"], at: [-2, 0, 0] });
    const target = stage.pokemon({ species: "rattata", level: 22, moves: ["tackle"], at: [2, 0, 0] });
    stage.hostile(caster, target);
    stage.until(600, function () { return stage.casts("boltbeak", caster) >= 1 && stage.damageTo(target) > 0; }, function () {
        stage.expect(stage.casts("boltbeak", caster) >= 1, "pikachu committed bolt beak");
        stage.expect(stage.damageTo(target) > 0, "the electric peck dealt damage");
        stage.note("whether the opening peck counted as a first strike (and so doubled) depends on whether the target had already hit the caster", {
            casts: stage.casts("boltbeak", caster),
            dealt: Math.round(stage.damageBy(caster) * 10) / 10,
            taken: Math.round(stage.damageTo(caster) * 10) / 10,
            targetDamage: Math.round(stage.damageTo(target) * 10) / 10,
            movedBy: Math.round(stage.travelled(caster) * 10) / 10,
            tick: stage.tick()
        });
        stage.done();
    }, "bolt beak lands on the target within 30 s");
});
