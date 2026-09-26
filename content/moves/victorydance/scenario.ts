/**
 * 胜利之舞 / victorydance 的可执行设计说明。
 *
 * 场面：一只只会「胜利之舞」的洗翠裙儿小姐与一只弱小的小拉达隔开 10 格开战（洗翠形态是这招在已实装物种里
 * 唯一的学习者）。它的技能表里只有这一招，所以 AI 只能先起舞；有威胁且在起舞距离内时，它会先立冠再考虑交战。
 * 局面里预先给施术者一层与招式无关的物攻 +2（`stage.boost`），用来验证三项各自的所有权。
 * 必然事实：本招被提交过；终拍立起共享身份 world_combat:status/victorydance 的冠冕，且三项等级此刻才真的抬高；
 *   一次归属舞者的真实正伤害只把窗口续上、不重复叠加等级；窗口走完时只收回本招贡献的那一级，与招式无关的
 *   那 +2 物攻原样留下。踏步拍数、是否隆重等设计事实写进 note 供读轨迹判断。
 */
Smoke.scenario("victorydance", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "lilligant", level: 32, properties: "aspect=hisuian", moves: ["victorydance"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "rattata", level: 14, moves: ["tackle"], at: [7, 0, 0] });
    stage.hostile(caster, foe);
    // 与招式无关的先行物攻 +2：等个体绑定落地后再写，用于验证「清除只撤本招」与「续冠不重复叠加」。
    stage.after(2, function () { stage.boost(caster, { atk: 2 }); });
    stage.until(1200, function () {
        return stage.casts("victorydance", caster) > 0 && stage.hadMobEffect(caster, "world_combat:status/victorydance");
    }, function () {
        stage.expect(stage.casts("victorydance", caster) > 0, "the victory rite was committed");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/victorydance"), "the crown window carried the shared identity");
        const raised = stage.stages(caster);
        stage.expect((raised.atk || 0) >= 3, "the gift landed on attack while the independent +2 stays");
        stage.expect((raised.def || 0) >= 1 && (raised.spe || 0) >= 1, "the gift landed on defence and speed at the final beat");
        // 真实战果延长：注入一次归属舞者的正伤害，窗口被续上但等级不重复叠加。
        stage.hurt(foe, 5, "minecraft:generic", { source: caster });
        const afterRally = stage.stages(caster);
        stage.expect((afterRally.atk || 0) === (raised.atk || 0) && (afterRally.def || 0) === (raised.def || 0)
            && (afterRally.spe || 0) === (raised.spe || 0), "the rally extension renewed the window without stacking new levels");
        stage.expect(stage.hasMobEffect(caster, "world_combat:status/victorydance"), "the crown survives the real hit that extends it");
        stage.setPp(caster, "victorydance", 0);
        stage.until(1600, function () {
            return !stage.hasMobEffect(caster, "world_combat:status/victorydance");
        }, function () {
            const after = stage.stages(caster);
            stage.expect((after.atk || 0) === 2, "only this rite's own contribution was taken back; the independent gain stays");
            stage.expect((after.def || 0) === 0 && (after.spe || 0) === 0, "defence and speed returned to their pre-rite values");
            stage.note("beat count and grand are design facts read here; the three owned ladder changes and the retraction are asserted above", {
                casts: stage.casts("victorydance", caster),
                damageByCaster: Math.round(stage.damageBy(caster) * 10) / 10,
                damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                foeCasts: stage.casts("tackle", foe),
                casterAlive: caster.alive()
            });
            stage.done();
        }, "the crown fades after its window");
    }, "victory dance is cast and crowned within 60 s");
});
