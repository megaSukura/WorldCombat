/**
 * 悔念剑 / bitterblade 的可执行设计说明。
 *
 * 场面：晴天白天、开阔平地。只会悔念剑的苍炎刃鬼（ceruledge，技能表只给这一招）对一只只会「跃起」的卡比兽
 *   （snorlax，伤害不了施法者），相隔三格；先把施法者用 /damage 分步压到约六成（也让「悔意」加成进入运算），再开战。
 *
 * 必然事实：本招被提交过；目标受到过斩击伤害；施法者从这一剑回复过生命（回血走共享伤害载荷的 drain）。
 *   命中率、暴击、弧内命中数与残血加成幅度取决于双方数据，写进 note 供读轨迹判断。
 */
Smoke.scenario("bitterblade", function (stage) {
    stage.weather("clear");
    stage.time("day");

    var caster = stage.pokemon({ species: "ceruledge", level: 50, moves: ["bitterblade"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "snorlax", level: 30, moves: ["splash"], at: [0, 0, 0] });

    var maximum = 0, baseline = 0, wounded = false, tries = 0;
    function wound(): void {
        if (wounded || !caster.alive()) return;
        if (maximum <= 0) maximum = caster.health();
        if (maximum <= 0) return;
        if (caster.health() <= maximum * 0.6 || tries >= 30) { baseline = caster.health(); wounded = true; return; }
        tries++;
        var at = caster.position();
        stage.command("execute positioned " + at[0] + " " + at[1] + " " + at[2]
            + " run damage @e[type=cobblemon:pokemon,distance=..2,limit=1,sort=nearest] "
            + Math.max(1, Math.round(maximum * 0.09)) + " minecraft:generic");
        stage.after(6, wound);
    }
    stage.after(5, wound);

    stage.until(360, function () { return wounded; }, function () {
        stage.hostile(caster, foe);
        stage.until(1200, function () {
            return stage.casts("bitterblade", caster) > 0 && stage.damageTo(foe) > 0 && caster.health() > baseline + 2;
        }, function () {
            stage.expect(stage.casts("bitterblade", caster) > 0, "悔念剑被放出来了");
            stage.expect(stage.damageTo(foe) > 0, "悔念剑扫到了目标，造成了伤害");
            stage.expect(caster.health() > baseline + 2, "施法者从这一剑里回复了生命");
            stage.note("命中率、暴击与弧内命中数不写死；回血走共享伤害载荷的 drain。张角、剑距、剑锋判定由公式决定，斩击威力与汲取比例随施法者已失去的生命比例上升。",
                { casts: stage.casts("bitterblade", caster), damage: Math.round(stage.damageTo(foe) * 10) / 10,
                  woundedHealth: Math.round(baseline * 10) / 10, casterHealth: Math.round(caster.health() * 10) / 10 });
            stage.done();
        }, "悔念剑命中并回复");
    }, "施法者被压到六成");
});
