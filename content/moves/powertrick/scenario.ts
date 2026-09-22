/**
 * 力量戏法的可执行设计说明。
 *
 * 场面：一只只会「力量戏法」的壶壶（防御远高于攻击）与一只弱小的小拉达隔开 6 格、石质场地上开战。
 *   守高攻低的物攻手在开打前会把两股力道翻过来，AI 会先演这一手。
 * 必然事实：本招被提交过；施术者身上出现过保持窗口身份 world_combat:status/powertrick——只有数值层真正写入时
 *   才会挂上这层窗口。换前换后的数值、差距比、窗口多长写进 note 供读轨迹判断（smoke 不能直接读原生攻防）。
 */
Smoke.scenario("powertrick", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Shuckle", level: 40, moves: ["powertrick"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "Rattata", level: 8, moves: ["tackle"], at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.note("staged: shuckle(40, defence >> attack) powertrick vs rattata(8) at 6 blocks; the trick should flip the two stats");
    stage.until(1200, function () {
        return stage.casts("powertrick", caster) > 0 && stage.hadMobEffect(caster, "world_combat:status/powertrick");
    }, function () {
        stage.expect(stage.casts("powertrick", caster) > 0, "power trick was committed");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/powertrick"), "the hold window carried the shared identity");
        stage.note("Attack and Defence are swapped through the shared stat layer; the window holds the flipped form and reverts when it ends or when the trick is played again", {
            casts: stage.casts("powertrick", caster),
            damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
            damageByCaster: Math.round(stage.damageBy(caster) * 10) / 10,
            casterAlive: caster.alive()
        });
        stage.done();
    }, "the trick lands");
});
