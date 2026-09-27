/**
 * 自我暗示的可执行设计说明。
 *
 * 场面：一只只会自我暗示的凯西（特攻高、能读得远）对 3 格外的腕力。角色绑定后，把施法者自己的攻击等级压到 -2，
 *   而腕力保持在中性台阶；按本轮落实的规则，读一个中性目标也应把自己更低的负面等级对齐回 0。
 * 必然事实：本招被提交过；施法者身上出现过“已同调”标记；施法者的攻击等级被清回 0。
 * 说明：每 15 刻重申一次敌对，抵消目标脱战；等级写入走原生等级（NativeEffects.boost），不是 MobEffect。
 */
Smoke.scenario("psychup", function (stage) {
    var caster = stage.pokemon({ species: "Abra", level: 42, moves: ["psychup"], at: [-2, 0, 0] });
    var target = stage.pokemon({ species: "Machop", level: 24, moves: [], at: [1, 0, 0] });
    stage.hostile(caster, target);
    function rehost() { stage.hostile(caster, target); stage.after(15, rehost); }
    stage.after(15, rehost);
    stage.after(3, function () {
        // A neutral target must still clear the caster's own lower negative stages (the readiness rule this design adds).
        stage.boost(caster, { atk: -2 });
        stage.expect(stage.stages(caster).atk === -2, "the caster's ladder starts below neutral");
        stage.note("staged: abra(42) psychup vs a neutral machop(24); the caster's attack was lowered so a neutral read must clear it");
        stage.until(1200, function () {
            return stage.casts("psychup", caster) >= 1 && (stage.stages(caster).atk || 0) === 0
                && stage.hadMobEffect(caster, "world_combat:psychup_link");
        }, function () {
            stage.expect(stage.casts("psychup", caster) >= 1, "psychup was committed against a neutral target");
            stage.expect((stage.stages(caster).atk || 0) === 0, "copying a neutral target cleared the caster's negative stage");
            stage.expect(stage.hadMobEffect(caster, "world_combat:psychup_link"), "psychup_link marker appeared on the caster");
            stage.note("psychup committed; a neutral target aligned the caster's ladder back to zero", {
                casts: stage.casts("psychup", caster), casterStages: stage.stages(caster)
            });
            stage.done();
        }, "psychup neutral clear");
    });
});
