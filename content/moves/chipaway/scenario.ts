/**
 * 逐步击破 / chipaway 的可执行设计说明。
 *
 * 场面：一只只会逐步击破的腕力（Machop，一般系拳脚学习者）面对约 3 格外的一只被点住、不会还手的铁傀儡
 *   （耐打又不会跑掉的靶子）。开战，AI 只有这一招可用。
 * 必然事实：本招被提交过（`stage.casts`）；目标受到过伤害（连击至少命中了一拍）。
 * 具体打了几拍、每拍多少、目标是否涨过防、暴击，写进 note 供读轨迹判断。
 */
Smoke.scenario("chipaway", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Machop", level: 25, moves: ["chipaway"], at: [0, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [1, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("execute as @e[type=minecraft:iron_golem,distance=..8] run data merge entity @s {NoAI:1b}");
    stage.until(700, function () {
        return stage.casts("chipaway", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(40, function () {
            stage.expect(stage.casts("chipaway", caster) > 0, "chipaway was committed");
            stage.expect(stage.damageTo(foe) > 0, "at least one beat of the combo landed");
            stage.note("贴脸朝瞄准方向连打几拍，每一拍是一条真实短拳路、落在不同高度；本招无视目标涨起来的防御能力等级，装备护甲仍参与减伤，对宝可梦与对原版生物同一路径。铁傀儡没有涨防，实际拍数由速度决定，随机暴击留待人工试玩。", {
                casts: stage.casts("chipaway", caster),
                onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
                onCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "chipaway lands a close-range combo");
});
