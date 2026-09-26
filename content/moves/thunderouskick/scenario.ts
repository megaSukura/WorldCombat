/**
 * 雷鸣蹴击 / thunderouskick —— 可执行设计说明。
 *
 * 一句话：绕步闪到目标侧后方，再从它没在看的一侧踢出一脚，踢开护架并顶开目标。
 *
 * 场面：会雷鸣蹴击的飞腿郎（45 级，只给这一招）对一只厚血、站桩的卡比兽（50 级，只会跃起）绕步踢击；
 * 硬石地面，断言只取必然事实：这招被提交过、目标受到过伤害。
 * 绕步几次、是否踢空、踢开几级护架（绕步达到三次以上会多一级）都写进 note 供读轨迹判断。
 */
Smoke.scenario("thunderouskick", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "hitmonlee", level: 45, moves: ["thunderouskick"], at: [-2, 0, 0] });
    var foe = stage.pokemon({ species: "snorlax", level: 50, moves: ["splash"], at: [3, 0, 0] });
    stage.hostile(caster, foe);
    var landedAt = 0;
    stage.until(1200, function () {
        if (landedAt === 0 && stage.casts("thunderouskick", caster) >= 1 && stage.damageTo(foe) > 0) landedAt = stage.tick();
        return landedAt > 0 && stage.tick() >= landedAt + 12;
    }, function () {
        stage.expect(stage.casts("thunderouskick", caster) >= 1, "caster committed thunderous kick");
        stage.expect(stage.damageTo(foe) > 0, "thunderous kick dealt damage to the foe");
        stage.note("only steps actually travelled count; the guard break scales with real feints and on whether the foe was distracted; a blocked flank only allows an in-place short kick or a whiff", {
            casts: stage.casts("thunderouskick", caster),
            damage: Math.round(stage.damageTo(foe) * 10) / 10,
            guardbroken: stage.hadMobEffect(foe, "world_combat:status/guardbroken"),
            travelled: Math.round(stage.travelled(caster) * 10) / 10,
            foeAlive: foe.alive()
        });
        stage.done();
    }, "thunderous kick lands within 60 s");
});
