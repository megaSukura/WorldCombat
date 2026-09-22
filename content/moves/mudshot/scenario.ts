/**
 * 泥巴射击的可执行设计说明。
 *
 * 场面：一只只会泥巴射击的沙地宝可梦（Wooper），对十格外的对手。泥块会平飞过去、命中并在脚下炸开。
 * 必然事实：本招被提交过；对手受到过泥浆伤害；对手身上出现过共享身份 mired（必定掉速的载体）。
 * 掉速级数与泼溅糊到几个人、泥洼是否留下，写进 note 供读轨迹判断。
 */
Smoke.scenario("mudshot", function (stage) {
    const caster = stage.pokemon({ species: "Wooper", level: 32, moves: ["mudshot"], at: [-5, 0, 0] });
    const foe = stage.pokemon({ species: "Machop", level: 22, moves: ["tackle"], at: [5, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(800, function () {
        return stage.casts("mudshot", caster) >= 1 && stage.damageTo(foe) > 0 && stage.hadMobEffect(foe, "world_combat:status/mired");
    }, function () {
        stage.expect(stage.casts("mudshot", caster) >= 1, "mudshot was committed");
        stage.expect(stage.damageTo(foe) > 0, "the target took mudshot damage");
        stage.expect(stage.hadMobEffect(foe, "world_combat:status/mired"), "the target was mired");
        stage.note("mired is a timed identity; the Speed drop is applied as a shared speed stage", {
            casts: stage.casts("mudshot", caster), onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            blocks: stage.changedBlocks().length
        });
        stage.done();
    }, "mudshot cast and hit");
});
