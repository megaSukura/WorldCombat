/**
 * 伏特攻击 / volttackle 的可执行设计说明。
 *
 * 场面：会伏特攻击的雷丘（Raichu）对两只只会跃起、不会还手的鲤鱼王（Magikarp）——一只正对、一只贴在旁边，
 * 用来观察命中后的放电是否会波及到第二个人。
 * 必然事实：本招被提交过；它命中过正面的靶子，且施法者因此掉过血（反作用力）。
 * 命中 100，但冲空仍可能发生；波及是否命中、是否灌入麻痹（默认约 10%）都是随走位与概率变化的结果，写进 note。
 */
Smoke.scenario("volttackle", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "raichu", level: 50, moves: ["volttackle"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "magikarp", level: 20, moves: ["splash"], at: [3, 0, 0] });
    var bystander = stage.pokemon({ species: "magikarp", level: 20, moves: ["splash"], at: [3, 0, 1.6] });
    stage.hostile(caster, foe);
    stage.hostile(caster, bystander);
    stage.until(1400, function () {
        return stage.casts("volttackle", caster) > 0 && stage.damageTo(caster) > 0
            && (stage.damageTo(foe) + stage.damageTo(bystander)) > 0;
    }, function () {
        stage.expect(stage.casts("volttackle", caster) > 0, "volttackle was committed");
        stage.expect(stage.damageTo(foe) + stage.damageTo(bystander) > 0, "the electrified charge landed");
        stage.expect(stage.damageTo(caster) > 0, "the recoil hurt the user");
        stage.note("放电波及、麻痹都是随走位与概率变化的结果（默认约 10%）", {
            casts: stage.casts("volttackle", caster),
            onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            onBystander: Math.round(stage.damageTo(bystander) * 10) / 10,
            selfDamage: Math.round(stage.damageTo(caster) * 10) / 10,
            foeParalyzed: stage.hadMobEffect(foe, "world_combat:status/paralysis"),
            bystanderParalyzed: stage.hadMobEffect(bystander, "world_combat:status/paralysis"),
            casterHp: caster.health(),
            foeAlive: foe.alive()
        });
        stage.done();
    }, "volttackle lands, may arc to a bystander, and the recoil costs the user");
});
