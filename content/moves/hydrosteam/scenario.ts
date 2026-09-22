/**
 * 水蒸气 / hydrosteam 的可执行设计说明。
 *
 * 场面：正午晴空（强日照，×1.5 必然生效）。一只只会「水蒸气」的 lapras 对上一只被预先冻住的 snorlax；
 * 蒸汽命中会对它结算伤害并化开冰冻。
 * 断言：这招被提交过、伤害落到了目标身上、命中后目标身上的冰冻身份消失（原生 thawsTarget 的落点）。
 * 暴击、命中率、被顶开的距离与是否还活着写进 note 供读轨迹判断。
 */
Smoke.scenario("hydrosteam", function (stage) {
    stage.fill([-14, -1, -14], [14, -1, 14], "minecraft:stone");
    stage.fill([-14, 0, -14], [14, 8, 14], "minecraft:air");
    stage.weather("clear");
    stage.time("noon");
    var caster = stage.pokemon({ species: "lapras", level: 36, moves: ["hydrosteam"], at: [-4, 0, 0] });
    var foe = stage.pokemon({ species: "snorlax", level: 30, moves: ["tackle"], at: [0, 0, 0] });
    stage.hostile(caster, foe);
    // 开局冻住站在场地中心的目标，让「化开冰冻」这一支必然走到。
    stage.after(0, function () {
        stage.command("effect give @e[type=cobblemon:pokemon,distance=..3,limit=1,sort=nearest] world_combat:frozen 600 0 true");
    });
    stage.until(900, function () {
        return stage.casts("hydrosteam", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(6, function () {
            stage.expect(stage.casts("hydrosteam", caster) > 0, "lapras committed hydro steam");
            stage.expect(stage.damageTo(foe) > 0, "the steam damaged the target");
            stage.expect(stage.hadMobEffect(foe, "world_combat:status/frozen"), "the target was frozen before the hit (staged)");
            stage.expect(!stage.hasMobEffect(foe, "world_combat:status/frozen"), "the steam thawed the frozen target");
            stage.note("clear noon gives sunlight >= 0.85, so the steam is boosted x1.5 and spreads wider. The staged freeze is the native target state that the move thaws. Variables: hit chance, crit, push distance, and whether the target survives.", {
                casts: stage.casts("hydrosteam", caster),
                damageToFoe: Math.round(stage.damageTo(foe) * 10) / 10,
                foeAlive: foe.alive(),
                stillFrozen: stage.hasMobEffect(foe, "world_combat:status/frozen"),
                foeMoved: Math.round(stage.travelled(foe) * 10) / 10
            });
            stage.done();
        });
    }, "hydro steam lands, is sunlit, and thaws the target within 45 s");
});
