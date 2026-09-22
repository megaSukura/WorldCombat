/**
 * 陷阱甲壳 / shelltrap —— 可执行设计说明。
 *
 * 一句话：把壳张成一触即发的陷阱站定等待，被敌对物理命中就当场炸开，身周敌人一起挨火焰并被震开。
 *
 * 场面：夜晚晴天、石地。只带陷阱甲壳的爆焰龟兽站在中间，贴身处两只僵尸与它开战。僵尸用原版近战追打，
 *   这类来犯伤害没有作者类别，但由「造成者就是直接命中者」判定为物理，正好点着壳——用来核对
 *   「被物理打中→陷阱爆炸→波及身周敌人」。地面平坦，便于读爆炸的震开。
 *
 * 断言只取必然事实：陷阱甲壳被放过并挂上共享身份 shelltrap、至少一个敌人被炸到。
 *   是否被点燃（概率）、窗口内第几刻被点着、被震开多远与暴击写进 note。
 */
Smoke.scenario("shelltrap", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "turtonator", level: 40, moves: ["shelltrap"], at: [0, 0, 0] });
    var near = stage.mob({ type: "minecraft:zombie", at: [3.0, 0, 0] });
    var side = stage.mob({ type: "minecraft:zombie", at: [2.4, 0, 1.6] });
    stage.hostile(caster, near);
    stage.hostile(caster, side);
    stage.until(1200, function () {
        return stage.casts("shelltrap", caster) >= 1 && (stage.damageTo(near) > 0 || stage.damageTo(side) > 0);
    }, function () {
        stage.after(15, function () {
            stage.expect(stage.casts("shelltrap", caster) >= 1, "turtonator set the shell trap");
            stage.expect(stage.hadMobEffect(caster, "world_combat:status/shelltrap"), "the armed shell carried the shared status identity");
            stage.expect(stage.damageTo(near) > 0 || stage.damageTo(side) > 0, "the detonation caught at least one enemy");
            stage.note("which zombie landed the physical hit, when the shell was lit inside the window, the 5-45% ignite roll and the shove are positional/random", {
                casts: stage.casts("shelltrap", caster),
                nearDamage: Math.round(stage.damageTo(near) * 10) / 10,
                sideDamage: Math.round(stage.damageTo(side) * 10) / 10,
                casterDamage: Math.round(stage.damageTo(caster) * 10) / 10,
                nearBurning: stage.hadMobEffect(near, "world_combat:status/burn"),
                sideBurning: stage.hadMobEffect(side, "world_combat:status/burn")
            });
            stage.done();
        });
    }, "shell trap detonates on a physical blow within 60 s");
});
