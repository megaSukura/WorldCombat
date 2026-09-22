/**
 * 棱角化的可执行设计说明。
 *
 * 场面：一只只会棱角化的勾魂眼格斗系——用腕力（Machop），与一只僵尸相隔 8 格、铺了石质地面的场地上开战；天晴、白天。
 * 必然事实：本招被提交过；施法者身上出现过共享身份 world_combat:status/sharpened 的棱角窗口；
 *   只会棱角化的施法者没有任何直接攻击手段，因此僵尸受到的伤害必然来自近身接触时的棱角反击。
 * 反击具体打了几次、每次多少，写进 note 供读轨迹判断。
 */
Smoke.scenario("sharpen", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    // 用夜晚，避免白天僵尸自燃造成的伤害干扰「伤害必然来自棱角反击」这条判断。
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Machop", level: 30, moves: ["sharpen"], at: [0, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [8, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1000, function () {
        return stage.casts("sharpen", caster) > 0 && stage.hadMobEffect(caster, "world_combat:status/sharpened")
            && stage.damageTo(caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("sharpen", caster) > 0, "sharpen was committed");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/sharpened"), "the caster carried the shared sharpened identity");
        stage.expect(stage.damageTo(caster) > 0, "the caster was struck in melee");
        stage.expect(stage.damageTo(foe) > 0, "the attacker was cut by the edges on contact");
        stage.note("sharpen observations", {
            casts: stage.casts("sharpen", caster),
            sharpened: stage.hadMobEffect(caster, "world_combat:status/sharpened"),
            foeDamage: Math.round(stage.damageTo(foe) * 10) / 10,
            ownDamage: Math.round(stage.damageTo(caster) * 10) / 10,
            health: Math.round(caster.health() * 10) / 10
        });
        stage.done();
    }, "sharpen is cast and cuts back");
});
