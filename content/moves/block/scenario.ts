// 挡路的可执行设计说明：一只只会挡路的宝可梦正对一个不会动、不会还手的铁傀儡。
// 必然事实：本招被提交过；目标带上共享身份 world_combat:status/trapped；目标背影一侧真的多出了铁栅栏方块。
// 落栅推挤的距离、钉住时长、撑臂形态与可翻越这些设计事实不是本场景的必然事实，写进 note。
Smoke.scenario("block", function (stage) {
    stage.fill([-10, -1, -10], [10, -1, 10], "minecraft:stone");
    stage.fill([-10, 0, -10], [10, 4, 10], "minecraft:air");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "machop", level: 30, moves: ["block"], at: [-3, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [0, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..12,limit=1] {NoAI:1b}");
    function wall(): number {
        return stage.changedBlocks().filter(function (cell) { return cell.after === "minecraft:iron_bars"; }).length;
    }
    stage.until(700, function () {
        return stage.casts("block", caster) >= 1 && stage.hadMobEffect(foe, "world_combat:status/trapped") && wall() > 0;
    }, function () {
        stage.expect(stage.casts("block", caster) >= 1, "caster committed block");
        stage.expect(stage.hadMobEffect(foe, "world_combat:status/trapped"), "the target carried the shared trapped identity");
        stage.expect(wall() > 0, "a real barricade of iron bars rose on the target's far side");
        stage.note("the wall is a rented terrain barricade; the shove toward the caster, the brief pin, the brace form and the climb-over/mine counters are not asserted here.", {
            casts: stage.casts("block", caster),
            wallBlocks: wall(),
            casterHp: caster.health(),
            foeHp: foe.health()
        });
        stage.done();
    }, "block seals the target");
});
