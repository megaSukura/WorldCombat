/**
 * 尖刺臂的可执行设计说明：让装备本招的毒蔷薇（Roselia，草系、带刺）对一只铁傀儡挥击。
 * 原生说明里本招有 5 位学习者，但 Cobblemon 1.8 的物种学习表未收录它，故这里用主题相符的草系宝可梦装备本招。
 * 荆棘只扎贴地的目标（`grounded()`）；铁傀儡贴地又会留在原地附近，所以落在它脚下的荆棘能扎到它。
 *
 * 必然事实：本招被提交过（`stage.casts`）；刺臂挥中目标并造成伤害（`damageTo`）；目标脚下的荆棘扎到过它
 * （`hadMobEffect(foe, "minecraft:slowness")`——只有本招的荆棘会对目标施加缓慢）。30% 畏缩与扎刺次数写进 note。
 */
Smoke.scenario("needlearm", function (stage) {
    stage.fill([-10, -1, -6], [10, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "roselia", level: 32, moves: ["needlearm"], at: [-3, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [2, 0, 0] });
    stage.hostile(caster, foe);
    // 先让铁傀儡落地几刻（`grounded()` 需要它真正站在方块上），再关掉 AI 让它停住；荆棘只扎贴地的目标。
    stage.after(8, function () {
        stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..14,limit=1] {NoAI:1b}");
    });
    stage.until(1600, function () {
        return stage.casts("needlearm", caster) >= 1 && stage.damageTo(foe) > 0
            && stage.hadMobEffect(foe, "minecraft:slowness");
    }, function () {
        stage.after(30, function () {
            stage.expect(stage.casts("needlearm", caster) >= 1, "the caster committed needle arm");
            stage.expect(stage.damageTo(foe) > 0, "the thorny swing struck and damaged the foe");
            stage.expect(stage.hadMobEffect(foe, "minecraft:slowness"), "the bramble left at the foe's feet pricked it (slowness)");
            stage.note("whether the 30% flinch rolled and how many times the briar pricked are random", {
                casts: stage.casts("needlearm", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                flinched: stage.hadMobEffect(foe, "world_combat:status/flinch"),
                pricked: stage.hadMobEffect(foe, "minecraft:slowness")
            });
            stage.done();
        });
    }, "needle arm lands and the briar pricks within 80 s");
});
