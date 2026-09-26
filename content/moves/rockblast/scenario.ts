/**
 * 岩石爆击 / rockblast 的可执行设计说明。
 *
 * 场面：只会岩石爆击的隆隆石（30 级）对一只被点住、不会还手的铁傀儡（耐打又不会跑掉的靶子），
 *   站在草地上——石头材质取自脚下（草方块归圆石）。
 * 必然事实：本招被提交过、目标受过伤害。投石数（2～5，随物攻／体重／等级与配置变化）、单石威力、
 *   散布与弧线只写进 note，供读轨迹判断；落点不再改动地表。
 */
Smoke.scenario("rockblast", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:grass_block");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "graveler", level: 30, moves: ["rockblast"], at: [-4, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..8,limit=1] {NoAI:1b}");
    stage.until(900, function () {
        return stage.casts("rockblast", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        // 第一块石头命中后等这一梭抛完，再把整梭的总伤害记下来（抛几块是随机的，只作 note）。
        stage.after(80, function () {
            stage.expect(stage.casts("rockblast", caster) > 0, "rockblast was committed");
            stage.expect(stage.damageTo(foe) > 0, "the stone volley dealt damage to the foe");
            stage.note("the volley length (2-5 stones), per-stone power, spread and arc follow Attack/weight/level and the boulder choice; each stone's arc is a real projectile and rubble is dust at the real impact, with no terrain change", {
                casts: stage.casts("rockblast", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                foeAlive: foe.alive(),
                changedBlocks: stage.changedBlocks().length
            });
            stage.done();
        });
    }, "rockblast commits and its stone volley lands within 45 s");
});
