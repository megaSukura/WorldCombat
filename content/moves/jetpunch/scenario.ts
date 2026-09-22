/**
 * 喷射拳 / jetpunch 的可执行设计说明。
 *
 * 一句话：站定不动，水柱裹拳一记瞬发直拳，命中把目标浇透、顶退，带着火的目标被浇熄。
 *
 * 场面：一只只会喷射拳的水系精灵（Palafin，40 级）面对两格外的铁傀儡（被点住不还手、耐打，所以浇透一定能挂上）；
 *   设为夜晚，环境不会造成伤害。两者开战，AI 只有这一招可用。
 * 必然事实：本招被提交过；目标受到过伤害；目标身上出现过共享身份 soaked（命中即浇透）。
 *   起点偏差导致的挥空、暴击与具体落点是站位与概率结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("jetpunch", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Palafin", level: 40, moves: ["jetpunch"], at: [-1, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..8,limit=1] {NoAI:1b}");
    stage.until(900, function () {
        return stage.casts("jetpunch", caster) > 0 && stage.damageTo(foe) > 0 && stage.hadMobEffect(foe, "world_combat:status/soaked");
    }, function () {
        stage.expect(stage.casts("jetpunch", caster) > 0, "jet punch was committed");
        stage.expect(stage.damageTo(foe) > 0, "the jet punch dealt damage");
        stage.expect(stage.hadMobEffect(foe, "world_combat:status/soaked"), "the target was soaked");
        stage.note("the user never moves; the torrent extends the punch's reach and soaks the target. soaked is the shared wet identity. Misses only happen when the target steps out of the short line.", {
            casts: stage.casts("jetpunch", caster),
            onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            moved: Math.round(stage.travelled(caster) * 10) / 10,
            hurtBack: Math.round(stage.damageTo(caster) * 10) / 10,
            tick: stage.tick()
        });
        stage.done();
    }, "jet punch soaks the zombie");
});
