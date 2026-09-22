/**
 * 地震 / earthquake —— 可执行设计说明。
 *
 * 一句话：把重量砸进地面，脚下整片同时掀起，站在地上的敌人一起被抛起、推开，地面留下放射状深缝。
 *
 * 场面：体重很大的隆隆石（地面系）带这一招，站在一只小敌与一只原版铁傀儡旁边，两者都站在地上；
 * 铁傀儡血厚、用来核对「对原版生物也走同一条路」并看清被掀起来的位移，同时逼出「一次罩住一圈」的局面。
 *
 * 断言只取必然事实：这招被放过、至少一只站在地上的敌人挨到伤害、掀完地面留下裂缝。
 * 上抛的高度、具体有几个人落在圈里、暴击与余震是否命中写进 note 供读轨迹判断。
 */
Smoke.scenario("earthquake", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "golem", level: 40, moves: ["earthquake"], at: [0, 0, 0] });
    var foe = stage.pokemon({ species: "rattata", level: 16, moves: ["tackle"], at: [2.6, 0, 0] });
    var heavy = stage.mob({ type: "minecraft:iron_golem", at: [2.2, 0, 1.2] });
    stage.hostile(caster, foe);
    stage.hostile(caster, heavy);
    stage.until(1200, function () {
        return stage.casts("earthquake", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        // 等裂缝铺下后再核对地表留下的东西。
        stage.after(15, function () {
            stage.expect(stage.casts("earthquake", caster) >= 1, "golem committed earthquake");
            stage.expect(stage.damageTo(foe) > 0, "the upheaval dealt damage to a grounded foe");
            stage.expect(stage.changedBlocks().length > 0, "the rupture left rents in the ground");
            stage.note("the launch height, the crit roll and how many stood inside the disc are random/positional", {
                casts: stage.casts("earthquake", caster),
                foeDamage: Math.round(stage.damageTo(foe) * 10) / 10,
                heavyDamage: Math.round(stage.damageTo(heavy) * 10) / 10,
                heavyTravelled: Math.round(stage.travelled(heavy) * 10) / 10,
                changed: stage.changedBlocks().length,
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "earthquake upheaves a grounded foe within 60 s");
});
