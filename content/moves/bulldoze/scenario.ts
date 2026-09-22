/**
 * 重踏 / bulldoze —— 可执行设计说明。
 *
 * 一句话：把重量砸进地面，一圈地裂贴着地表向外推，扫到站在地上的敌人就削速度、震开一点，最后留下裂痕。
 *
 * 场面：皮糙肉厚、体重很大的隆隆石带这一招，站在一只小敌与一只铁傀儡旁边；两者都站在地上，
 * 逼出地裂扫过一圈的场面。铁傀儡血厚，用来核对「移动速度属性被压下去」这条跨对象的效果。
 *
 * 断言只取必然事实：这招被放过、至少一只小敌挨到伤害、铁傀儡的移动速度属性被压下去（重踏必降速度）、
 * 推完后地表留下裂痕。暴击、具体有几个人落在环里写进 note 供读轨迹判断。
 */
Smoke.scenario("bulldoze", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "golem", level: 40, moves: ["bulldoze"], at: [0, 0, 0] });
    var foe = stage.pokemon({ species: "rattata", level: 16, moves: ["tackle"], at: [2.4, 0, 0] });
    var heavy = stage.mob({ type: "minecraft:iron_golem", at: [2.2, 0, 1.0] });
    var baseSpeed = stage.attribute(heavy, "minecraft:generic.movement_speed");
    stage.hostile(caster, foe);
    stage.hostile(caster, heavy);
    stage.until(600, function () {
        return stage.casts("bulldoze", caster) >= 1 && stage.damageTo(foe) > 0
            && stage.attribute(heavy, "minecraft:generic.movement_speed") < baseSpeed - 0.001;
    }, function () {
        // 等 Wave 推完、裂痕铺下后再核对地表留下的东西。
        stage.after(15, function () {
            stage.expect(stage.casts("bulldoze", caster) >= 1, "golem committed bulldoze");
            stage.expect(stage.damageTo(foe) > 0, "the ground wave dealt damage");
            stage.expect(stage.attribute(heavy, "minecraft:generic.movement_speed") < baseSpeed - 0.001, "the stomp lowered the iron golem's movement speed");
            stage.expect(stage.changedBlocks().length > 0, "the fissure scarred the ground");
            stage.note("how many stood inside the ring and the crit roll are positional/random", {
                casts: stage.casts("bulldoze", caster),
                foeDamage: Math.round(stage.damageTo(foe) * 10) / 10,
                heavyDamage: Math.round(stage.damageTo(heavy) * 10) / 10,
                speed: [baseSpeed, stage.attribute(heavy, "minecraft:generic.movement_speed")],
                changed: stage.changedBlocks().length,
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "bulldoze lands on a grounded foe within 30 s");
});
