/**
 * 魂舞烈音爆的可执行设计说明。
 *
 * 场面：一只只会「魂舞烈音爆」的伙伴与一只僵尸隔开 11 格开战。伙伴有威胁且还没贴脸时会先起舞叠五项。
 * 必然事实：本招被提交过、施法者身上出现过自己支付的生命代价（damageTo 计入世界伤害事件）。
 * 每拍实际抬了几级、被打断与否、生命读数写进 note 供读轨迹判断。
 */
Smoke.scenario("clangoroussoul", function (stage) {
    var a = stage.pokemon({ species: "Eevee", level: 30, moves: ["clangoroussoul"], at: [-2, 0, 0] });
    var b = stage.mob({ type: "minecraft:zombie", at: [9, 0, 0] });
    stage.hostile(a, b);
    stage.until(600, function () {
        return stage.casts("clangoroussoul") > 0 && stage.damageTo(a) > 0;
    }, function () {
        stage.expect(stage.casts("clangoroussoul") > 0, "clangoroussoul was committed");
        stage.expect(stage.damageTo(a) > 0, "the dance charged the caster its own HP");
        stage.after(140, function () {
            stage.note("clangoroussoul ritual", { casts: stage.casts("clangoroussoul"),
                health: Math.round(a.health() * 10) / 10, movedA: Math.round(stage.travelled(a) * 10) / 10,
                damageOnCaster: Math.round(stage.damageTo(a) * 10) / 10 });
            stage.done();
        });
    }, "the dance starts");
});
