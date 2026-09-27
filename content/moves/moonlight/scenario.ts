/**
 * 月光 / Moonlight —— 可执行设计说明。
 *
 * 一句话：月色是环境条件而非血线条件——白天/夜里晴空、是否受伤、是否着火会组合出不同结果。AI 先看有没有火：
 *   身上带灼伤时即使满血也会排进恢复计划（且不受天色与缺血阈值限制）；没有灼伤才看 ai.healBelow（默认 0.7）与月色。
 *
 * 场面：晴天白天、开阔平地、附近没有敌人。只会月光的两只皮皮（clefairy，会学这招；技能表只给这一招）同队：
 *   第一只先补满生命、再挂共享灼伤（world_combat:burn，带 world_combat:status/burn 身份），验证「白天满血烧伤可用」；
 *   第二只先保持满血不动，等第一只熄火后切到夜晚、把它压到约一半生命，验证晴夜强档由月色而非灼伤触发。
 *
 * 必然事实：第一只在生命仍高于阈值、且是白天时提交月光并熄掉灼伤；第二只在晴夜、缺血阈值之下、且不带灼伤时提交
 *   月光，生命回到压血前之上。execute 里治疗与解烧各自记录实际成功；本场景不引入治疗封锁，那条留给人工试玩。
 */
Smoke.scenario("moonlight", function (stage) {
    stage.weather("clear");
    stage.time("day");

    var burned = stage.pokemon({ species: "clefairy", level: 30, moves: ["moonlight"], at: [-3, 0, 0] });
    var night = stage.pokemon({ species: "clefairy", level: 30, moves: ["moonlight"], at: [3, 0, 0] });
    stage.team("moonlight-check", [burned, night]);

    var maxHealth = stage.attribute(burned, "minecraft:generic.max_health");
    var burnedAt = 0, burnedSeen = false, nightFloor = 0;

    // 先补满两只，再给第一只挂上共享灼伤身份；第一只出手只因灼伤而非缺血，而且发生在白天。
    stage.after(5, function () {
        var burnedAt0 = burned.position();
        stage.command("execute positioned " + burnedAt0[0] + " " + burnedAt0[1] + " " + burnedAt0[2]
            + " run effect give @e[type=cobblemon:pokemon,distance=..3,limit=2,sort=nearest] minecraft:instant_health 1 10 true");
        stage.after(5, function () {
            var at = burned.position();
            stage.command("execute positioned " + at[0] + " " + at[1] + " " + at[2]
                + " run effect give @e[type=cobblemon:pokemon,distance=..2,limit=1,sort=nearest] world_combat:burn 600 0");
        });
    });

    stage.until(800, function () {
        var maximum = stage.attribute(burned, "minecraft:generic.max_health");
        if (maximum > maxHealth) maxHealth = maximum;
        return stage.casts("moonlight", burned) >= 1 && stage.hadMobEffect(burned, "world_combat:status/burn");
    }, function () {
        if (!burnedSeen) { burnedAt = burned.health(); burnedSeen = true; }
        stage.expect(stage.casts("moonlight", burned) >= 1, "the burned clefairy received the moonlight in daylight");
        stage.expect(maxHealth > 0 && burnedAt >= maxHealth * 0.7, "the cast happened above the heal threshold, so the burn drove it, not the wound");
        stage.after(30, function () {
            stage.expect(!stage.hasMobEffect(burned, "world_combat:status/burn"), "the burn identity was cured by the moonlight");
            // 第二幕：切到夜晚、把第二只压到阈值以下；它不带灼伤，只有晴夜强档能让它出手。
            stage.time("night");
            var attempts = 0;
            function woundNight() {
                if (!night.alive() || stage.casts("moonlight", night) >= 1) return;
                if (night.health() <= maxHealth * 0.65 || attempts >= 8) return;
                attempts++;
                var at = night.position();
                stage.command("execute positioned " + at[0] + " " + at[1] + " " + at[2]
                    + " run damage @e[type=cobblemon:pokemon,distance=..3,limit=1,sort=nearest] " + Math.max(1, Math.round(maxHealth * 0.5)) + " minecraft:generic");
                stage.after(12, woundNight);
            }
            woundNight();
            stage.until(900, function () {
                var health = night.health();
                if (nightFloor <= 0 || health < nightFloor) nightFloor = health;
                return stage.casts("moonlight", night) >= 1;
            }, function () {
                stage.expect(stage.casts("moonlight", night) >= 1, "the wounded clefairy cast under a clear night");
                stage.expect(!stage.hadMobEffect(night, "world_combat:status/burn"), "the clear-night cast was driven by the sky, not a burn");
                stage.after(30, function () {
                    stage.expect(night.health() > nightFloor + 5, "the clear-night moonlight restored health above the wound floor");
                    stage.note("月色可及由执行、AI 与说明共用的 moonlightSkyAt 判定：夜晚 × 可见天空 × 无雨为 1，回复约最大生命的 2/3；"
                        + "白天或阴雨为 0，只回约 1/4。AI 先看共享身份 burn：满血带火也会施放并熄火，不再被缺血阈值或天色挡住；"
                        + "晴夜强档是驻足承月，所以月色可及时还要有安全落脚点（视野内没有贴身活敌人、也没被攻击），危急时例外。"
                        + "解烧与治疗分别记录，治疗被封锁时仍会单独清烧；共享天气/雨/遮顶/昼夜切换与这点留给人工试玩核对。", {
                        burnedCasts: stage.casts("moonlight", burned),
                        nightCasts: stage.casts("moonlight", night),
                        maxHealth: Math.round(maxHealth * 10) / 10,
                        burnedHealthAtCast: Math.round(burnedAt * 10) / 10,
                        burnedHealthNow: Math.round(burned.health() * 10) / 10,
                        burnedEver: stage.hadMobEffect(burned, "world_combat:status/burn"),
                        burnedNow: stage.hasMobEffect(burned, "world_combat:status/burn"),
                        nightFloor: Math.round(nightFloor * 10) / 10,
                        nightHealthNow: Math.round(night.health() * 10) / 10,
                        nightEverBurned: stage.hadMobEffect(night, "world_combat:status/burn"),
                        burnedAlive: burned.alive(), nightAlive: night.alive(),
                        tick: stage.tick()
                    });
                    stage.done();
                });
            }, "the night moonlight cast within 40 s");
        });
    }, "moonlight is cast by a burned companion within 40 s");
});
