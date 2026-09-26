/**
 * 月光 / Moonlight —— 可执行设计说明。
 *
 * 一句话：夜里晴空（或任何天色）下把月色披到身上，接住时回一大口并冷却掉灼伤；AI 先看有没有火——身上带灼伤时
 *   即使满血也会排进恢复计划，没有灼伤才看 ai.healBelow（默认 0.7）与月色。所以场面要让施术者满血带火。
 *
 * 场面：夜晚、晴天、开阔平地。只会月光的皮皮（clefairy，会学这招；技能表只给这一招）站在一侧；附近没有敌人。
 *   开局先补满生命，再用共享灼伤效果挂上火（world_combat:burn，带 world_combat:status/burn 身份）。这样施术者
 *   处于缺血阈值之上，唯一让它出手的理由就是灼伤。
 *
 * 必然事实：施术者提交过月光；提交时生命仍在缺血阈值（默认 0.7）之上，证明是灼伤优先级触发；execute 里无条件
 *   调用 CombatStatus.cure(world, self, "burn")，因此结算后身上的 world_combat:status/burn 必定消失。
 */
Smoke.scenario("moonlight", function (stage) {
    stage.weather("clear");
    stage.time("night");

    var caster = stage.pokemon({ species: "clefairy", level: 30, moves: ["moonlight"], at: [-3, 0, 0] });
    var maxHealth = stage.attribute(caster, "minecraft:generic.max_health");
    var healthThen = 0, healthAtCast = 0;
    var seen = false;

    // 先补满，再挂上共享灼伤身份；两者都做，确保出手只因灼伤而非缺血。
    stage.after(5, function () {
        var at = caster.position();
        stage.command("execute positioned " + at[0] + " " + at[1] + " " + at[2]
            + " run effect give @e[type=cobblemon:pokemon,distance=..2,limit=1,sort=nearest] minecraft:instant_health 1 10 true");
        stage.after(5, function () {
            healthThen = caster.health();
            stage.command("execute positioned " + at[0] + " " + at[1] + " " + at[2]
                + " run effect give @e[type=cobblemon:pokemon,distance=..2,limit=1,sort=nearest] world_combat:burn 600 0");
        });
    });

    stage.until(800, function () {
        if (stage.casts("moonlight", caster) < 1 || !stage.hadMobEffect(caster, "world_combat:status/burn")) return false;
        if (!seen) { healthAtCast = caster.health(); seen = true; }
        return true;
    }, function () {
        stage.expect(stage.casts("moonlight", caster) >= 1, "the burned clefairy received the moonlight even above the heal threshold");
        stage.expect(maxHealth > 0 && healthAtCast >= maxHealth * 0.7, "the cast happened while the caster was still above the heal threshold, so the burn drove it");
        stage.after(10, function () {
            stage.expect(!stage.hasMobEffect(caster, "world_combat:status/burn"), "the burn identity was cured by the moonlight");
            stage.note("月色可及由执行、AI 与说明共用的 moonlightSkyAt 判定：夜晚 × 可见天空 × 无雨为 1，回复约最大生命的 2/3；白天或阴雨为 0，只回约 1/4。AI 先看共享身份 burn：满血带火也会施放并熄火，不再被缺血阈值挡住；解烧与治疗分别记录，禁疗时只清烧不播大回血。本场景先补满再点火，提交时生命仍在阈值之上。", {
                casterCasts: stage.casts("moonlight", caster),
                maxHealth: Math.round(maxHealth * 10) / 10,
                healthThen: Math.round(healthThen * 10) / 10,
                healthAtCast: Math.round(healthAtCast * 10) / 10,
                burnedEver: stage.hadMobEffect(caster, "world_combat:status/burn"),
                burnedNow: stage.hasMobEffect(caster, "world_combat:status/burn"),
                healthNow: Math.round(caster.health() * 10) / 10,
                casterAlive: caster.alive(),
                tick: stage.tick()
            });
            stage.done();
        });
    }, "moonlight is cast by a burned companion within 40 s");
});
