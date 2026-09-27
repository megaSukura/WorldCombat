/**
 * 甩肉的可执行设计说明。
 *
 * 场面：一只只会「甩肉」的伙伴与一只僵尸隔开 10 格开战。伙伴有威胁且还没贴脸时会先削身叠攻/特攻/速度。
 * 必然事实：本招被提交过、施法者实际支付过这一刀的生命（damageTo 计入世界伤害事件）、
 * 三项真的各拿到了正阶段（stages 读真实阶段增量）。甩出的血肉块数与是否连续使用写进 note 供读轨迹判断。
 */
Smoke.scenario("filletaway", function (stage) {
    var a = stage.pokemon({ species: "Eevee", level: 30, moves: ["filletaway"], at: [-2, 0, 0] });
    var b = stage.mob({ type: "minecraft:zombie", at: [8, 0, 0] });
    stage.hostile(a, b);
    stage.until(600, function () {
        return stage.casts("filletaway") > 0 && stage.damageTo(a) > 0;
    }, function () {
        var stages = stage.stages(a);
        stage.expect(stage.casts("filletaway") > 0, "filletaway was committed");
        stage.expect(stage.damageTo(a) > 0, "the carve actually paid the caster HP");
        stage.expect((stages.atk || 0) > 0 && (stages.spa || 0) > 0 && (stages.spe || 0) > 0,
            "attack, sp. atk and speed each gained a real stage");
        stage.after(140, function () {
            stage.note("filletaway carve", { casts: stage.casts("filletaway"),
                health: Math.round(a.health() * 10) / 10, movedA: Math.round(stage.travelled(a) * 10) / 10,
                damageOnCaster: Math.round(stage.damageTo(a) * 10) / 10, stages: stages });
            stage.done();
        });
    }, "the carve happens");
});
