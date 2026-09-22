/**
 * 增强拳 / poweruppunch 的可执行设计说明。
 *
 * 场面：只会增强拳的腕力（Machop，30 级，格斗系真实学习者）贴着一只只会跃起、厚血的卡比兽（Snorlax，30 级），
 * 晴天平地。必然事实：本招被提交过（`stage.casts`）；直拳命中并造成伤害（拳程内贴脸，命中几乎必然）；
 * 命中带来硬化——只要伤害 > 0，「拳已变硬」（`world_combat:status/hardened`）就必定被加上过。
 * 硬化到几级、窗口多久、蓄劲配置的实际差异写进 note 供读轨迹判断。
 */
Smoke.scenario("poweruppunch", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "machop", level: 30, moves: ["poweruppunch"], at: [-1, 0, 0] });
    var foe = stage.pokemon({ species: "snorlax", level: 30, moves: ["splash"], at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("poweruppunch", caster) > 0 && stage.damageTo(foe) > 0
            && stage.hadMobEffect(caster, "world_combat:status/hardened");
    }, function () {
        stage.expect(stage.casts("poweruppunch", caster) > 0, "power-up punch was committed");
        stage.expect(stage.damageTo(foe) > 0, "the straight punch dealt damage");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/hardened"), "a landed punch hardened the user's fist");
        stage.note("每记命中硬化 1 级（蓄劲 2 级），窗口内每次命中续期；物攻等级抬高后下一记直拳经共享结算更重。等级与窗口时长是设计事实，由完整装配的人工试玩核对。", {
            casts: stage.casts("poweruppunch", caster),
            onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            hardened: stage.hadMobEffect(caster, "world_combat:status/hardened"),
            foeAlive: foe.alive()
        });
        stage.done();
    }, "power-up punch lands on a foe at point-blank range");
});
