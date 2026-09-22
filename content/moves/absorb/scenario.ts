/**
 * 吸取 / absorb 的可执行设计说明。
 *
 * 场面：晴天白天、开阔平地。只会吸取的妙蛙种子（bulbasaur，技能表只给这一招）对一只只会「跃起」的
 *   卡比兽（snorlax，伤害不了施法者）；先把施法者用 /damage 分步压到约七成，跨过掉血状态，再开战。
 *
 * 必然事实：本招被提交过；目标受到过吸取伤害；施法者从这一口回复过生命（生命高于压血后的基线）。
 *   命中率、暴击、汲取比例与藤长取决于双方数据，写进 note 供读轨迹判断。
 */
Smoke.scenario("absorb", function (stage) {
    stage.weather("clear");
    stage.time("day");

    var caster = stage.pokemon({ species: "bulbasaur", level: 30, moves: ["absorb"], at: [-5, 0, 0] });
    var foe = stage.pokemon({ species: "snorlax", level: 30, moves: ["splash"], at: [0, 0, 0] });

    var maximum = 0, baseline = 0, wounded = false, tries = 0;
    function wound(): void {
        if (wounded || !caster.alive()) return;
        if (maximum <= 0) maximum = caster.health();
        if (maximum <= 0) return;
        if (caster.health() <= maximum * 0.7 || tries >= 24) { baseline = caster.health(); wounded = true; return; }
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
        stage.until(900, function () {
            return stage.casts("absorb", caster) > 0 && stage.damageTo(foe) > 0 && caster.health() > baseline + 2;
        }, function () {
            stage.expect(stage.casts("absorb", caster) > 0, "吸取被放出来了");
            stage.expect(stage.damageTo(foe) > 0, "藤点到了目标，造成了伤害");
            stage.expect(caster.health() > baseline + 2, "施法者从这一口里回复了生命");
            stage.note("命中率、暴击与汲取比例不写死；回血走共享伤害载荷的 drain。藤长与单口威力由特攻、速度与体型公式决定。",
                { casts: stage.casts("absorb", caster), damage: Math.round(stage.damageTo(foe) * 10) / 10,
                  woundedHealth: Math.round(baseline * 10) / 10, casterHealth: Math.round(caster.health() * 10) / 10,
                  travelled: Math.round(stage.travelled(caster) * 10) / 10 });
            stage.done();
        }, "吸取命中并回复");
    }, "施法者被压到七成");
});
