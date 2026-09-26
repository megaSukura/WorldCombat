/**
 * 骨棒乱打 / bonerush —— 可执行设计说明。
 *
 * 一句话：一只只会骨棒乱打的卡拉卡拉隔着几格把骨头一枚枚扔向不动的僵尸，骨头落地只在石地上留下会散去的尘痕，
 *   僵尸吃到沿地面传来的伤害。
 *
 * 场面：只会骨棒乱打的卡拉卡拉（cubone，L30，原生 29 级学习）站在僵尸左侧 3 格（在掷距内），僵尸被点住、
 *   不会还手也不会走开、贴在石地上。夜间，僵尸不会被日光灼烧。
 *
 * 必然事实：本招被提交过（`stage.casts`）；目标受到过至少一击的地面伤害（`stage.damageTo`）。
 *   击数（2～5，随物攻／等级与裂地式变化）、每击命中率 90、骨头弧线偏角、末击更重、暴击，都是随机或配置结果，
 *   写进 note 供读轨迹判断；落点不再改动地表，所以地痕只是会散去的尘。
 */
Smoke.scenario("bonerush", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "cubone", level: 30, moves: ["bonerush"], at: [-2, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [1, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:zombie,distance=..8,limit=1] {NoAI:1b}");
    stage.until(1200, function () {
        return stage.casts("bonerush", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(60, function () {
            stage.expect(stage.casts("bonerush", caster) >= 1, "the caster committed bonerush");
            stage.expect(stage.damageTo(foe) > 0, "the ground shock dealt damage to the foe");
            stage.note("strikes (2-5) follow attack/level and the fissure choice; each bone flies a ballistic arc and stops at the real contact, rolls 90%, and the last strike is heavier; the landing only leaves fading dust and does not replace terrain, and only grounded targets take the ground shock", {
                casts: stage.casts("bonerush", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                changedBlocks: stage.changedBlocks().length,
                foeAlive: foe.alive(),
                casterAlive: caster.alive()
            });
            stage.done();
        });
    }, "bonerush slams a stationary foe within 60 s");
});
