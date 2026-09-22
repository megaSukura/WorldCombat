/**
 * 啄钻 / drillpeck 的可执行设计说明。
 *
 * 场面：只会啄钻的大嘴雀（Fearow，旋身钻孔）对着被点住、不会走开的铁傀儡（体型高大、耐打），晴天平地，
 * 初始距离约 1.5 格（钻轴内）。铁傀儡 `NoAI` 定住，保证连续几口都咬在同一根轴上。
 * 必然事实：本招被提交过（`stage.casts`）；目标受到过伤害（连续几口中的至少一口）。
 * 一共咬了几口、对空加成、每口顶开多少，写进 note 供读轨迹判断。
 */
Smoke.scenario("drillpeck", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Fearow", level: 36, moves: ["drillpeck"], at: [-0.8, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [0.8, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..8,limit=1] {NoAI:1b}");
    stage.until(1000, function () {
        return stage.casts("drillpeck", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(60, function () {
            stage.expect(stage.casts("drillpeck", caster) > 0, "drillpeck was committed");
            stage.expect(stage.damageTo(foe) > 0, "at least one drill bite landed");
            stage.note("连续几口钻孔：口数与间隔由速度/配置决定，目标被一口口顶开；离地时每口更狠", {
                casts: stage.casts("drillpeck", caster),
                onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
                foeMoved: Math.round(stage.travelled(foe) * 10) / 10,
                onCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "drillpeck bores the foe with repeated bites at close range");
});
