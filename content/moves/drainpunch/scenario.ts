/**
 * 吸取拳 / drainpunch 的可执行设计说明。
 *
 * 场面：晴天白天、开阔平地。只会吸取拳的腕力（machop，技能表只给这一招）对一只只会「跃起」的卡比兽
 *   （snorlax，伤害不了施法者），相隔四格；先把施法者用 /damage 分步压到约七成，再开战。
 *
 * 必然事实：本招被提交过；连打式下同一目标被三拳中的多拳真实打中（每拳独立 strike，旧实现后续拳被原生去重为零伤）；
 *   施法者从拳击回复过生命（回血走共享伤害载荷的 drain）。命中率、暴击与具体拳数取决于双方数据，写进 note 供读轨迹判断。
 */
Smoke.scenario("drainpunch", function (stage) {
    stage.weather("clear");
    stage.time("day");

    var caster = stage.pokemon({ species: "machop", level: 35, moves: ["drainpunch"], at: [-4, 0, 0] });
    var foe = stage.pokemon({ species: "snorlax", level: 30, moves: ["splash"], at: [0, 0, 0] });
    // 打开连打式，让同一目标的后续两拳也走本招自己的结算路径。
    stage.after(1, function () { stage.prefer(caster, "drainpunch", { combo: true }); });

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
            return stage.casts("drainpunch", caster) > 0 && stage.hits(foe, true) >= 2 && caster.health() > baseline + 2;
        }, function () {
            stage.expect(stage.casts("drainpunch", caster) > 0, "吸取拳被放出来了");
            stage.expect(stage.hits(foe, true) >= 2, "连打式的后续拳也真实打中了同一目标");
            stage.expect(stage.damageTo(foe) > 0, "吸取拳打到了目标，造成了伤害");
            stage.expect(caster.health() > baseline + 2, "施法者从拳击里回复了生命");
            stage.note("命中率、暴击与连打式的拳数不写死；同一目标的多拳靠每拳独立 strike 结算。拳距、拳面判定与拳威由物攻、速度、身高公式决定。",
                { casts: stage.casts("drainpunch", caster), hits: stage.hits(foe, true), damage: Math.round(stage.damageTo(foe) * 10) / 10,
                  woundedHealth: Math.round(baseline * 10) / 10, casterHealth: Math.round(caster.health() * 10) / 10 });
            stage.done();
        }, "吸取拳命中并回复");
    }, "施法者被压到七成");
});
