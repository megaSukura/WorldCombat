/**
 * 尖刺臂的可执行设计说明：让装备本招的毒蔷薇（Roselia，草系、带刺）对一只关掉 AI 的铁傀儡短扑横扫。
 * 原生说明里本招有 5 位学习者，但 Cobblemon 1.8 的物种学习表未收录它，故这里用主题相符的草系宝可梦装备本招。
 * 铁傀儡不逃不还手，所以扫中的伤害只可能来自本招的 `rake` 段。
 *
 * 必然事实：本招被提交过（`stage.casts`）；刺臂扫中目标并造成伤害（`damageTo`）。
 * 三拍扇面各扫到几次、30% 畏缩是否触发，都写进 note 供读轨迹判断；`rake` 每敌只结算一次由代码保证。
 */
Smoke.scenario("needlearm", function (stage) {
    stage.fill([-10, -1, -6], [10, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "roselia", level: 32, moves: ["needlearm"], at: [-3, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [2, 0, 0] });
    stage.hostile(caster, foe);
    // 先让铁傀儡落地几刻（横扫选敌用身体中心与高度带），再关掉 AI 让它停住。
    stage.after(8, function () {
        stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..14,limit=1] {NoAI:1b}");
    });
    stage.until(1600, function () {
        return stage.casts("needlearm", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(30, function () {
            stage.expect(stage.casts("needlearm", caster) >= 1, "the caster committed needle arm");
            stage.expect(stage.damageTo(foe) > 0, "the thorny sweep struck and damaged the foe");
            stage.note("whether the 30% flinch rolled and how many of the three sweeps caught the foe are random; each foe takes only one rake per cast by construction", {
                casts: stage.casts("needlearm", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                flinched: stage.hadMobEffect(foe, "world_combat:status/flinch")
            });
            stage.done();
        });
    }, "needle arm lands within 80 s");
});
