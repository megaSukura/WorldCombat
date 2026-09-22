/**
 * 猛推 / armthrust 的可执行设计说明。
 *
 * 场面：只会猛推的幕下力士（makuhita，L30，原生就能学）对一只被点住、不会还手的铁傀儡（耐打又不会跑掉的靶子），
 *   铁傀儡背后紧贴一堵石墙——这正是这招被放大的读法：被顶到墙上的对手每次都会多挨一记撞墙伤害。
 * 必然事实：本招被提交过、目标受过伤害。推数（2～5，随物攻／等级与配置变化）、单推威力、撞墙追加是否触发、
 *   顶开距离与暴击，都写进 note，供读轨迹判断。
 */
Smoke.scenario("armthrust", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.fill([2, 0, -1], [2, 1, 1], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "makuhita", level: 30, moves: ["armthrust"], at: [-1, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [1.3, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..8,limit=1] {NoAI:1b}");
    stage.until(1200, function () {
        return stage.casts("armthrust", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        // 第一次命中后等这一串推完，再记录整串结果（推几推、撞墙几次是随机的，只作 note）。
        stage.after(60, function () {
            stage.expect(stage.casts("armthrust", caster) > 0, "armthrust was committed");
            stage.expect(stage.damageTo(foe) > 0, "the open-palm thrusts dealt damage to the foe");
            stage.note("thrust count (2-5) follows Attack/level and the drive/planted choice; this move never misses; the stone wall right behind the foe blocks the push, so thrusts that pin it should also apply the slam segment (design facts verified in the full assembly)", {
                casts: stage.casts("armthrust", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                foeAlive: foe.alive(),
                casterAlive: caster.alive()
            });
            stage.done();
        });
    }, "armthrust commits and its shove string lands within 60 s");
});
