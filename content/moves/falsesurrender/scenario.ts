/**
 * 假跪真撞 / falsesurrender —— 可执行设计说明。
 *
 * 一句话：先伏低装作认错骗过对手的注意，再让凌乱的黑发从最低处窜出去扎进护架下方；出刺点最低最突然，所以躲不掉。
 *
 * 场面：一只披发诈刺者对两格外的对手（发梢距离之内）。场地铺平，白天晴天。
 * 断言只取必然事实：这招被提交过、目标受过假跪真撞伤害。是否骗到注意（伏低加成）、暴击与压制写进 note 供读轨迹判断。
 */
Smoke.scenario("falsesurrender", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "grimmsnarl", level: 45, moves: ["falsesurrender"], at: [-1, 0, 0] });
    var foe = stage.pokemon({ species: "raticate", level: 25, moves: ["tackle"], at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("falsesurrender", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(80, function () {
            stage.expect(stage.casts("falsesurrender", caster) >= 1, "caster committed false surrender");
            stage.expect(stage.damageTo(foe) > 0, "false surrender dealt damage to the foe");
            stage.note("whether the ambush bonus applied, crit, and the stagger are positional/random", {
                casts: stage.casts("falsesurrender", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "false surrender lands on a foe within 60 s");
});
