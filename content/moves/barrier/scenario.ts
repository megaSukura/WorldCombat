/**
 * 屏障 的可执行设计说明。
 *
 * 场面：一只只会「屏障」的青铜钟（Psychic／Steel，36 级）与一只僵尸隔开 8 格、石质场地上开战。技能表里只有这一招。
 * 必然事实：
 *   1) 本招被提交过；施术者身上出现过共享身份 world_combat:status/barrier 的屏障窗口；
 *      世界里真的多了硬光板——`changedBlocks()` 里出现 minecraft:light_blue_stained_glass（墙是租借的真实方块）；
 *      公共能力阶梯上防御真的被抬高了至少一级。
 *   2) 用 /setblock 打掉其中一格：世界里的玻璃格数随之减少且仍有剩余，防御窗口与防御等级保持不变
 *      （证明墙由真实 remaining 格驱动、局部破坏不会误收防御）。
 *   3) 把施法者 /tp 到 40 格外：超过 32 格维护范围，本墙主动收起，玻璃格全部消失（独立墙效果释放了自己的地形租约），
 *      共享身份消失、防御等级回落到施放前（本次贡献按真实值收回，不留空防御）。
 * 墙被 AI 铺在自己与僵尸之间的来路上（点选落点定墙心）。墙根落在所选落点附近的真实支撑上、实际立起几列、
 * 放下多少格、具体缺口如何由真实格子决定；画面只描这些真实格子的顶面与连通段的顶边、缺口留白，属于人工试玩核对。
 */
Smoke.scenario("barrier", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.fill([-8, 0, -8], [8, 3, 8], "minecraft:air");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "bronzong", level: 36, moves: ["barrier"], at: [0, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [8, 0, 0] });
    stage.hostile(caster, foe);
    function glass(): { at: number[]; before: string; after: string }[] {
        return stage.changedBlocks().filter(function (block) { return block.after === "minecraft:light_blue_stained_glass"; });
    }
    function wallCells(): number { return glass().length; }
    var baseDef = 0;
    stage.until(1200, function () {
        return stage.casts("barrier", caster) > 0
            && stage.hadMobEffect(caster, "world_combat:status/barrier")
            && wallCells() > 0;
    }, function () {
        stage.expect(stage.casts("barrier", caster) > 0, "barrier was committed");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/barrier"), "the ward window carried the shared identity");
        stage.expect(wallCells() > 0, "the barrier put real hard-light blocks into the world");
        baseDef = stage.stages(caster).def || 0;
        stage.expect(baseDef >= 1, "the wall really raised Defense on the shared ladder");
        // 只测这一面墙：PP 置零，避免 AI 中途再立一面干扰断言。
        stage.setPp(caster, "barrier", 0);

        // 局部破坏：打掉一格，剩下的墙与防御必须保留。
        var full = wallCells(), cell = glass()[0], remaining = 0;
        stage.command("setblock ~" + cell.at[0] + " ~" + cell.at[1] + " ~" + cell.at[2] + " air");
        stage.until(80, function () { return wallCells() === full - 1; }, function () {
            stage.expect(wallCells() === full - 1 && wallCells() > 0, "breaking one cell leaves the rest of the wall standing");
            stage.expect(stage.hasMobEffect(caster, "world_combat:status/barrier"), "the defense window stays while the wall remains");
            stage.expect((stage.stages(caster).def || 0) >= 1, "Defense stays raised while the wall remains");
            remaining = wallCells();

            // 离开维护范围：施法者离墙超过 32 格，本墙主动收起，地形与本次防御一起收回。
            stage.command("tp " + String(caster.ref).split("/")[0] + " ~40 ~ ~");
            stage.until(200, function () {
                return !stage.hasMobEffect(caster, "world_combat:status/barrier") && wallCells() === 0;
            }, function () {
                stage.expect(!stage.hasMobEffect(caster, "world_combat:status/barrier"), "leaving the maintenance range ended the barrier window");
                stage.expect(wallCells() === 0, "the wall effect released its terrain lease, so the glass is gone");
                stage.expect((stage.stages(caster).def || 0) < baseDef, "out-of-range collection recovered the wall's Defense");
                stage.note("the wall is a rented terrain lease owned by the wall effect; breaking one cell leaves the rest, and walking beyond the 32-block maintenance range collects the wall and its Defense together (no empty Defense). Width, height, gap layout and the exact remaining outline are mechanics read from the real cells.", {
                    casts: stage.casts("barrier", caster),
                    wallCellsFull: full,
                    wallCellsAfterBreak: remaining,
                    wallCellsAfterRange: wallCells(),
                    defenseWhileStanding: baseDef,
                    defenseAfterRange: stage.stages(caster).def || 0,
                    damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                    alive: caster.alive()
                });
                stage.done();
            }, "wall collected out of range");
        }, "one wall cell broken");
    }, "barrier engages");
});
