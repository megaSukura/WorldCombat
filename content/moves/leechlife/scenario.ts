/**
 * 吸血 / leechlife 的可执行设计说明。
 *
 * 场面：晴天白天、开阔平地。只会吸血的超音蝠（zubat，技能表只给这一招）对一只只会「跃起」的卡比兽
 *   （snorlax，伤害不了施法者），相隔三格；先把施法者用 /damage 分步压到约七成，再开战。
 *
 * 必然事实：本招被提交过；目标受到过吸血伤害；施法者从这场抽吸里回复过生命（回血走共享伤害载荷的 drain）。
 *   命中率、暴击、抽吸拍数与目标是否中途脱开取决于双方数据，写进 note 供读轨迹判断。
 */
Smoke.scenario("leechlife", function (stage) {
    stage.weather("clear");
    stage.time("day");

    var caster = stage.pokemon({ species: "zubat", level: 35, moves: ["leechlife"], at: [-3, 0, 0] });
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
        stage.until(1400, function () {
            return stage.casts("leechlife", caster) > 0 && stage.damageTo(foe) > 6 && caster.health() > baseline + 2;
        }, function () {
            stage.expect(stage.casts("leechlife", caster) > 0, "吸血被放出来了");
            stage.expect(stage.damageTo(foe) > 6, "吸血咬住后连抽了几拍（超过单次撕咬的伤害）");
            stage.expect(caster.health() > baseline + 2, "施法者从抽吸里回复了生命");
            stage.note("命中率、暴击与抽吸拍数不写死；回血走共享伤害载荷的 drain。咬距、拉扯距离与每拍抽量由物攻、速度、身高公式决定；施法者在整段抽吸里站着不动。",
                { casts: stage.casts("leechlife", caster), damage: Math.round(stage.damageTo(foe) * 10) / 10,
                  woundedHealth: Math.round(baseline * 10) / 10, casterHealth: Math.round(caster.health() * 10) / 10 });
            stage.done();
        }, "吸血咬中并回复");
    }, "施法者被压到七成");
});
