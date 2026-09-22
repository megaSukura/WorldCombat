/**
 * 连环巴掌 / doubleslap 的可执行设计说明。
 *
 * 场面：只会连环巴掌的皮皮（clefairy，L30，原生就能学）贴着一只被点住、不会还手的铁傀儡（耐打又不会跑掉的靶子）。
 * 必然事实：本招被提交过、目标受过伤害。掌数（2～5，随速度／等级与配置变化）、每掌威力、掌数命中率 85、
 * 是否在某一掌擦空而提前收场、横向拨动与暴击，都写进 note，供读轨迹判断。
 */
Smoke.scenario("doubleslap", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "clefairy", level: 30, moves: ["doubleslap"], at: [-1, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [1, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..8,limit=1] {NoAI:1b}");
    stage.until(1200, function () {
        return stage.casts("doubleslap", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        // 第一掌命中后等这一串抽完，再记录整串的结果（抽几掌是随机的，只作 note）。
        stage.after(60, function () {
            stage.expect(stage.casts("doubleslap", caster) > 0, "doubleslap was committed");
            stage.expect(stage.damageTo(foe) > 0, "the slap string dealt damage to the foe");
            stage.note("slap count (2-5) follows Speed/level and the crossing/straight choice; each slap rolls 85% and only crossing mode nudges the target sideways (design facts verified in the full assembly)", {
                casts: stage.casts("doubleslap", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                foeAlive: foe.alive(),
                casterAlive: caster.alive()
            });
            stage.done();
        });
    }, "doubleslap commits and its slap string lands within 60 s");
});
