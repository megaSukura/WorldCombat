/**
 * 换档的可执行设计说明。
 *
 * 场面：一只只会换档的齿轮组与一只被冻结的僵尸相隔 9 格；先用默认的超速档换一次，再改成扭力档，
 *   让 AI 在窗口仍在时换到另一档（设置推迟到实体可观察之后）。
 * 必然事实：本招被提交过；挡位载体真实存在；换到另一档后总量没有叠加（替换），且攻速份额确实重新分配；
 *   停手后窗口到期，攻速回到 0，没有留下永久小加成。
 * 攻速等级读的是原生能力阶梯，写进 note 供读轨迹判断。
 */
Smoke.scenario("shiftgear", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Klang", level: 40, moves: ["shiftgear"], at: [0, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [9, 0, 0] });
    stage.hostile(caster, foe);
    stage.noai(foe);
    stage.until(900, function () {
        return stage.casts("shiftgear", caster) > 0 && stage.hasMobEffect(caster, "world_combat:shiftgear_gear");
    }, function () {
        stage.expect(stage.casts("shiftgear", caster) > 0, "shiftgear was committed");
        stage.expect(stage.hasMobEffect(caster, "world_combat:shiftgear_gear"), "the gear window carried its own carrier");
        var first = stage.stages(caster);
        stage.expect((first.atk || 0) + (first.spe || 0) <= 4, "the first gear stayed within the shared budget");
        stage.prefer(caster, "shiftgear", { gear: 0 });
        var before = stage.casts("shiftgear", caster);
        stage.until(600, function () {
            return stage.casts("shiftgear", caster) > before;
        }, function () {
            var second = stage.stages(caster);
            stage.expect((second.atk || 0) + (second.spe || 0) <= 4, "switching gears replaced instead of stacking");
            stage.expect((second.atk || 0) > (first.atk || 0) && (second.spe || 0) < (first.spe || 0), "the torque gear moved the gain from Speed to Attack");
            stage.setPp(caster, "shiftgear", 0);
            stage.until(700, function () {
                return !stage.hasMobEffect(caster, "world_combat:shiftgear_gear");
            }, function () {
                var after = stage.stages(caster);
                stage.expect(Object.keys(after).every(function (stat) { return after[stat] === 0; }), "the gear window expired and left no permanent gain");
                stage.note("换档两档互斥：默认超速档换到扭力档后攻速份额重新分配、总量不变；窗口到期只收回本招贡献。", {
                    casts: stage.casts("shiftgear", caster),
                    first: first,
                    second: second,
                    after: after
                });
                stage.done();
            }, "shiftgear window expires");
        }, "shiftgear switches gear");
    }, "shiftgear engages");
});
