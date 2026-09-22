/**
 * 挺住的执行设计说明。
 *
 * 场面：一只只会挺住的精灵与 14 格外一只僵尸开战；先把精灵打到约 15% 生命，逼 AI 咬牙，再施加一记必杀伤害。
 * 必然事实：本招被提交过；挺住窗口内的一记致命伤害没有把它打倒（仍存活）。
 * 保命前后的生命值与是否触发力竭写进 note 供读轨迹判断。
 */
Smoke.scenario("endure", function (stage) {
    var caster = stage.pokemon({ species: "Machoke", level: 40, moves: ["endure"], at: [0, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [14, 0, 0] });
    stage.hostile(caster, foe);
    stage.after(30, function () {
        stage.command("damage " + String(caster.ref).split("/")[0] + " " + (caster.health() * 0.85) + " minecraft:generic");
    });
    stage.until(600, function () {
        return stage.casts("endure", caster) > 0;
    }, function () {
        stage.expect(stage.casts("endure", caster) > 0, "endure was committed");
        stage.after(12, function () {
            var before = caster.health();
            stage.command("damage " + String(caster.ref).split("/")[0] + " 99999 minecraft:mob_attack by " + String(foe.ref).split("/")[0]);
            stage.after(4, function () {
                stage.expect(caster.alive(), "the lethal blow did not bring it down");
                stage.note("endure save", { before: before, after: caster.health(), alive: caster.alive() });
                stage.done();
            });
        });
    }, "endure window");
});
