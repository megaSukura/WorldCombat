/**
 * 重磅冲撞的可执行设计说明。
 *
 * 场面：一只只会重磅冲撞的重型精灵（Snorlax），面对 3 格外一只极慢、极轻的 Shuckle。两者开战，AI 只有这一招可用。
 * 必然事实：本招被提交过；目标被砸中并受到伤害。
 * 是否把落点周围第二名目标一起震开、坑里换成了哪些方块，都是位置结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("heavyslam", function (stage) {
    var caster = stage.pokemon({ species: "Snorlax", level: 36, moves: ["heavyslam"], at: [0, 0, 0] });
    var foe = stage.pokemon({ species: "Shuckle", level: 15, moves: ["tackle"], at: [3, 0, 0] });
    stage.block([3, -1, 0], "minecraft:dirt");
    stage.block([2, -1, 0], "minecraft:dirt");
    stage.block([4, -1, 0], "minecraft:dirt");
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("heavyslam") > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(30, function () {
            stage.expect(stage.casts("heavyslam") > 0, "heavyslam was committed");
            stage.expect(stage.damageTo(foe) > 0, "the slam dealt damage");
            stage.expect(stage.changedBlocks().some(function (b) { return b.after === "minecraft:cobblestone" || b.after === "minecraft:andesite"; }),
                "the crater was left in the ground");
            stage.note("heavyslam observations", { casts: stage.casts("heavyslam"), onFoe: stage.damageTo(foe),
                moved: Math.round(stage.travelled(caster) * 10) / 10, hurtBack: stage.damageTo(caster),
                changed: stage.changedBlocks() });
            stage.done();
        });
    }, "heavyslam lands");
});
