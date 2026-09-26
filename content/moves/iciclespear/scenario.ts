/**
 * 冰锥 / iciclespear 的可执行设计说明。
 *
 * 场面：只会冰锥的刺甲贝（30 级）对一只被点住、不会还手的铁傀儡（耐打又不会跑掉的靶子），站在草地上。
 * 必然事实：本招被提交过、目标受过伤害、目标身上出现过共享身份 world_combat:status/chill 的霜寒。
 *   锥数（2～5，随物攻／速度／等级与配置变化）、单锥威力与冰排宽度只写进 note，供读轨迹判断；
 *   落点只留冰屑，不改动地表。
 */
Smoke.scenario("iciclespear", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:grass_block");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "cloyster", level: 30, moves: ["iciclespear"], at: [-4, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..8,limit=1] {NoAI:1b}");
    stage.until(900, function () {
        return stage.casts("iciclespear", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        // 整排齐射后把总伤害与霜寒状态记下来（射几根是随机的，只作 note）。
        stage.after(60, function () {
            stage.expect(stage.casts("iciclespear", caster) > 0, "iciclespear was committed");
            stage.expect(stage.damageTo(foe) > 0, "the parallel icicle rank dealt damage to the foe");
            stage.expect(stage.hadMobEffect(foe, "world_combat:status/chill"), "a landed icicle left the shared chill identity on the foe");
            stage.note("the rank length (2-5 icicles), per-icicle power and the row width follow Attack/Speed/level and the rime choice; the rank is fired in one parallel salvo and the landing leaves only fading ice chips", {
                casts: stage.casts("iciclespear", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                chilled: stage.hadMobEffect(foe, "world_combat:status/chill"),
                slowed: stage.hasMobEffect(foe, "minecraft:slowness"),
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "iciclespear commits and its parallel rank lands within 45 s");
});
