/**
 * 近身战 / closecombat 的可执行设计说明。
 *
 * 场面：只会近身战的 Machamp 36 级，对一只被点住、不会还手的铁傀儡（耐打又不会跑掉的靶子），贴到 1.2 格。
 *   AI 只有这一招可用。
 * 必然事实：本招被提交过、目标受过伤害；提交那一刻自身防御与特防各降一级（弃守立刻支付）。
 * 连打次数、每下伤害、扫到几人，都写进 note 供读轨迹判断。
 */
Smoke.scenario("closecombat", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:grass_block");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "machamp", level: 36, moves: ["closecombat"], at: [-0.6, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [0.6, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..8,limit=1] {NoAI:1b}");
    stage.until(900, function () {
        return stage.casts("closecombat", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(30, function () {
            var dropped = stage.stages(caster);
            stage.expect(stage.casts("closecombat", caster) > 0, "closecombat was committed");
            stage.expect(stage.damageTo(foe) > 0, "the barrage dealt damage to the foe");
            stage.expect((dropped.def || 0) <= -1, "commit spent the guard (own Defense down)");
            stage.expect((dropped.spd || 0) <= -1, "commit spent the guard (own Sp. Def down)");
            stage.note("closecombat observations", {
                casts: stage.casts("closecombat", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                moved: Math.round(stage.travelled(caster) * 10) / 10,
                ownHurt: Math.round(stage.damageTo(caster) * 10) / 10,
                def: dropped.def || 0,
                spd: dropped.spd || 0
            });
            stage.done();
        });
    }, "closecombat commits and its barrage lands within 45 s");
});
