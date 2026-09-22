// 沥青射击的可执行设计说明：一只只会沥青射击的宝可梦隔一段空地泼洒一只不会动、不会还手的铁傀儡。
// 必然事实：本招被提交过；目标带上共享身份 world_combat:status/tarshot；目标移动速度属性下降；命中点真的留下沥青滩方块。
// 火焰弱点 ×2、水冲掉、大泼覆盖多人这些设计事实不是本场景的必然事实，写进 note。
Smoke.scenario("tarshot", function (stage) {
    stage.fill([-10, -1, -10], [10, -1, 10], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "coalossal", level: 40, moves: ["tarshot"], at: [-4, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [0, 0, 0] });
    var baseSpeed = stage.attribute(foe, "minecraft:generic.movement_speed");
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..12,limit=1] {NoAI:1b}");
    function tar(): number {
        return stage.changedBlocks().filter(function (cell) { return cell.after === "minecraft:black_concrete"; }).length;
    }
    stage.until(700, function () {
        return stage.casts("tarshot", caster) >= 1 && stage.hadMobEffect(foe, "world_combat:status/tarshot")
            && stage.attribute(foe, "minecraft:generic.movement_speed") < baseSpeed - 0.001 && tar() > 0;
    }, function () {
        stage.expect(stage.casts("tarshot", caster) >= 1, "caster committed tar shot");
        stage.expect(stage.hadMobEffect(foe, "world_combat:status/tarshot"), "the target carried the shared tar identity");
        stage.expect(stage.attribute(foe, "minecraft:generic.movement_speed") < baseSpeed - 0.001, "the tar slowed the target's movement");
        stage.expect(tar() > 0, "a rented tar patch was left on the ground at the impact point");
        stage.note("the doubled Fire weakness is settled in PokemonDamage.metadata from the shared tarshot identity; the wide splash, the water wash-off and the on-fire flare are not asserted here.", {
            casts: stage.casts("tarshot", caster),
            baseSpeed: baseSpeed,
            speed: stage.attribute(foe, "minecraft:generic.movement_speed"),
            tarBlocks: tar(),
            casterHp: caster.health(),
            foeAlive: foe.alive()
        });
        stage.done();
    }, "tar shot coats the target");
});
