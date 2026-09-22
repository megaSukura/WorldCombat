/**
 * 溶化 的可执行设计说明。
 *
 * 场面：一只只会「溶化」的臭臭泥（Poison，34 级）与一只劫掠兽（100 生命、会自己走进来）隔开 5 格、石质场地上开战。
 *   技能表里只有这一招。劫掠兽不是亡灵也不是毒属性，酸池落地后会真的中毒（僵尸一类亡灵对毒免疫，故选可中毒的对手）。
 * 必然事实：本招被提交过；施术者身上出现过共享身份 world_combat:status/acidarmor 的液态窗口；
 *   液态让移动速度高于液化之前（两种形态都自带移动加成）。
 * 具体抬了几级防御、池子多大、对手有没有踩进酸池中毒，写进 note 供读轨迹判断（避开随机交战的时序）。
 */
Smoke.scenario("acidarmor", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.fill([-8, 0, -8], [8, 3, 8], "minecraft:air");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "muk", level: 34, moves: ["acidarmor"], at: [0, 0, 0] });
    var baseSpeed = stage.attribute(caster, "minecraft:generic.movement_speed");
    var foe = stage.mob({ type: "minecraft:ravager", at: [5, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1000, function () {
        return stage.casts("acidarmor", caster) > 0
            && stage.hadMobEffect(caster, "world_combat:status/acidarmor")
            && stage.attribute(caster, "minecraft:generic.movement_speed") > baseSpeed + 0.001;
    }, function () {
        stage.expect(stage.casts("acidarmor", caster) > 0, "acid armor was committed");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/acidarmor"), "the liquid window carried the shared identity");
        stage.expect(stage.attribute(caster, "minecraft:generic.movement_speed") > baseSpeed + 0.001,
            "the liquid body glided faster than before");
        // 酸池按 poolTicks 留在原地；给对手一段时间自己踩进来，再记录有没有中毒。
        stage.after(150, function () {
            stage.note("acid armor liquefied the body; the acid pool poisons whoever stands in it, so the foe's poison is recorded rather than asserted", {
                casts: stage.casts("acidarmor", caster),
                speedBefore: baseSpeed,
                speedAfter: stage.attribute(caster, "minecraft:generic.movement_speed"),
                foePoisoned: stage.hasMobEffect(foe, "minecraft:poison") || stage.hadMobEffect(foe, "world_combat:status/poison"),
                foeAlive: foe.alive(),
                damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                alive: caster.alive()
            });
            stage.done();
        });
    }, "acid armor engages");
});
