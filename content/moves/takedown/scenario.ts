/**
 * 猛撞 / takedown 的可执行设计说明。
 *
 * 场面：会猛撞的肯泰罗（Tauros）对一只只会跃起、不会还手的鲤鱼王（Magikarp），双方隔开一段开战。
 * 必然事实：本招被提交过；它命中过靶子（`damageTo(foe) > 0`），且施法者自己掉过血（`damageTo(caster) > 0`）——
 * 靶子不还手，施法者的掉血只可能来自这一招的反作用力。命中 85 的即时判定意味着可能先冲空几次，
 * 冲空不掉血，所以用轮询等到至少命中一次；命中的具体比例写进 note 供读轨迹判断。
 */
Smoke.scenario("takedown", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Tauros", level: 45, moves: ["takedown"], at: [-2.5, 0, 0] });
    // 靶子只带跃起、不会还手：施法者掉血只可能来自本招的反作用力，断言不会误判。
    var foe = stage.pokemon({ species: "Magikarp", level: 20, moves: ["splash"], at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("takedown", caster) > 0 && stage.damageTo(caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("takedown", caster) > 0, "takedown was committed");
        stage.expect(stage.damageTo(foe) > 0, "the charge landed on the target");
        stage.expect(stage.damageTo(caster) > 0, "the user hurt itself with the recoil of a landed charge");
        stage.note("native 命中 85 在本作落成即时判定：允许先冲空几次；只有命中才按 recoil 比例反伤", {
            casts: stage.casts("takedown", caster),
            onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            selfDamage: Math.round(stage.damageTo(caster) * 10) / 10,
            casterHp: caster.health(),
            foeAlive: foe.alive()
        });
        stage.done();
    }, "takedown lands and the user pays the recoil");
});
