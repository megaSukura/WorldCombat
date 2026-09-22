/**
 * 直冲钻 / drillrun —— 可执行设计说明。
 *
 * 一句话：旋转身体贴地钻穿挡路的对手，钻过之后地上留下一条犁沟。
 *
 * 场面：一只只会直冲钻的龙头地鼠（48 级）对一只被点住、不会还手的铁傀儡，脚下铺满石头（可犁的自然地表）。
 * 断言只取必然事实：这招被提交过、目标受过伤害、施法者确实位移过（这是一记冲刺）、
 * 钻过之后地表留下了粗土犁沟。暴击是否出现、一次贯穿几个目标随走位与掷骰变化，写进 note。
 */
Smoke.scenario("drillrun", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "excadrill", level: 48, moves: ["drillrun"], at: [-3, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..8,limit=1] {NoAI:1b}");
    stage.until(600, function () {
        return stage.casts("drillrun", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        // 犁沟走 world.terrain 租约落地；给它几刻把粗土铺下去再读。
        stage.after(8, function () {
            var furrow = stage.changedBlocks().filter(function (cell) { return cell.after === "minecraft:coarse_dirt"; });
            stage.expect(stage.casts("drillrun", caster) >= 1, "caster committed drill run");
            stage.expect(stage.damageTo(foe) > 0, "drill run dealt damage to the foe");
            stage.expect(stage.travelled(caster) > 1, "the drill carried the caster forward");
            stage.expect(furrow.length > 0, "the drill plowed a coarse-dirt furrow into the ground");
            stage.note("critical hits come from the native critRatio 2 roll; the furrow is leased terrain that fades back after its own lifetime, and the golem is a NoAI stone target, so the plowed surface is the plain stone floor", {
                casts: stage.casts("drillrun", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                travelled: Math.round(stage.travelled(caster) * 10) / 10,
                furrowCells: furrow.length,
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "drill run lands within 30 s");
});
