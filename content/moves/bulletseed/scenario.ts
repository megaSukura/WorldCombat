/**
 * 种子机关枪 / bulletseed 的可执行设计说明。
 *
 * 场面：只会种子机关枪的妙蛙种子（28 级）对一只被点住、不会还手的铁傀儡（耐打又不会跑掉的靶子）。
 * 必然事实：本招被提交过、目标受过伤害。连发数（2～5，随物攻／速度／等级与配置变化）、
 * 每发威力与散布只写进 note，供读轨迹判断。
 */
Smoke.scenario("bulletseed", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:grass_block");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "bulbasaur", level: 28, moves: ["bulletseed"], at: [-4, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..8,limit=1] {NoAI:1b}");
    stage.until(900, function () {
        return stage.casts("bulletseed", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        // 第一发命中后等这一梭子打完，再把整梭子的总伤害记下来（打几发是随机的，只作 note）。
        stage.after(60, function () {
            stage.expect(stage.casts("bulletseed", caster) > 0, "bulletseed was committed");
            stage.expect(stage.damageTo(foe) > 0, "the seed volley dealt damage to the foe");
            stage.note("the volley length (2-5 shots), per-shot power and spread follow Attack/Speed/level and the heavy/rapid choice (design facts verified in the full assembly)", {
                casts: stage.casts("bulletseed", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "bulletseed commits and its volley lands within 45 s");
});
