/**
 * 清醒 / smellingsalts —— 可执行设计说明。
 *
 * 一句话：贴近伸手拍一把盐——拍中麻痹的敌人这一记翻倍，但也会把它拍醒；同一招也能无伤拍醒麻痹的伙伴。
 *
 * 场面：一只只带这一招的拍击手贴身对一只正麻痹、血厚、比自己强的对手；平地、白天。
 * 对手的原生麻痹经共享镜像落成身份 world_combat:status/paralysis，固定住「正麻痹」这个触发。
 * 断言（必然事实）：本招被提交过、对手吃到过伤害、对手身上出现过麻痹身份、命中后麻痹身份被清除。
 * 拍醒麻痹伙伴的无伤路径不在本场景强制触发，写在 note 里供读轨迹判断。
 */
Smoke.scenario("smellingsalts", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var user = stage.pokemon({ species: "hariyama", level: 40, moves: ["smellingsalts"], at: [-1.5, 0, 0], properties: "nature=adamant" });
    // 皮糙肉厚、等级更高的陪练，让这一掌打醒它之后它还站着，麻痹被清除能被读到。
    var foe = stage.pokemon({ species: "gyarados", level: 60, moves: ["splash"], at: [2, 0, 0], status: "paralysis" });
    stage.hostile(user, foe);
    stage.until(1600, function () {
        return stage.casts("smellingsalts", user) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(30, function () {
            stage.expect(stage.casts("smellingsalts", user) > 0, "hariyama committed smelling salts");
            stage.expect(stage.damageTo(foe) > 0, "the salt slap dealt damage");
            stage.expect(stage.hadMobEffect(foe, "world_combat:status/paralysis"), "the target carried the paralysis identity");
            stage.expect(!stage.hasMobEffect(foe, "world_combat:status/paralysis"), "the salt cleared the target's paralysis");
            stage.note("doubling came from the paralysis identity of the body actually slapped at hit time; a friendly body takes no damage and is only woken if truly paralysed, read the trace for which casts landed while paralysed", {
                casts: stage.casts("smellingsalts", user),
                dealt: Math.round(stage.damageBy(user) * 10) / 10,
                targetDamage: Math.round(stage.damageTo(foe) * 10) / 10,
                cured: !stage.hasMobEffect(foe, "world_combat:status/paralysis"),
                tick: stage.tick()
            });
            stage.done();
        });
    }, "smelling salts lands on the target within 30 s");
});
