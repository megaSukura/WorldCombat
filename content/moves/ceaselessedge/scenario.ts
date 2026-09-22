/**
 * 秘剑・千重涛 / ceaselessedge —— 可执行设计说明。
 *
 * 一句话：一记贝壳之刃的斩击，把贝壳碎片甩在对手脚下插成一圈——踏上去被割，同一片地上再斩会更利。
 *
 * 场面：一只会千重涛的大剑鬼（L40）对一只昏睡的小海狮（L30），相隔 3 格——AI 会贴近再斩。
 *   昏睡让目标停在原地，碎片圈正好铺在它脚下，能看清「斩中留下撒菱、撒菱持续割」这条主线。
 *
 * 必然事实：本招被提交过；目标受到过伤害（斩击或碎片）。
 * 随机量写进 note：暴击（本招 critChance 掷取）、碎片落到哪一格、目标是否会走出圈都是随机的。
 */
Smoke.scenario("ceaselessedge", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "samurott", level: 40, moves: ["ceaselessedge"], at: [-2, 0, 0] });
    var foe = stage.pokemon({ species: "slowpoke", level: 30, moves: ["tackle"], status: "sleep", at: [1, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1400, function () {
        return stage.casts("ceaselessedge", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(60, function () {
            stage.expect(stage.casts("ceaselessedge", caster) >= 1, "the caster committed ceaselessedge");
            stage.expect(stage.damageTo(foe) > 0, "the slash or the planted shell shards cut the foe");
            stage.note("crit and the exact splinter cell are random; the sleeping foe stays on the patch so it should keep being cut", {
                casts: stage.casts("ceaselessedge", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                foeAlive: foe.alive(),
                changedBlocks: stage.changedBlocks().length
            });
            stage.done();
        });
    }, "ceaselessedge cuts the foe within 70 s");
});
