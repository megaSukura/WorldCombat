/**
 * 催眠粉 / sleeppowder 的可执行设计说明。
 *
 * 场面：晴天白天、开阔石地。只会催眠粉的走路草（oddish）对一只只会「跃起」的卡比兽（snorlax）抛粉；
 *   卡比兽走得很慢、不还手，云又落在它脚下，让「站在云里被一口口喂睡」这件事可复现。
 *
 * 必然事实：催眠粉被提交过；目标身上出现过共享的睡眠身份（world_combat:status/sleep）。
 * 随机结果：命中 75、云落下时目标是否还站在落点、吸了几口才睡下，都写进 note 供读轨迹判断。
 *   它不造成伤害（原生威力 0），掉血来自中毒一类别的效果；草属性会直接穿过粉末。
 */
Smoke.scenario("sleeppowder", function (stage) {
    stage.weather("clear");
    stage.time("day");
    var caster = stage.pokemon({ species: "oddish", level: 38, moves: ["sleeppowder"], at: [-3, 0, 0] });
    var target = stage.pokemon({ species: "snorlax", level: 30, moves: [], at: [1, 0, 0] });
    stage.hostile(caster, target);
    stage.until(1600, function () {
        return stage.casts("sleeppowder", caster) > 0 && stage.hadMobEffect(target, "world_combat:status/sleep");
    }, function () {
        stage.expect(stage.casts("sleeppowder", caster) > 0, "sleep powder was committed");
        stage.expect(stage.hadMobEffect(target, "world_combat:status/sleep"), "the target in the cloud fell asleep");
        stage.note("粉团落在目标脚下摊成一片云，站在云里的非友方每 doseInterval 被喂进一口睡意（先变慢），够 density 口才睡下；走出云外睡意挂着慢慢散。目标是否一直站在云里、吸了几口，见轨迹。", {
            casts: stage.casts("sleeppowder", caster),
            targetHp: Math.round(target.health() * 10) / 10,
            travelled: Math.round(stage.travelled(target) * 10) / 10
        });
        stage.done();
    }, "the cloud puts the target standing in it to sleep");
});
