/**
 * 刷刷茶炮 / matchagotcha 的可执行设计说明。
 *
 * 场面：晴天白天、开阔平地。只会刷刷茶炮的来悲粗茶（sinistcha，技能表只给这一招）对一只只会「跃起」的卡比兽
 *   （snorlax，伤害不了施法者），相隔六格；先把施法者用 /damage 分步压到约七成，再开战。
 *
 * 必然事实：本招被提交过；目标受到过茶炮伤害；施法者从这一炮回复过生命（回血走共享伤害载荷的 drain）。
 *   命中率、暴击与灼伤是否触发（原生 20%）取决于双方数据，写进 note 供读轨迹判断。
 */
Smoke.scenario("matchagotcha", function (stage) {
    stage.weather("clear");
    stage.time("day");

    var caster = stage.pokemon({ species: "sinistcha", level: 50, moves: ["matchagotcha"], at: [-6, 0, 0] });
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
        stage.until(1200, function () {
            return stage.casts("matchagotcha", caster) > 0 && stage.damageTo(foe) > 0 && caster.health() > baseline + 2;
        }, function () {
            stage.expect(stage.casts("matchagotcha", caster) > 0, "刷刷茶炮被放出来了");
            stage.expect(stage.damageTo(foe) > 0, "茶炮泼到了目标，造成了伤害");
            stage.expect(caster.health() > baseline + 2, "施法者从这一炮里回复了生命");
            stage.note("命中率、暴击与灼伤（原生 20%）不写死；回血走共享伤害载荷的 drain。射程、溅射半径、灼伤概率与持续由特攻、速度、身高公式决定。",
                { casts: stage.casts("matchagotcha", caster), damage: Math.round(stage.damageTo(foe) * 10) / 10,
                  burned: stage.hadMobEffect(foe, "world_combat:status/burn"),
                  woundedHealth: Math.round(baseline * 10) / 10, casterHealth: Math.round(caster.health() * 10) / 10 });
            stage.done();
        }, "茶炮命中并回复");
    }, "施法者被压到七成");
});
