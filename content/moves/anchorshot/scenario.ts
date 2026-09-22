/**
 * 掷锚 / anchorshot —— 可执行设计说明。
 *
 * 一句话：把锚甩出去砸中对手，锚在它脚下钉住、链子绷直把它拴在锚点上。
 *
 * 场面：唯一已实装学习者破破舵轮（Dhelmise，40 级）正对一只被点住、不会还手的铁傀儡（4 格外）。
 *   必然事实：本招被提交过、目标受过伤害、目标身上出现过共享身份 `world_combat:status/trapped`；
 *   链在锚点租借的 `minecraft:chain` 方块也一并核对。回拽距离、链维持时长、是否绷断都写进 note。
 */
Smoke.scenario("anchorshot", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.fill([-8, 0, -8], [8, 3, 8], "minecraft:air");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "dhelmise", level: 40, moves: ["anchorshot"], at: [-3, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [1, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..8,limit=1] {NoAI:1b}");
    function chainBlocks(): number {
        return stage.changedBlocks().filter(function (cell) { return cell.after === "minecraft:chain"; }).length;
    }
    stage.until(700, function () {
        return stage.casts("anchorshot", caster) > 0 && stage.hadMobEffect(foe, "world_combat:status/trapped");
    }, function () {
        stage.expect(stage.casts("anchorshot", caster) > 0, "dhelmise committed anchor shot");
        stage.expect(stage.damageTo(foe) > 0, "the anchor clubbed the foe");
        stage.expect(stage.hadMobEffect(foe, "world_combat:status/trapped"), "the target carried the shared trapped identity");
        stage.expect(chainBlocks() > 0, "a chain block was rented at the ground anchor point");
        stage.note("the leash pull-back and the snap distance are not asserted here; the bag does not walk, so the ground anchor mark and the trapped identity are the checks", {
            casts: stage.casts("anchorshot", caster),
            damage: Math.round(stage.damageTo(foe) * 10) / 10,
            chainBlocks: chainBlocks(),
            foeAlive: foe.alive()
        });
        stage.done();
    }, "anchor shot binds the foe within 35 s");
});
