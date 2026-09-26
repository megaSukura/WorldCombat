/**
 * 地震 / earthquake —— 可执行设计说明。
 *
 * 一句话：把重量砸进地面，脚下整片同时掀起，站在地上的敌人一起被抛起、推开，地面扬起放射状裂纹后散去。
 *
 * 场面：体重很大的隆隆石（地面系）带这一招，站在两只原版铁傀儡旁边——两者都站在地上、会主动贴上来，
 * 逼出「一圈站在地上的人都吃」的场面。铁傀儡血厚、原生抗性拉满，用来核对「抗推的Boss只吃地面伤、
 * 不被强抛」（位移是否被拒绝写进 note，实机观感由试玩确认）。整场铺满石头，同时核对不再替换地面方块。
 *
 * 断言只取必然事实：这招被放过、至少一只站在地上的铁傀儡挨到伤害、施放前后地面方块没有变化。
 * 上抛高度、具体有几个人落在圈里、暴击与余震是否命中写进 note 供读轨迹判断。
 */
Smoke.scenario("earthquake", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "golem", level: 40, moves: ["earthquake"], at: [0, 0, 0] });
    var heavyA = stage.mob({ type: "minecraft:iron_golem", at: [2.0, 0, 0] });
    var heavyB = stage.mob({ type: "minecraft:iron_golem", at: [1.8, 0, 1.6] });
    stage.hostile(caster, heavyA);
    stage.hostile(caster, heavyB);
    stage.until(1200, function () {
        return stage.casts("earthquake", caster) >= 1 && (stage.damageTo(heavyA) > 0 || stage.damageTo(heavyB) > 0);
    }, function () {
        // 等主震与余波落定后再核对地面。
        stage.after(15, function () {
            stage.expect(stage.casts("earthquake", caster) >= 1, "golem committed earthquake");
            stage.expect(stage.damageTo(heavyA) > 0 || stage.damageTo(heavyB) > 0, "the upheaval dealt damage to a grounded foe");
            stage.expect(stage.changedBlocks().length === 0, "the rupture left the ground blocks untouched");
            stage.note("knockback resistance should leave the iron golems unlaunched; their travel includes their own approach", {
                casts: stage.casts("earthquake", caster),
                heavyADamage: Math.round(stage.damageTo(heavyA) * 10) / 10,
                heavyBDamage: Math.round(stage.damageTo(heavyB) * 10) / 10,
                heavyATravelled: Math.round(stage.travelled(heavyA) * 10) / 10,
                heavyBTravelled: Math.round(stage.travelled(heavyB) * 10) / 10,
                changed: stage.changedBlocks().length
            });
            stage.done();
        });
    }, "earthquake upheaves a grounded foe within 60 s");
});
