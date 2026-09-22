/**
 * 超级角击 / megahorn 的可执行设计说明。
 *
 * 场面：只会超级角击的赫拉克罗斯（Heracross，长角重刺）对着被点住、不会走开的铁傀儡（体型高大、耐打），
 * 晴天平地，初始距离约 3 格（角程内）。默认配置为深植式。铁傀儡 `NoAI` 定住，保证窄角线的位置判定稳定。
 * 必然事实：本招被提交过（`stage.casts`）；目标受到过伤害（角线贯穿）；目标被钉住过（`minecraft:slowness`）。
 * 一次命中（窄线与长蓄势是位置判定）、扎入后被挑飞的高度随体重变化，写进 note 供读轨迹判断。
 */
Smoke.scenario("megahorn", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Heracross", level: 40, moves: ["megahorn"], at: [-1.5, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [1.5, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..8,limit=1] {NoAI:1b}");
    stage.until(1200, function () {
        return stage.casts("megahorn", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(60, function () {
            stage.expect(stage.casts("megahorn", caster) > 0, "megahorn was committed");
            stage.expect(stage.damageTo(foe) > 0, "the horn pierce dealt damage");
            stage.expect(stage.hadMobEffect(foe, "minecraft:slowness"), "the planted horn pinned the foe");
            stage.note("深植式把目标钉住；窄角线是位置判定，蓄势期对手可走开", {
                casts: stage.casts("megahorn", caster),
                onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
                foeMoved: Math.round(stage.travelled(foe) * 10) / 10,
                onCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "megahorn lands its narrow horn line on a planted foe");
});
