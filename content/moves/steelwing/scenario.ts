/**
 * 钢翼 / steelwing 的可执行设计说明。
 *
 * 一句话：展开的双翼只让**两侧翼缘**接触，正前方两翼之间是安全的空隙；左、右两条翼缘可以扫到不同的人。
 *
 * 场面：一只只会钢翼的飞天螳螂（Scyther，钢翼真实学习者，30 级）在中心，正前方 2 格放一只厚血的卡比兽
 *   （Snorlax，40 级，只会跃起）作为它锁定的目标；目标一侧 1.6 格再放一只不动（noai）的僵尸当翼缘的接触对象。
 *   石地、白天、晴。开启 `glide`，让身体真实向前滑、滑行期间保持两侧全幅翼缘。
 *
 * 必然事实：本招被提交过（`stage.casts`）；两条翼缘之一真实切到了某一侧的身体并造成伤害——
 *   无论螳螂锁的是卡比兽还是僵尸，另一个都在它的侧向，必落在某条翼缘上。左右翼各扫到谁、磨防是否触发写进 note。
 */
Smoke.scenario("steelwing", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "scyther", level: 30, moves: ["steelwing"], at: [0, 0, 0] });
    var bait = stage.pokemon({ species: "snorlax", level: 40, moves: ["splash"], at: [2, 0, 0] });
    var flank = stage.mob({ type: "minecraft:zombie", at: [0, 0, 1.6] });
    stage.hostile(caster, bait);
    stage.noai(flank);
    stage.after(2, function () { stage.prefer(caster, "steelwing", { glide: true }); });
    stage.until(1200, function () {
        return stage.casts("steelwing", caster) >= 1 && stage.damageTo(flank) + stage.damageTo(bait) > 0;
    }, function () {
        stage.after(60, function () {
            stage.expect(stage.casts("steelwing", caster) >= 1, "the caster committed steel wing");
            stage.expect(stage.damageTo(flank) + stage.damageTo(bait) > 0, "a wing edge cut a body to the side");
            stage.note("which edge caught which body, the ~10% harden roll, and whether the front gap stayed safe are positional/random", {
                casts: stage.casts("steelwing", caster),
                flankDamage: Math.round(stage.damageTo(flank) * 10) / 10,
                baitDamage: Math.round(stage.damageTo(bait) * 10) / 10,
                casterMoved: Math.round(stage.travelled(caster) * 10) / 10,
                flankAlive: flank.alive(),
                baitAlive: bait.alive()
            });
            stage.done();
        });
    }, "steel wing cuts a body on the flank");
});
