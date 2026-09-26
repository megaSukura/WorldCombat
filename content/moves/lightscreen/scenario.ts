// 光墙的可执行设计说明：柔光竖幕立在施法与来击之间，只有真正从幕外穿过幕面的特殊来袭才被削。
// 必然事实：真实施放会立出幕并给施法者挂共享身份；把幕放在已知位置后，同侧特殊不被削、穿实际矩形的特殊被削、
//   物理攻击不被削、幕到期后归属清理（载体随场地消失）。
Smoke.scenario("lightscreen", function (stage) {
    var caster = stage.pokemon({ species: "ralts", level: 32, moves: ["lightscreen"], at: [-10, 0, 0] });
    var foe = stage.pokemon({ species: "magikarp", level: 20, moves: ["tackle"], at: [-4, 0, 0] });
    var ally = stage.mob({ type: "minecraft:iron_golem", at: [6, 0, 0] });
    var guard = stage.mob({ type: "minecraft:husk", at: [-2, 0, 6] });
    var east = stage.mob({ type: "minecraft:zombie", at: [14, 0, 0] });
    var west = stage.mob({ type: "minecraft:zombie", at: [2, 0, 0] });
    var far = stage.mob({ type: "minecraft:zombie", at: [14, 0, 12] });
    stage.noai(ally, guard, east, west, far, foe);
    stage.team("screen", [caster, ally, guard]);
    stage.hostile(caster, foe);

    stage.until(900, function () {
        return stage.casts("lightscreen", caster) > 0 && stage.hadMobEffect(caster, "world_combat:status/lightscreen");
    }, function () {
        stage.expect(stage.casts("lightscreen", caster) > 0, "lightscreen was cast");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/lightscreen"), "the real cast marked the caster with the shared identity");
        stage.setPp(caster, "lightscreen", 0);
        stage.noai(caster);

        // Deterministic field on the test line, owned by a separate ally so the cast screen's expiry cannot clear it:
        // bottom-centre (10,0,0), normal +x, half-width 4, height 4, cut 0.5.
        stage.field("world_combat:lightscreen_mark", [10, 0, 0], 400, 4,
            { normal: [1, 0, 0], width: 4, height: 4, created: 0, cut: 0.5, damp: 0.5, motes: 24, thick: 0 }, guard);
        // Short-lived field on a separate owner (ally) to observe lifecycle cleanup of the shared identity.
        stage.field("world_combat:lightscreen_mark", [0, 0, 10], 100, 3,
            { normal: [1, 0, 0], width: 3, height: 3, created: 0, cut: 0.4, damp: 0.4, motes: 16, thick: 0 }, ally);

        stage.after(4, function () {
            var beforeCross = stage.damageTo(ally);
            stage.hurt(ally, 20, "minecraft:generic", { source: east, metadata: { category: "special", calculation: true, sureHit: true } });
            stage.after(14, function () {
                var crossed = stage.damageTo(ally) - beforeCross;
                var beforeSame = stage.damageTo(ally);
                stage.hurt(ally, 20, "minecraft:generic", { source: west, metadata: { category: "special", calculation: true, sureHit: true } });
                stage.after(14, function () {
                    var sameSide = stage.damageTo(ally) - beforeSame;
                    var beforePhysical = stage.damageTo(ally);
                    stage.hurt(ally, 20, "minecraft:generic", { source: east, metadata: { category: "physical", calculation: true, sureHit: true } });
                    stage.after(14, function () {
                        var physical = stage.damageTo(ally) - beforePhysical;
                        var beforeOutside = stage.damageTo(ally);
                        stage.hurt(ally, 20, "minecraft:generic", { source: far, metadata: { category: "special", calculation: true, sureHit: true } });
                        stage.after(14, function () {
                            var outside = stage.damageTo(ally) - beforeOutside;
                            stage.expect(crossed > 0 && crossed < sameSide, "a special attack crossing the wall is reduced");
                            stage.expect(sameSide > crossed, "a same-side special attack is not reduced");
                            stage.expect(physical > crossed, "physical damage is not reduced");
                            stage.expect(outside > crossed, "a crossing point outside the screen width is not reduced");
                            stage.expect(stage.hadMobEffect(ally, "world_combat:status/lightscreen"), "the short-lived field marked its owner with the shared identity");
                            stage.until(300, function () {
                                return !stage.hasMobEffect(ally, "world_combat:status/lightscreen");
                            }, function () {
                                stage.expect(!stage.hasMobEffect(ally, "world_combat:status/lightscreen"), "the field's identity is released with its lifetime");
                                stage.note("Real cast then a deterministic field: same-side/outside-width/physical land full, crossing special is cut. Exact amounts vary with native hurt; the protected numbers come from the screen's geometry.", {
                                    casts: stage.casts("lightscreen", caster), crossed: crossed, sameSide: sameSide, physical: physical, outsideWidth: outside
                                });
                                stage.done();
                            }, "lightscreen field identity is released");
                        });
                    });
                });
            });
        });
    }, "lightscreen field is up");
});
