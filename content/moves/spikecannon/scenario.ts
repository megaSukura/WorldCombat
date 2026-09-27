/**
 * 尖刺加农炮 / spikecannon 的可执行设计说明。
 *
 * 场面：只会尖刺加农炮的多刺菊石兽（30 级）对一只被点住、不会还手、且抗性清零的铁傀儡（耐打又不会跑掉的靶子）。
 *   铁傀儡原生 100% 抗击退，会让 hitDisplace 被拒；先清零抗性，顶退才是本招的必然事实。
 * 必然事实：本招被提交过、目标受过伤害、目标被顶退过（位移）。钉数（2～5，随物攻／速度／等级与配置变化）、
 *   单钉威力、贯穿总人数（pierce 为总人数，原生按 pierce−1 传）与顶退距离只写进 note，供读轨迹判断。
 */
Smoke.scenario("spikecannon", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:grass_block");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "omastar", level: 30, moves: ["spikecannon"], at: [-5, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..8,limit=1] {NoAI:1b}");
    stage.command("attribute @e[type=minecraft:iron_golem,distance=..8,limit=1] minecraft:generic.knockback_resistance base set 0");
    stage.until(900, function () {
        return stage.casts("spikecannon", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        // 第一发命中后等这一梭打完，再把整梭的总伤害与顶退记下来（打几发是随机的，只作 note）。
        stage.after(90, function () {
            stage.expect(stage.casts("spikecannon", caster) > 0, "spikecannon was committed");
            stage.expect(stage.damageTo(foe) > 0, "the spike volley dealt damage to the foe");
            stage.expect(stage.travelled(foe) > 0.05, "a landed spike shoved the foe back");
            stage.note("the volley length (2-5 spikes), per-spike power, pierce total (native pierce-1), knockback and reach follow Attack/Speed/level and the lance choice; reach is the real projectile range with no hidden extra distance", {
                casts: stage.casts("spikecannon", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                travelled: Math.round(stage.travelled(foe) * 100) / 100,
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "spikecannon commits and its spike volley lands within 45 s");
});
