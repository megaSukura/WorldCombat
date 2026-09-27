/**
 * 断尾的可执行设计说明。
 *
 * 场面：一只只会「断尾」的伙伴面对一只僵尸。伙伴在健康时（默认生命高于 65%）有威胁就会断尾抽身。
 * 必然事实：本招被提交过、施法者身上出现过共享身份 world_combat:status/shed_tail、伙伴离开过原位。
 * 僵尸接受诱导后实际攻击尾巴；玩家队伍换人仍由原生队伍夹具与人工检查覆盖。
 */
Smoke.scenario("shedtail", function (stage) {
    stage.time("night");
    stage.fill([-12, -1, -6], [12, -1, 6], "minecraft:stone");
    var a = stage.pokemon({ species: "Eevee", level: 30, moves: ["shedtail"], at: [-2, 0, 0] });
    var b = stage.mob({ type: "minecraft:zombie", at: [8, 0, 0] });
    var maximum = 0;
    // The native Pokemon HP attributes settle after spawn; sample before enabling the threat.
    stage.after(5, function () { maximum = a.health(); stage.hostile(a, b); });
    stage.until(600, function () {
        return stage.casts("shedtail") > 0 && stage.hadMobEffect(a, "world_combat:status/shed_tail");
    }, function () {
        stage.expect(stage.casts("shedtail") > 0, "shedtail was committed");
        stage.expect(stage.hadMobEffect(a, "world_combat:status/shed_tail"), "the shed-tail identity landed on the caster");
        stage.after(120, function () {
            stage.expect(stage.travelled(a) > 0.5, "the caster pulled out of position");
            const paid = stage.damageEvents("shedtail_cost").filter(hit => hit.from === a.name && hit.to === a.name)
                .reduce((total, hit) => total + hit.amount, 0);
            stage.expect(maximum > 0 && Math.abs(paid - maximum * 0.5) < 0.01, "the half-HP cost was actually paid, not discounted");
            stage.expect(stage.damageEvents("mob").some(hit => hit.from === b.name && hit.to !== a.name && hit.to !== b.name),
                "the native enemy attacked the independent tail body");
            stage.note("shedtail exchange", { casts: stage.casts("shedtail"), movedA: Math.round(stage.travelled(a) * 10) / 10,
                maxHealth: Math.round(maximum * 10) / 10, healthA: Math.round(a.health() * 10) / 10,
                damageOnCaster: stage.damageTo(a), damageOnZombie: stage.damageTo(b),
                lure: "the native enemy hit the only additional body, the shed tail; party switching needs an owned roster and is outside this wild scene" });
            stage.done();
        });
    }, "shedtail is used");
});
