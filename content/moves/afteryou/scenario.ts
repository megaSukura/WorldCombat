/**
 * 您先请的可执行设计说明：这是一招把先手让给伙伴的动作，所以场面要有伙伴、也要有让 AI 出手的威胁。
 *
 * 必然事实：施法者提交过「您先请」；伙伴身上出现过共享身份 world_combat:status/afteryou 的加速窗口；
 *   窗口内伙伴的技能急速属性被抬升（world_combat:skill_haste > 0）——这是本招真正把「先手」交给伙伴的证据。
 * 随机结果：伙伴是否在窗口内出手、实际缩短了多少冷却，写进 note 供读轨迹判断。
 */
Smoke.scenario("afteryou", function (stage) {
    stage.weather("clear");
    stage.time("day");
    var caster = stage.pokemon({ species: "eevee", level: 32, moves: ["afteryou"], at: [-2, 0, 0] });
    var ally = stage.pokemon({ species: "pikachu", level: 30, moves: ["tackle"], at: [0, 0, 0] });
    var foeAlly = stage.pokemon({ species: "rattata", level: 18, moves: [], at: [8, 0, 0] });
    var foeCaster = stage.pokemon({ species: "rattata", level: 18, moves: [], at: [5, 0, 4] });
    stage.team("lead", [caster, ally]);
    stage.hostile(ally, foeAlly);
    stage.hostile(caster, foeCaster);

    stage.until(1200, function () {
        return stage.casts("afteryou", caster) > 0 && stage.hadMobEffect(ally, "world_combat:status/afteryou");
    }, function () {
        stage.expect(stage.casts("afteryou", caster) > 0, "the caster handed the initiative over");
        stage.expect(stage.hadMobEffect(ally, "world_combat:status/afteryou"), "the ally carried the shared afteryou identity");
        stage.expect(stage.attribute(ally, "world_combat:skill_haste") > 0, "the ally's skill haste was raised by the window");
        stage.after(120, function () {
            stage.note("您先请给伙伴挂一段加速窗口（正 skill_haste，冷却按 100/(100+急速) 缩短），自己背上负 skill_haste 的让手；伙伴在窗口内第一次出手会浮出「紧接着行动」。窗口与减速在效果结束时自动收回。加速/减速点数与窗口时长随速度、特攻、等级、亲密度与配置变化。", {
                casterCasts: stage.casts("afteryou", caster), allySkillHaste: Math.round(stage.attribute(ally, "world_combat:skill_haste") * 10) / 10,
                casterSkillHaste: Math.round(stage.attribute(caster, "world_combat:skill_haste") * 10) / 10,
                allyDamage: Math.round(stage.damageTo(ally) * 10) / 10, tick: stage.tick()
            });
            stage.done();
        });
    }, "after you hands the initiative to the ally");
});
