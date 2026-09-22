/**
 * 大地之力的可执行设计说明：让会这一招的精灵对一名站在石地上的睡眠对手掀地，验证它命中、造成伤害，
 * 并把目标脚下的石面掀成碎石（changedBlocks 读到 cobblestone）。
 *
 * 睡眠靶子让距离固定，方便确认「从目标脚下发动」。离地目标不挨打（原生 nonsky）是设计事实，
 * 但本场景只摆地上目标；碾防（约 10% 起）、暴击、被顶多高与裂开几块都写进 note。
 */
Smoke.scenario("earthpower", function (stage) {
    stage.fill([-8, -1, -6], [10, -1, 6], "minecraft:stone");
    var caster = stage.pokemon({ species: "nidoking", level: 36, moves: ["earthpower"], at: [-4, 0, 0] });
    var target = stage.pokemon({ species: "rattata", level: 22, moves: ["tackle"], status: "sleep", at: [3, 0, 0] });
    stage.hostile(caster, target);
    function torn(): { at: number[]; before: string; after: string }[] {
        return stage.changedBlocks().filter(function (cell) { return cell.after === "minecraft:cobblestone"; });
    }
    stage.until(1200, function () {
        return stage.casts("earthpower", caster) > 0 && stage.damageTo(target) > 0;
    }, function () {
        stage.after(15, function () {
            stage.expect(stage.casts("earthpower", caster) > 0, "earthpower was committed");
            stage.expect(stage.damageTo(target) > 0, "the surge damaged the grounded target");
            stage.expect(torn().length > 0, "the ground under the target was torn open");
            stage.note("the passive Sp. Def roll (about 10% base), crit, how high the target was launched and how many cells tore are random/positional; airborne foes take nothing by design (native nonsky)", {
                casts: stage.casts("earthpower", caster),
                damage: Math.round(stage.damageTo(target) * 10) / 10,
                torn: torn().length,
                targetTravelled: Math.round(stage.travelled(target) * 10) / 10,
                targetAlive: target.alive()
            });
            stage.done();
        });
    }, "earthpower erupts under the target within 60 s");
});
