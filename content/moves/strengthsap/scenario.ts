/**
 * 吸取力量 / strengthsap 的可执行设计说明。
 *
 * 场面：晴天白天、开阔平地。只会「吸取力量」的喇叭芽（bellsprout，技能表只给这一招）对一只只会「跃起」的
 *   卡比兽（snorlax，伤害不了施法者）开战，相隔三格；先把施法者用 /damage 分步压到约六成，再开战。
 *
 * 必然事实：本招被提交过；目标受到过攻击下降、身上出现过共享身份 world_combat:status/strength_sapped；
 *   施法者从这一抽里回复了生命（生命高于压血后的基线）。回血量取决于双方物攻与配置，写进 note 供读轨迹判断。
 */
Smoke.scenario("strengthsap", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.weather("clear");
    stage.time("day");

    var caster = stage.pokemon({ species: "bellsprout", level: 40, moves: ["strengthsap"], at: [-3, 0, 0] });
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
            return stage.casts("strengthsap", caster) > 0 && stage.hadMobEffect(foe, "world_combat:status/strength_sapped")
                && caster.health() > baseline + 3;
        }, function () {
            stage.after(60, function () {
                stage.expect(stage.casts("strengthsap", caster) > 0, "吸取力量被放出来了");
                stage.expect(stage.hadMobEffect(foe, "world_combat:status/strength_sapped"), "目标被抽得物攻下降");
                stage.expect(caster.health() > baseline + 3, "施法者从这一抽里回复了生命");
                stage.note("回血比例由目标物攻相对自身物攻的强弱与深吸配置决定；对手是只会跃起的卡比兽，伤害不了施法者，所以这里读到的是至少一次成功的抽取。",
                    { casts: stage.casts("strengthsap", caster), damageToFoe: Math.round(stage.damageTo(foe) * 10) / 10,
                      woundedHealth: Math.round(baseline * 10) / 10, casterHealth: Math.round(caster.health() * 10) / 10 });
                stage.done();
            });
        }, "吸取力量出手并回复");
    }, "施法者被压到六成");
});
