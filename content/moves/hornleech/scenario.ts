/**
 * 木角 / hornleech 的可执行设计说明。
 *
 * 场面：晴天白天、开阔平地。只会木角的萌芽鹿（sawsbuck，技能表只给这一招）对一只只会「跃起」的卡比兽
 *   （snorlax，伤害不了施法者），相隔五格；先把施法者用 /damage 分步压到约七成，再开战。
 *
 * 必然事实：本招被提交过；目标受到过角撞伤害；施法者移动过（冲撞是带位移的）；施法者从这一口回复过生命。
 *   命中率、暴击、是否贯穿与冲撞距离取决于双方数据，写进 note 供读轨迹判断。
 */
Smoke.scenario("hornleech", function (stage) {
    stage.weather("clear");
    stage.time("day");

    var caster = stage.pokemon({ species: "sawsbuck", level: 35, moves: ["hornleech"], at: [-5, 0, 0] });
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
        stage.until(1100, function () {
            return stage.casts("hornleech", caster) > 0 && stage.damageTo(foe) > 0 && caster.health() > baseline + 2;
        }, function () {
            stage.expect(stage.casts("hornleech", caster) > 0, "木角被放出来了");
            stage.expect(stage.damageTo(foe) > 0, "木角扎到了目标，造成了伤害");
            stage.expect(stage.travelled(caster) > 0.5, "施法者冲出去了（本招带位移）");
            stage.expect(caster.health() > baseline + 2, "施法者从这一口里回复了生命");
            stage.note("命中率、暴击与是否贯穿不写死；回血走共享伤害载荷的 drain。冲出距离、角尖判定与贯穿威力由物攻、速度、体重与体型公式决定。",
                { casts: stage.casts("hornleech", caster), damage: Math.round(stage.damageTo(foe) * 10) / 10,
                  woundedHealth: Math.round(baseline * 10) / 10, casterHealth: Math.round(caster.health() * 10) / 10,
                  travelled: Math.round(stage.travelled(caster) * 10) / 10 });
            stage.done();
        }, "木角命中并回复");
    }, "施法者被压到七成");
});
