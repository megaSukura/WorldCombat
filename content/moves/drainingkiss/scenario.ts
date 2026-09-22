/**
 * 吸取之吻 / drainingkiss 的可执行设计说明。
 *
 * 场面：晴天白天、开阔平地。只会吸取之吻的胖丁（jigglypuff）对一只只会「跃起」的卡比兽（snorlax，
 *   伤害不了施法者）；先把施法者用 /damage 分步压到约七成，跨过掉血状态，再开战。
 *
 * 必然事实：本招被提交过；目标受到过吻击伤害；施法者从这一吻回复过生命（生命高于压血后的基线）。
 *   命中率、暴击、汲取比例（原生四分之三，个体数据会把它推高）与亲吻距离取决于双方数据，写进 note。
 */
Smoke.scenario("drainingkiss", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.weather("clear");
    stage.time("day");

    var caster = stage.pokemon({ species: "jigglypuff", level: 30, moves: ["drainingkiss"], at: [-4, 0, 0] });
    var foe = stage.pokemon({ species: "snorlax", level: 35, moves: ["splash"], at: [0, 0, 0] });

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
            + Math.max(1, Math.round(maximum * 0.08)) + " minecraft:generic");
        stage.after(6, wound);
    }
    stage.after(5, wound);

    stage.until(300, function () { return wounded; }, function () {
        stage.hostile(caster, foe);
        stage.until(900, function () {
            return stage.casts("drainingkiss", caster) > 0 && stage.damageTo(foe) > 0 && caster.health() > baseline + 2;
        }, function () {
            stage.expect(stage.casts("drainingkiss", caster) > 0, "draining kiss was cast");
            stage.expect(stage.damageTo(foe) > 0, "the kiss dealt damage");
            stage.expect(caster.health() > baseline + 2, "the user regained health from the kiss");
            stage.note("回血走共享伤害载荷的 drain（原生四分之三）；命中率、暴击、亲密度带来的偏移不写死。",
                { casts: stage.casts("drainingkiss", caster), damage: Math.round(stage.damageTo(foe) * 10) / 10,
                  woundedHealth: Math.round(baseline * 10) / 10, casterHealth: Math.round(caster.health() * 10) / 10,
                  travelled: Math.round(stage.travelled(caster) * 10) / 10 });
            stage.done();
        }, "draining kiss lands and heals");
    }, "caster is wounded below 70%");
});
