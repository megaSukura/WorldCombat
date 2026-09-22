/**
 * 蓄力 的可执行设计说明。
 *
 * 场面：一只只会「蓄力」的吞食兽（30 级）与一只弱小的小拉达隔开 9 格、石质场地上开战；技能表里只有这一招，
 *   所以 AI 只能先连蓄几层。有威胁且在蓄力距离内、还没贴身时，它会先压几口再考虑交战。
 * 必然事实：本招被提交过；施术者身上出现过共享身份 world_combat:status/stockpile 的光壳窗口。
 *   蓄了几层、破了层没有、每层抬了多少、光壳撑多久写进 note 供读轨迹判断（私有装配没有读取原生能力等级的读取原语）。
 */
Smoke.scenario("stockpile", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "swalot", level: 30, moves: ["stockpile"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "rattata", level: 12, moves: ["tackle"], at: [6, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("stockpile", caster) > 0
            && stage.hadMobEffect(caster, "world_combat:status/stockpile");
    }, function () {
        stage.expect(stage.casts("stockpile", caster) > 0, "stockpile was committed");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/stockpile"), "the shell window carried the shared identity");
        stage.after(80, function () {
            stage.note("each layer gives +1 Defense and +1 Sp. Def (native for a Pokemon and unreadable here) up to 3 layers; AI hoards to ai.hoardTo (default 2) then fights. A real hit cracks one layer and removes its stage; the window takes the rest back by its stored mark when it ends.", {
                casts: stage.casts("stockpile", caster),
                damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                damageByCaster: Math.round(stage.damageBy(caster) * 10) / 10,
                casterAlive: caster.alive()
            });
            stage.done();
        });
    }, "stockpile engages");
});
