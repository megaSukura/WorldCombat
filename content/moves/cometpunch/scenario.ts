/**
 * 连续拳 / cometpunch 的可执行设计说明。
 *
 * 场面：只会连续拳的快拳郎（hitmonchan，L30，原生就能学）贴着一只被点住、不会还手的铁傀儡（耐打又不会跑掉的靶子）。
 * 必然事实：本招被提交过、目标受过伤害。拳数（2～5，随物攻／等级与配置变化）、每拳威力、命中率 85、
 * 是否在某一拳擦空而提前收场、乱打式的扇面盖到几个目标、顶退与暴击，都写进 note，供读轨迹判断。
 */
Smoke.scenario("cometpunch", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "hitmonchan", level: 30, moves: ["cometpunch"], at: [-1, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [1, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..8,limit=1] {NoAI:1b}");
    stage.until(1200, function () {
        return stage.casts("cometpunch", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        // 第一拳命中后等这一串砸完，再记录整串的结果（砸几拳是随机的，只作 note）。
        stage.after(60, function () {
            stage.expect(stage.casts("cometpunch", caster) > 0, "cometpunch was committed");
            stage.expect(stage.damageTo(foe) > 0, "the punch flurry dealt damage to the foe");
            stage.note("punch count (2-5) follows Attack/level and the scatter/focused choice; each punch rolls 85%; focused mode lands all punches on one point while scatter spreads a fan that can cover a second enemy (design facts verified in the full assembly)", {
                casts: stage.casts("cometpunch", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                foeAlive: foe.alive(),
                casterAlive: caster.alive()
            });
            stage.done();
        });
    }, "cometpunch commits and its flurry lands within 60 s");
});
