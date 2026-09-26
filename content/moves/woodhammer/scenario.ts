/**
 * 木槌 / woodhammer 的可执行设计说明。
 *
 * 场面：会木槌的土台龟（Torterra）对 3 格外一只只会跃起、不会还手的卡比兽（Snorlax），地面铺成石头。
 * 选厚血、不还手的靶子：目标挨过一砸仍活着，施法者的掉血也只可能来自这一招的反震。
 * 必然事实：本招被提交过；目标受到过伤害（砸实）；施法者自己也受到过伤害（反震）。
 * 落点的地裂只是画面碎屑，不再改动方块；因此这里不断言方块变化。
 * 砸中还是砸空、压了几级速度、暴击，写进 note 供读轨迹判断。
 */
Smoke.scenario("woodhammer", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Torterra", level: 40, moves: ["woodhammer"], at: [-1.5, 0, 0] });
    // 靶子只带跃起、不会还手：施法者的掉血只可能来自这一招的反震。
    var foe = stage.pokemon({ species: "Snorlax", level: 36, moves: ["splash"], at: [1.5, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("woodhammer", caster) > 0 && stage.damageTo(foe) > 0 && stage.damageTo(caster) > 0;
    }, function () {
        stage.after(20, function () {
            stage.expect(stage.casts("woodhammer", caster) > 0, "woodhammer was committed");
            stage.expect(stage.damageTo(foe) > 0, "the slam dealt damage to the target");
            stage.expect(stage.damageTo(caster) > 0, "the user paid recoil for the hit");
            stage.note("木槌落地沿接触面扬起短暂的地裂碎屑（只做画面、不改动方块）；命中把目标速度压下 stagger 级。砸中还是砸空、碎屑数量与速度等级取决于站位与设计值", {
                casts: stage.casts("woodhammer", caster),
                onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
                selfDamage: Math.round(stage.damageTo(caster) * 10) / 10,
                casterHp: caster.health(),
                foeAlive: foe.alive(),
                moved: Math.round(stage.travelled(caster) * 10) / 10
            });
            stage.done();
        });
    }, "woodhammer lands and the user pays recoil");
});
