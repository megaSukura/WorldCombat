/**
 * 画龙点睛 / dragonascent 的可执行设计说明。
 *
 * 场面：只会画龙点睛的 Rayquaza 50 级，对一只被点住、不会还手的铁傀儡，相隔 3 格（升空余量够、落点在射程内）。
 *   AI 只有这一招可用。场地是平坦石地，头顶留了 6 格空气，升空够用。
 * 必然事实：本招被提交过、目标受过伤害；落地冲击不再改动地面方块，也不对同一对象重复满额。
 * 升空高度、俯冲过程、命中位置、自身降级（原生能力阶梯，私有装配里没有读取原语），都写进 note 供读轨迹判断。
 */
Smoke.scenario("dragonascent", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:grass_block");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "rayquaza", level: 50, moves: ["dragonascent"], at: [-1.5, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [1.5, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..8,limit=1] {NoAI:1b}");
    stage.until(900, function () {
        return stage.casts("dragonascent", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(30, function () {
            stage.expect(stage.casts("dragonascent", caster) > 0, "dragonascent was committed");
            stage.expect(stage.damageTo(foe) > 0, "the dive dealt damage to the foe");
            stage.note("dragonascent observations", {
                casts: stage.casts("dragonascent", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                moved: Math.round(stage.travelled(caster) * 10) / 10,
                changed: stage.changedBlocks()
            });
            stage.done();
        });
    }, "dragonascent commits and its dive lands within 45 s");
});
