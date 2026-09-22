/**
 * 腹鼓 / Belly Drum —— 可执行设计说明。
 *
 * 一句话：有敌人的时候，用半条命把物攻拉满；AI 只在场上有威胁、自身生命高于 ai.healthFloor（默认 0.65）、
 *   且身上没有同名力量窗口时起鼓。所以场面必须先造出威胁，再让施术者保持在高血。
 *
 * 场面：晴天白天、开阔平地。只会腹鼓的卡比兽（snorlax，会学这招；技能表只给这一招）站在一侧；7 格外站一只
 *   小拉达并宣战。施术者由服务端 /damage 先压到约九成生命（跨过下限仍保留足够生命），再让 AI 在威胁下调出腹鼓。
 *
 * 必然事实：施术者提交过腹鼓；起鼓把生命压到 keep 比例（默认一半），所以结算后生命必定不高于最大生命的一半
 *   多一点；力量窗口以共享状态 world_combat:status/bellydrum 出现。物攻的具体等级在私有装配里没有读取原语，
 *   只在 note 说明。目标的小拉达「撞击」不在私有装配里，不会真的造成伤害干扰读数。
 */
Smoke.scenario("bellydrum", function (stage) {
    stage.weather("clear");
    stage.time("day");

    var caster = stage.pokemon({ species: "snorlax", level: 30, moves: ["bellydrum"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "rattata", level: 15, moves: ["tackle"], at: [7, 0, 0] });
    stage.hostile(caster, foe);

    // 先压到约九成：高于起鼓下限，又让腹鼓的代价（压到一半）可被清晰观察到。
    var maximum = 0;
    function wound(): void {
        if (!caster.alive()) return;
        if (maximum <= 0) maximum = caster.health();
        if (maximum <= 0) return;
        if (caster.health() <= maximum * 0.9) return;
        var at = caster.position();
        stage.command("execute positioned " + at[0] + " " + at[1] + " " + at[2]
            + " run damage @e[type=cobblemon:pokemon,distance=..2,limit=1,sort=nearest] "
            + Math.max(1, Math.round(maximum * 0.05)) + " minecraft:generic");
        stage.after(10, wound);
    }
    stage.after(5, wound);

    stage.until(900, function () {
        return stage.casts("bellydrum", caster) >= 1;
    }, function () {
        stage.expect(stage.casts("bellydrum", caster) >= 1, "the threatened snorlax drummed while above its health floor");
        stage.expect(caster.health() <= maximum * 0.56, "belly drum paid the cost down to about half the maximum health");
        stage.after(60, function () {
            stage.expect(stage.hadMobEffect(caster, "world_combat:status/bellydrum"), "the power window is carried by the shared status world_combat:status/bellydrum");
            stage.note("物攻等级的具体数值在私有装配里没有读取原语：NativeEffects.boost(self, \"atk\", stages) 写入 +6，并由同名状态窗口在结束时收回。起鼓后的生命、力量窗口时长（frenzy 约 10 秒 / endure 约 24 秒）与准备/收招随体重与速度变化，属于设计事实，由完整装配的人工试玩核对。", {
                casterCasts: stage.casts("bellydrum", caster),
                maximumHealth: Math.round(maximum * 10) / 10,
                casterHealth: Math.round(caster.health() * 10) / 10,
                healthRatio: maximum > 0 ? Math.round(caster.health() / maximum * 100) / 100 : 0,
                surgeStatusEver: stage.hadMobEffect(caster, "world_combat:status/bellydrum"),
                damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                foeCasts: stage.casts("tackle", foe),
                casterAlive: caster.alive(),
                tick: stage.tick()
            });
            stage.done();
        });
    }, "belly drum is cast within 45 s");
});
