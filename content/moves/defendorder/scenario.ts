/**
 * 防御指令 的可执行设计说明。
 *
 * 场面：一只只会「防御指令」的蜂女王（30 级，唯一正式学习者）与一只弱小的小拉达隔开 8 格、石质场地上开战；
 *   技能表里只有这一招，所以 AI 只能先召手下贴上身。有威胁且在召令距离内、还没贴身时，它会先叠甲壳。
 * 必然事实：本招被提交过；施术者身上出现过共享身份 world_combat:status/defendorder 的甲壳窗口。
 *   召了几只、活了几只、甲壳抬了多少级写进 note 供读轨迹判断（私有装配读不到原生能力等级，也读不到持久实体的存活）。
 */
Smoke.scenario("defendorder", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "vespiquen", level: 30, moves: ["defendorder"], at: [-3, 0, 0], properties: "gender=female" });
    var foe = stage.pokemon({ species: "rattata", level: 10, moves: ["tackle"], at: [5, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("defendorder", caster) > 0
            && stage.hadMobEffect(caster, "world_combat:status/defendorder");
    }, function () {
        stage.expect(stage.casts("defendorder", caster) > 0, "defend order was committed");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/defendorder"), "the shell window carried the shared identity");
        stage.after(120, function () {
            stage.note("brood (level driven, default 2-3, swarm +2) and each underling's +1/+1 are native for a Pokemon and unreadable here; the underlings are WorldBodies, so the private assembly cannot read their survival from the stage. Stages equal the live underling count, so killing one thins the shell at once.", {
                casts: stage.casts("defendorder", caster),
                damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                damageByCaster: Math.round(stage.damageBy(caster) * 10) / 10,
                casterAlive: caster.alive()
            });
            stage.done();
        });
    }, "defend order engages");
});
