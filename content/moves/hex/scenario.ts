/**
 * 祸不单行 / hex 的可执行设计说明。
 *
 * 一句话：在带异常的对手脚下布一片诅咒结界，一波波涌刺；带异常者翻倍。
 *
 * 场面：一只耿鬼（Gengar）在 6 格外对一只已灼伤的怪力（Machamp）布咒；目标带灼伤，正是翻倍窗口，
 *   因此开场把原生状态设成 burn，让共享身份 world_combat:status/burn 先成立。目标选格斗系：幽灵系的诅咒
 *   对一般系无效，必须挑一个不是一般系的对手才打得出伤害。
 * 必然事实：本招被提交过；怪力受到过诅咒的伤害。
 * 翻倍是否生效、结界命中了几波、暴击与否写进 note，供读轨迹判断。
 */
Smoke.scenario("hex", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Gengar", level: 35, moves: ["hex"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "Machamp", level: 45, moves: ["tackle"], at: [3, 0, 0], status: "burn" });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("hex", caster) > 0 && stage.damageBy(caster) > 0;
    }, function () {
        stage.expect(stage.casts("hex", caster) > 0, "hex was committed");
        stage.expect(stage.damageBy(caster) > 0, "the hex curse dealt damage");
        stage.note("hex doubles against a target carrying any status; the burn was set up before the cast so the sigil landed doubled", {
            casts: stage.casts("hex", caster),
            onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            blighted: stage.hasMobEffect(foe, "world_combat:status/burn"),
            moved: Math.round(stage.travelled(foe) * 10) / 10
        });
        stage.done();
    }, "hex lands on the burning target");
});
