/**
 * 喷出 的可执行设计说明。
 *
 * 场面：一只只会蓄力与喷出的吞食兽（30 级）与一只小拉达（12 级）隔开 8 格、石质场地上开战；技能表里只有这两招，
 *   所以 AI 会先用蓄力攒层、再找机会喷出。本单元的喷出依赖蓄力单元提供的共享身份，装配时一并传入 stockpile 目录。
 * 必然事实：喷出被提交过；目标受到过伤害。
 *   蓄到几层、是否一次放空、放空后防护等级是否收回，写进 note 与轨迹供判断。
 */
Smoke.scenario("spitup", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "swalot", level: 30, moves: ["stockpile", "spitup"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "rattata", level: 12, moves: ["tackle"], at: [5, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1400, function () {
        return stage.casts("spitup") > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("spitup") > 0, "spitup was committed");
        stage.expect(stage.damageTo(foe) > 0, "the spit dealt damage");
        stage.note("spitup requires the shared stockpile identity; the AI stockpiles first (its own plan hoards to 2 layers) then spits. Power is per-layer base x layers, and all layers are consumed: the stockpile unit takes back the Defence/Sp. Def stages and scatters the shell.", {
            spitCasts: stage.casts("spitup"),
            stockpileCasts: stage.casts("stockpile"),
            damageToFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
            casterAlive: caster.alive(), foeAlive: foe.alive()
        });
        stage.done();
    }, "spitup lands");
});
