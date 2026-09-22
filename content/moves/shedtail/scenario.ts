/**
 * 断尾的可执行设计说明。
 *
 * 场面：一只只会「断尾」的伙伴面对一只僵尸。伙伴在健康时（默认生命高于 65%）有威胁就会断尾抽身。
 * 必然事实：本招被提交过、施法者身上出现过共享身份 world_combat:status/shed_tail、伙伴离开过原位。
 * 僵尸是否被尾巴重新牵住、尾巴存活多久写进 note 供读轨迹判断。
 */
Smoke.scenario("shedtail", function (stage) {
    var a = stage.pokemon({ species: "Eevee", level: 30, moves: ["shedtail"], at: [-2, 0, 0] });
    var b = stage.mob({ type: "minecraft:zombie", at: [8, 0, 0] });
    stage.hostile(a, b);
    stage.until(600, function () {
        return stage.casts("shedtail") > 0 && stage.hadMobEffect(a, "world_combat:status/shed_tail");
    }, function () {
        stage.expect(stage.casts("shedtail") > 0, "shedtail was committed");
        stage.expect(stage.hadMobEffect(a, "world_combat:status/shed_tail"), "the shed-tail identity landed on the caster");
        stage.after(120, function () {
            stage.expect(stage.travelled(a) > 0.5, "the caster pulled out of position");
            stage.note("shedtail exchange", { casts: stage.casts("shedtail"), movedA: Math.round(stage.travelled(a) * 10) / 10,
                damageOnCaster: stage.damageTo(a), damageOnZombie: stage.damageTo(b) });
            stage.done();
        });
    }, "shedtail is used");
});
