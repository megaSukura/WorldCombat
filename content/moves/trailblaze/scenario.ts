/**
 * 起草 / trailblaze 的可执行设计说明。
 *
 * 场面：一只只会起草的蜥蜴王与一只弱小的对手在铺了高草的地面上相隔 6 格开战；脚下的高草让「借草起势」成立。
 * 必然事实：本招被提交过、对手受过起草的伤害。
 * 草丛借势是否命中那一刻仍在脚下、窜跃走的是哪条弧线、暴击，都会随走位变化，写进 note 供读轨迹判断。
 */
Smoke.scenario("trailblaze", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    // 起跳点附近铺一层高草：无论伙伴停在哪里起跳，cover 事实都成立。
    stage.fill([-6, 0, -2], [1, 0, 2], "minecraft:short_grass");
    var caster = stage.pokemon({ species: "sceptile", level: 45, moves: ["trailblaze"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "rattata", level: 15, moves: ["tackle"], at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("trailblaze", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(80, function () {
            stage.expect(stage.casts("trailblaze", caster) >= 1, "caster committed trailblaze");
            stage.expect(stage.damageTo(foe) > 0, "trailblaze dealt damage to the foe");
            stage.note("brush cover at the cast moment, the bound arc and crit vary with positioning", {
                casts: stage.casts("trailblaze", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                movedBy: Math.round(stage.travelled(caster) * 10) / 10,
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "trailblaze lands within 60 s");
});
