/**
 * 重踏 / bulldoze —— 可执行设计说明。
 *
 * 一句话：把重量砸进地面，一圈地裂贴着地表向外推，扫到站在地上的敌人就削速度、震开一点，波前留下短裂缝。
 *
 * 场面：皮糙肉厚、体重很大的隆隆石带这一招，身边放一只站在地上的原版铁傀儡当对手。铁傀儡会追上来贴身，
 * 正好落在地裂半径内；隆隆石血厚不会被吓退，于是这一发必然扫到它。它同时用来核对「移动速度属性被压下去」
 * 这条跨对象的效果。
 *
 * 断言只取必然事实：这招被放过、站在地上的铁傀儡挨到伤害、它的移动速度属性被压下去（重踏必降速度）、
 * 地面方块没有被长期替换。暴击、具体有几个人落在环里写进 note 供读轨迹判断。
 */
Smoke.scenario("bulldoze", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "golem", level: 40, moves: ["bulldoze"], at: [0, 0, 0] });
    var heavy = stage.mob({ type: "minecraft:iron_golem", at: [2.0, 0, 0] });
    var baseSpeed = stage.attribute(heavy, "minecraft:generic.movement_speed");
    stage.hostile(caster, heavy);
    stage.until(1200, function () {
        return stage.casts("bulldoze", caster) >= 1 && stage.damageTo(heavy) > 0
            && stage.attribute(heavy, "minecraft:generic.movement_speed") < baseSpeed - 0.001;
    }, function () {
        stage.after(15, function () {
            stage.expect(stage.casts("bulldoze", caster) >= 1, "golem committed bulldoze");
            stage.expect(stage.damageTo(heavy) > 0, "the ground wave dealt damage to a grounded foe");
            stage.expect(stage.attribute(heavy, "minecraft:generic.movement_speed") < baseSpeed - 0.001, "the stomp lowered the iron golem's movement speed");
            stage.expect(stage.changedBlocks().length === 0, "the fissure left the ground blocks untouched");
            stage.note("how many stood inside the ring and the crit roll are positional/random", {
                casts: stage.casts("bulldoze", caster),
                heavyDamage: Math.round(stage.damageTo(heavy) * 10) / 10,
                speed: [baseSpeed, stage.attribute(heavy, "minecraft:generic.movement_speed")],
                changed: stage.changedBlocks().length,
                heavyAlive: heavy.alive()
            });
            stage.done();
        });
    }, "bulldoze lands on a grounded foe within 60 s");
});
