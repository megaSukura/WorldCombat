/**
 * 王牌的可执行设计说明。
 *
 * 场面：一只只会王牌的远程特攻手（凯西，30 级）面对 8 格外的一只僵尸；设为夜晚，避免僵尸被日光灼烧，
 * 伤害只可能来自掷出的牌。两者开战，AI 只有这一招可用，会在射程内直接掷牌。
 * 必然事实：本招被提交过；目标受到过伤害（牌在它身上炸开）。
 * 牌是否命中、暴击与否、每一掷的具体威力随余牌变化，写进 note 供读轨迹判断。
 */
Smoke.scenario("trumpcard", function (stage) {
    stage.time("night");
    var caster = stage.pokemon({ species: "Abra", level: 30, moves: ["trumpcard"], at: [0, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [8, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("trumpcard") > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(30, function () {
            stage.expect(stage.casts("trumpcard") > 0, "trumpcard was committed");
            stage.expect(stage.damageTo(foe) > 0, "the thrown card hit the target");
            stage.note("trumpcard observations", { casts: stage.casts("trumpcard"), onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
                casterHealth: Math.round(caster.health() * 10) / 10, moved: Math.round(stage.travelled(caster) * 10) / 10,
                foeMoved: Math.round(stage.travelled(foe) * 10) / 10 });
            stage.done();
        });
    }, "trumpcard lands");
});
