/**
 * 血月 / bloodmoon —— 可执行设计说明。
 *
 * 一句话：一只血月月月熊（L70，原生学习者，血月形态）从 11 格外召出一轮血月、把气势推成一道直射月束打中站桩的
 *   卡比兽；砸完之后它短时间内不能再次召月——这就是原生「无法连续使出2次」。
 *
 * 场面：血月形态的月月熊（ursaluna，aspect=bloodmoon）只会血月，卡比兽（snorlax）只会跃起、原地站桩，
 *   相隔 11 格——在射程内，月月熊不用先靠近；地面铺平、夜晚晴天，两者之间没有掩体，月束可以直射。
 *
 * 必然事实：本招被提交过（`stage.casts`）；目标受到过伤害（`stage.damageTo`）；首次召月后 60 刻内没有再被使出
 *   （禁复门禁——它在 60 刻内只有血月一招可用，重试会被顶回去）；不再改动任何方块（取消焦地后没有地形变化）。
 *   首敌/同线后排的伤害数值、暴击与是否被方块截断都随现场而定，写进 note 供读轨迹判断。
 */
Smoke.scenario("bloodmoon", function (stage) {
    stage.fill([-16, -1, -12], [16, -1, 12], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "ursaluna", level: 70, moves: ["bloodmoon"], at: [-6, 0, 0], properties: "aspect=bloodmoon" });
    var foe = stage.pokemon({ species: "snorlax", level: 70, moves: ["splash"], at: [5, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(3000, function () {
        return stage.casts("bloodmoon", caster) >= 1;
    }, function () {
        stage.after(60, function () {
            stage.expect(stage.casts("bloodmoon", caster) >= 1, "the caster committed bloodmoon");
            stage.expect(stage.damageTo(foe) > 0, "bloodmoon dealt damage to the foe");
            stage.expect(stage.casts("bloodmoon", caster) === 1, "bloodmoon could not be used twice in a row within the spent window");
            stage.expect(stage.changedBlocks().length === 0, "bloodmoon left no scorched terrain");
            stage.note("the first beam is counted; within the spent window the only move it knows is rejected, so the count stays 1; the beam no longer alters terrain", {
                casts: stage.casts("bloodmoon", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                foeAlive: foe.alive(),
                casterAlive: caster.alive(),
                block: stage.changedBlocks().length
            });
            stage.done();
        });
    }, "blood moon beam lands within 150 s");
});
