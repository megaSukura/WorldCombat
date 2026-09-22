/**
 * 延后的可执行设计说明。
 *
 * 场面：一只只会延后的勾魂眼和一只不会出手的卡比兽被围在同一个石栏里，相隔 5 格——勾魂眼会把压制打进卡比兽身上。
 * 必然事实：本招被提交过；目标身上出现过共享压制身份 `world_combat:status/quash`；命中当下该压制正在生效
 * （不只是曾经出现过）。
 * 随机结果：命中率 100，但走位与掩体可能让某次打空；压制窗口内目标是否恰好尝试了一次出手、被压回去几次，
 * 取决于它的决策时机与随机走位，写进 note 供读轨迹判断。
 */
Smoke.scenario("quash", function (stage) {
    stage.fill([-4, 0, -4], [4, 2, -4], "minecraft:stone");
    stage.fill([-4, 0, 4], [4, 2, 4], "minecraft:stone");
    stage.fill([-4, 0, -4], [-4, 2, 4], "minecraft:stone");
    stage.fill([4, 0, -4], [4, 2, 4], "minecraft:stone");
    var caster = stage.pokemon({ species: "Sableye", level: 35, moves: ["quash"], at: [-3, 0, 0] });
    var target = stage.pokemon({ species: "Snorlax", level: 30, moves: [], at: [2, 0, 0] });
    stage.hostile(caster, target);
    stage.until(1200, function () {
        return stage.casts("quash") > 0 && stage.hadMobEffect(target, "world_combat:status/quash");
    }, function () {
        stage.expect(stage.casts("quash") > 0, "quash was committed");
        stage.expect(stage.hadMobEffect(target, "world_combat:status/quash"), "the quash identity landed on the target");
        stage.expect(stage.hasMobEffect(target, "world_combat:quash"), "the press is active on the target right now");
        stage.note("target pinned", { casts: stage.casts("quash"), casterHealth: caster.health(), targetHealth: target.health() });
        stage.done();
    }, "quash lands");
});
