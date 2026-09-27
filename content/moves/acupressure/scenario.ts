/**
 * 点穴的可执行设计说明。
 *
 * 场面：一只腕力先被压低一级攻击（-2，设置推迟到实体可观察之后），与一只老鼠开战，AI 会为自己点穴。
 * 必然事实：本招被提交过；通畅窗口带共享身份；被点中的是最低的那项负等级，快按只补 1 级到 -1；
 *   窗口到期只收回本招份额，物攻回到 -2——原生削弱没有被永久清掉。
 */
Smoke.scenario("acupressure", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "machop", level: 24, moves: ["acupressure"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "rattata", level: 12, moves: ["tackle"], at: [6, 0, 0] });
    stage.hostile(caster, foe);
    stage.after(3, function () { stage.boost(caster, { atk: -2 }); });
    stage.until(1200, function () {
        return stage.casts("acupressure", caster) > 0
            && stage.hadMobEffect(caster, "world_combat:status/acupressure");
    }, function () {
        stage.expect(stage.casts("acupressure", caster) > 0, "acupressure was committed");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/acupressure"), "the flow window carried the shared identity");
        stage.setPp(caster, "acupressure", 0);
        var raised = stage.stages(caster);
        stage.expect((raised.atk || 0) === -1, "the quick press repaired the weakest negative stat by one stage");
        stage.expect(Object.keys(raised).every(function (stat) { return stat === "atk" || raised[stat] === 0; }), "no other stat changed");
        stage.note("点穴优先修复当前最低的负等级：物攻被压到 -2，一次快按补回 1 级到 -1，其他项不变。", { stages: raised });
        stage.until(600, function () {
            return !stage.hasMobEffect(caster, "world_combat:status/acupressure");
        }, function () {
            var after = stage.stages(caster);
            stage.expect((after.atk || 0) === -2, "expiry took back only this press's contribution");
            stage.note("窗口到期只收回本招份额：物攻回到 -2，原生削弱没有被永久清掉。", {
                casts: stage.casts("acupressure", caster),
                stages: after,
                damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                damageByCaster: Math.round(stage.damageBy(caster) * 10) / 10,
                casterAlive: caster.alive()
            });
            stage.done();
        }, "acupressure expires with its stat gain");
    }, "acupressure engages");
});
