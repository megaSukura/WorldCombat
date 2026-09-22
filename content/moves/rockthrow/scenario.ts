/**
 * 落石 / rockthrow —— 可执行设计说明。
 *
 * 一句话：从脚边地上抄起一块小石，平直快速甩向目标；一块石头一次伤害，砸中崩出石屑。
 *
 * 场面：只会落石、站在石地上的隆隆石（30 级）对一只被点住、不会还手的铁傀儡（耐打靶子），
 *   两者相距 7 格——本招射程之外，隆隆石会先走近再扔。
 * 必然事实：本招被提交过、目标受过伤害。石块威力、散布、弧坠与配置只写进 note，供读轨迹判断。
 */
Smoke.scenario("rockthrow", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.fill([-8, 0, -8], [8, 2, 8], "minecraft:air");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "geodude", level: 30, moves: ["rockthrow"], at: [-4, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..8,limit=1] {NoAI:1b}");
    stage.until(700, function () {
        return stage.casts("rockthrow", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("rockthrow", caster) > 0, "geodude committed rock throw");
        stage.expect(stage.damageTo(foe) > 0, "the small stone dealt damage to the foe");
        stage.note("stone power/scatter/arc follow Attack/Speed/weight/level and the lob choice; the throw does not home, so a moving target can slip it", {
            casts: stage.casts("rockthrow", caster),
            damage: Math.round(stage.damageTo(foe) * 10) / 10,
            foeAlive: foe.alive()
        });
        stage.done();
    }, "rock throw commits and lands within 35 s");
});
