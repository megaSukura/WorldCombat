/**
 * 替身的可执行设计说明。
 *
 * 场面：一只只会「替身」的伙伴面对一只僵尸。伙伴有威胁就会先立替身（默认 ai.useBelow=1.0），
 * 僵尸随后打上来的伤害应被 redirect 转到替身身上。
 * 必然事实：本招被提交过、施法者身上出现过共享身份 world_combat:status/substitute。
 * 随机与走位结果（僵尸是否真的打到、承伤多少、替身几时碎）写进 note 供读轨迹判断。
 */
Smoke.scenario("substitute", function (stage) {
    var a = stage.pokemon({ species: "Eevee", level: 30, moves: ["substitute"], at: [-2, 0, 0] });
    var b = stage.mob({ type: "minecraft:zombie", at: [7, 0, 0] });
    stage.hostile(a, b);
    stage.until(600, function () {
        return stage.casts("substitute") > 0 && stage.hadMobEffect(a, "world_combat:status/substitute");
    }, function () {
        stage.expect(stage.casts("substitute") > 0, "substitute was committed");
        stage.expect(stage.hadMobEffect(a, "world_combat:status/substitute"), "the ward identity landed on the caster");
        stage.after(180, function () {
            stage.note("substitute ward", { casts: stage.casts("substitute"), damageOnCaster: stage.damageTo(a),
                damageOnZombie: stage.damageTo(b), health: Math.round(a.health() * 10) / 10 });
            stage.done();
        });
    }, "substitute is raised");
});
