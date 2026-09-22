/**
 * 绝对零度 / sheercold 的可执行设计说明。
 *
 * 场面：晴天白天、开阔平地。只会绝对零度的冰属性拉普拉斯（lapras，40 级）对一只只会「跃起」的低级
 *   鲤鱼王（magikarp，12 级），相距 2.5 格；冰属性使用者把结霜延迟压到最短，等级差再缩短一截。
 *
 * 必然事实：本招被提交过；鲤鱼王受到过绝对零度的处决伤害（生命被一次冻毙）。
 *   命中与否不写死：目标若在结霜前走出那一圈就会落空（冰属性目标免疫），写进 note 供读轨迹判断。
 */
Smoke.scenario("sheercold", function (stage) {
    stage.weather("clear");
    stage.time("day");

    var caster = stage.pokemon({ species: "lapras", level: 40, moves: ["sheercold"], at: [-2.5, 0, 0] });
    var foe = stage.pokemon({ species: "magikarp", level: 12, moves: ["splash"], at: [0, 0, 0] });
    // 目标脚下放一块会被覆霜的自然地表，好让寒霜的租借替换成为一条必然事实。
    stage.block([0, -1, 0], "minecraft:grass_block");

    stage.until(360, function () { return caster.alive() && foe.alive(); }, function () {
        stage.hostile(caster, foe);
        stage.until(1200, function () {
            return stage.casts("sheercold", caster) > 0 && stage.damageTo(foe) > 0;
        }, function () {
            stage.expect(stage.casts("sheercold", caster) > 0, "绝对零度被放出来了");
            stage.expect(stage.damageTo(foe) > 0, "整圈结霜冻毙了目标，造成了伤害");
            stage.expect(stage.changedBlocks().length > 0, "地面被覆上一层会恢复的寒霜");
            stage.note("命中取决于目标是否还站在冻结圈内；冰属性使用者结霜更快，冰属性目标免疫。",
                { casts: stage.casts("sheercold", caster), damage: Math.round(stage.damageTo(foe) * 10) / 10,
                  foeAlive: foe.alive(), foeHealth: Math.round(foe.health() * 10) / 10,
                  changed: stage.changedBlocks().length });
            stage.done();
        }, "绝对零度命中");
    }, "双方存活");
});
