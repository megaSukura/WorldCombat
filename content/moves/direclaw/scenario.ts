/**
 * 克命爪 / direclaw —— 可执行设计说明。
 *
 * 一句话：一记深爪在目标身上犁开三道爪痕，命中后从中毒／麻痹／睡眠里挑一种按进伤口。
 *
 * 场面：一只会克命爪的大狃拉（L40）对一只昏睡的小海狮（L30），相隔 3 格——在爪距附近，AI 会先贴近再出爪。
 *   昏睡让目标不躲不走，能看清三道爪痕与余毒。地面铺平、白天晴天。
 *
 * 必然事实：本招被提交过；目标受到过爪伤。
 * 随机量写进 note：50%% 的余毒掷（以及随机挑中的是哪一种）、暴击（本招 critChance 掷取）都是随机的；
 *   小海狮是水／超能，对三种余毒都不免疫。
 */
Smoke.scenario("direclaw", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "sneasler", level: 40, moves: ["direclaw"], at: [-2, 0, 0] });
    var foe = stage.pokemon({ species: "slowpoke", level: 30, moves: ["tackle"], status: "sleep", at: [1, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1400, function () {
        return stage.casts("direclaw", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(80, function () {
            stage.expect(stage.casts("direclaw", caster) >= 1, "the caster committed direclaw");
            stage.expect(stage.damageTo(foe) > 0, "the claw raked the foe");
            stage.note("the 50% ailment roll, which of the three it picks, and the move's own crit roll are random; slowpoke is not immune to any of them", {
                casts: stage.casts("direclaw", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                poisoned: stage.hadMobEffect(foe, "world_combat:status/poison"),
                paralysed: stage.hadMobEffect(foe, "world_combat:status/paralysis"),
                asleep: stage.hadMobEffect(foe, "world_combat:status/sleep"),
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "direclaw rakes the foe within 70 s");
});
