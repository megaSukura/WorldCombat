/**
 * 终极吸取 / gigadrain 的可执行设计说明。
 *
 * 场面：晴天白天、开阔平地。只会终极吸取的霸王花（vileplume，技能表只给这一招）对一只只会「跃起」的
 *   卡比兽（snorlax，伤害不了施法者），相隔十格；先把施法者用 /damage 分步压到约六成，再开战。
 *
 * 必然事实：本招被提交过；目标受到过吸根伤害；施法者从连抽里回复过生命（生命高于压血后的基线）。
 *   命中率、暴击、拍数与单拍威力取决于双方数据，写进 note 供读轨迹判断。
 */
Smoke.scenario("gigadrain", function (stage) {
    stage.weather("clear");
    stage.time("day");

    var caster = stage.pokemon({ species: "vileplume", level: 40, moves: ["gigadrain"], at: [-10, 0, 0] });
    var foe = stage.pokemon({ species: "snorlax", level: 30, moves: ["splash"], at: [0, 0, 0] });

    var maximum = 0, baseline = 0, wounded = false, tries = 0;
    function wound(): void {
        if (wounded || !caster.alive()) return;
        if (maximum <= 0) maximum = caster.health();
        if (maximum <= 0) return;
        if (caster.health() <= maximum * 0.6 || tries >= 24) { baseline = caster.health(); wounded = true; return; }
        tries++;
        var at = caster.position();
        stage.command("execute positioned " + at[0] + " " + at[1] + " " + at[2]
            + " run damage @e[type=cobblemon:pokemon,distance=..2,limit=1,sort=nearest] "
            + Math.max(1, Math.round(maximum * 0.09)) + " minecraft:generic");
        stage.after(6, wound);
    }
    stage.after(5, wound);

    stage.until(300, function () { return wounded; }, function () {
        stage.hostile(caster, foe);
        stage.until(1200, function () {
            return stage.casts("gigadrain", caster) > 0 && stage.damageTo(foe) > 0 && caster.health() > baseline + 3;
        }, function () {
            stage.after(90, function () {
                stage.expect(stage.casts("gigadrain", caster) > 0, "终极吸取被放出来了");
                stage.expect(stage.damageTo(foe) > 0, "吸根抽到了目标，造成了伤害");
                stage.expect(caster.health() > baseline + 3, "施法者从连抽里回复了生命");
                stage.note("命中率、暴击与拍数不写死；回血走共享伤害载荷的 drain。射程、吸根半径与每拍威力由特攻、速度、等级与体型公式决定；这里等 90 刻让几拍跑完，累积伤害读得到拍数。",
                    { casts: stage.casts("gigadrain", caster), damage: Math.round(stage.damageTo(foe) * 10) / 10,
                      woundedHealth: Math.round(baseline * 10) / 10, casterHealth: Math.round(caster.health() * 10) / 10,
                      travelled: Math.round(stage.travelled(caster) * 10) / 10 });
                stage.done();
            });
        }, "终极吸取命中并回复");
    }, "施法者被压到六成");
});
