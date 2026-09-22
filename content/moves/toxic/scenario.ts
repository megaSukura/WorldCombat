/**
 * 剧毒的可执行设计说明。
 *
 * 场面：一只只会剧毒的耿鬼对 4 格外的卡比兽吐毒，卡比兽没有招式、站着挨打。距离在射程内，AI 会直接出手。
 * 必然事实：本招被提交过；目标身上出现过共享毒性（`world_combat:status/poison` 身份与 `minecraft:poison` 效果）；
 * 毒素在之后累计咬掉了明显多于一次跳伤的伤害——这只有加深（更高 amplifier 让毒跳得更密）或终幕爆发才做得到。
 * 随机结果：命中率 90、加深节奏、爆发时机与卡比兽是否走开，都写进 note 供读轨迹判断。
 */
Smoke.scenario("toxic", function (stage) {
    var caster = stage.pokemon({ species: "Gengar", level: 40, moves: ["toxic"], at: [-2, 0, 0] });
    var target = stage.pokemon({ species: "Snorlax", level: 25, moves: [], at: [2, 0, 0] });
    stage.hostile(caster, target);
    stage.until(900, function () {
        return stage.casts("toxic") > 0 && stage.hadMobEffect(target, "world_combat:status/poison");
    }, function () {
        stage.expect(stage.casts("toxic") > 0, "toxic was committed");
        stage.expect(stage.hadMobEffect(target, "world_combat:status/poison"), "the shared poison identity landed on the target");
        stage.expect(stage.hadMobEffect(target, "minecraft:poison"), "the shared default poison effect landed on the target");
        stage.note("venom rooted", { casts: stage.casts("toxic"), health: target.health() });
        stage.until(900, function () { return stage.damageTo(target) >= 20 || !target.alive(); }, function () {
            stage.expect(stage.damageTo(target) >= 20, "the venom's escalating damage accumulated well beyond one tick");
            stage.note("venom matured", { damageToTarget: Math.round(stage.damageTo(target) * 10) / 10,
                health: target.health(), alive: target.alive() });
            stage.done();
        }, "venom deepens and erupts");
    }, "toxic applied");
});
