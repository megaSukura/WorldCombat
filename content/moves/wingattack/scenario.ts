/**
 * 翅膀攻击 / wingattack —— 可执行设计说明。
 *
 * 一句话：大大展开双翼，用一整片翅膀横扫身前的扇面；扇面内最近的非友方各挨一记接触伤害并被推开。
 *
 * 场面：只会翅膀攻击的大比鸟（30 级）贴着一只被点住、不会还手的铁傀儡（耐打靶子），站在草地上；
 *   两者相距 3 格，正好落在本招射程内。
 * 必然事实：本招被提交过、目标受过伤害。扇面宽度、推开距离与配置只写进 note，供读轨迹判断。
 */
Smoke.scenario("wingattack", function (stage) {
    stage.fill([-6, -1, -6], [6, -1, 6], "minecraft:grass_block");
    stage.fill([-6, 0, -6], [6, 2, 6], "minecraft:air");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "pidgeotto", level: 30, moves: ["wingattack"], at: [-2, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [1, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..8,limit=1] {NoAI:1b}");
    stage.until(700, function () {
        return stage.casts("wingattack", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("wingattack", caster) > 0, "pidgeotto committed wing attack");
        stage.expect(stage.damageTo(foe) > 0, "the wing sweep dealt damage to the foe");
        stage.note("span/targets/push follow the user's body size and the wide choice; a pushed target can leave the fan after one sweep", {
            casts: stage.casts("wingattack", caster),
            damage: Math.round(stage.damageTo(foe) * 10) / 10,
            foeAlive: foe.alive()
        });
        stage.done();
    }, "wing attack commits and lands within 35 s");
});
