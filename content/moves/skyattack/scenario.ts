/**
 * 神鸟猛击 / skyattack —— 可执行设计说明。
 *
 * 一句话：一只只会神鸟猛击的大比鸟（pidgeot，L45，原生学习者）先原地蓄势一拍，再腾到目标上方笔直坠下砸中它。
 *
 * 场面：一只不动的铁傀儡（厚实靶子）站在 7 格外——在蓄势高度的射程内，逼 AI 先走完接近再起飞；
 *   NoAI 让它留在原地，落点固定在起跳那一刻，坠落判定不会因走位失效；地面铺平、白天晴天。
 *
 * 必然事实：本招被提交过（`stage.casts`）；目标受到过坠落伤害（`stage.damageTo`）。
 * 畏缩是 30% 掷签、暴击是随机的，写进 note 供读轨迹判断。
 */
Smoke.scenario("skyattack", function (stage) {
    stage.fill([-11, -1, -9], [11, -1, 9], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "pidgeot", level: 45, moves: ["skyattack"], at: [-3, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [4, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..12,limit=1] {NoAI:1b}");
    stage.until(2400, function () {
        return stage.casts("skyattack", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(60, function () {
            stage.expect(stage.casts("skyattack", caster) >= 1, "the caster committed sky attack");
            stage.expect(stage.damageTo(foe) > 0, "sky attack dealt plunge damage to the foe");
            stage.note("the 30%% flinch roll, crits, and whether the fixed drop point still covered the foe are random/positional", {
                casts: stage.casts("skyattack", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                foeFlinched: stage.hadMobEffect(foe, "world_combat:status/flinch"),
                casterTravelled: Math.round(stage.travelled(caster) * 10) / 10,
                foeAlive: foe.alive(),
                tick: stage.tick()
            });
            stage.done();
        });
    }, "sky attack plunges onto a foe within 120 s");
});
