/**
 * 甩肉的可执行设计说明。
 *
 * 场面：一只只会「甩肉」的伙伴与一只僵尸隔开 10 格开战。伙伴有威胁且还没贴脸时会先削身叠攻/特攻/速度。
 * 必然事实：本招被提交过、施法者身上出现过这一刀的生命代价（damageTo 计入世界伤害事件）。
 * 甩出的血肉块数与是否连续使用写进 note 供读轨迹判断。
 */
Smoke.scenario("filletaway", function (stage) {
    var a = stage.pokemon({ species: "Eevee", level: 30, moves: ["filletaway"], at: [-2, 0, 0] });
    var b = stage.mob({ type: "minecraft:zombie", at: [8, 0, 0] });
    stage.hostile(a, b);
    stage.until(600, function () {
        return stage.casts("filletaway") > 0 && stage.damageTo(a) > 0;
    }, function () {
        stage.expect(stage.casts("filletaway") > 0, "filletaway was committed");
        stage.expect(stage.damageTo(a) > 0, "the carve charged the caster its own HP");
        stage.after(140, function () {
            stage.note("filletaway carve", { casts: stage.casts("filletaway"),
                health: Math.round(a.health() * 10) / 10, movedA: Math.round(stage.travelled(a) * 10) / 10,
                damageOnCaster: Math.round(stage.damageTo(a) * 10) / 10 });
            stage.done();
        });
    }, "the carve happens");
});
