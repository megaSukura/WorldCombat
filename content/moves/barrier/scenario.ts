/**
 * 屏障 的可执行设计说明。
 *
 * 场面：一只只会「屏障」的青铜钟（Psychic／Steel，36 级）与一只僵尸隔开 8 格、石质场地上开战。技能表里只有这一招。
 * 必然事实：本招被提交过；施术者身上出现过共享身份 world_combat:status/barrier 的屏障窗口；
 *   世界里真的多了硬光板——`changedBlocks()` 里出现 minecraft:light_blue_stained_glass（墙是租借的真实方块）。
 * 墙宽几格、立了几列、防御抬了几级写进 note。
 */
Smoke.scenario("barrier", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.fill([-8, 0, -8], [8, 3, 8], "minecraft:air");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "bronzong", level: 36, moves: ["barrier"], at: [0, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [8, 0, 0] });
    stage.hostile(caster, foe);
    function wallCells(): number {
        return stage.changedBlocks().filter(function (block) { return block.after === "minecraft:light_blue_stained_glass"; }).length;
    }
    stage.until(1200, function () {
        return stage.casts("barrier", caster) > 0
            && stage.hadMobEffect(caster, "world_combat:status/barrier")
            && wallCells() > 0;
    }, function () {
        stage.expect(stage.casts("barrier", caster) > 0, "barrier was committed");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/barrier"), "the ward window carried the shared identity");
        stage.expect(wallCells() > 0, "the barrier put real hard-light blocks into the world");
        stage.after(60, function () {
            stage.note("barrier raised a real wall; the width, height and Defense stages are mechanics, the block count is the visible wall", {
                casts: stage.casts("barrier", caster),
                wallColumns: wallCells(),
                damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                alive: caster.alive()
            });
            stage.done();
        });
    }, "barrier engages");
});
