/**
 * 磁铁炸弹 / magnetbomb —— 可执行设计说明。
 *
 * 一句话：几枚钢弹被磁力吸住对手，引信走完后在它身上起爆。
 *
 * 场面：一只只带磁铁炸弹的自爆磁怪，对一只五格外的卡比兽（厚血、走得慢，便于等引信走完）。场地铺平，白天。
 * 断言只取必然事实：这招被提交过；目标身上出现过共享身份 world_combat:status/magnetbomb；
 *   引信到点后目标受到过伤害（一枚吸住的钢弹必然起爆）。弹数、引信长短、暴击、溅射写进 note 供读轨迹判断。
 */
Smoke.scenario("magnetbomb", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "magnezone", level: 40, moves: ["magnetbomb"], at: [-2, 0, 0] });
    var foe = stage.pokemon({ species: "snorlax", level: 55, moves: ["tackle"], at: [4, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("magnetbomb", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(120, function () {
            stage.expect(stage.casts("magnetbomb", caster) >= 1, "caster committed magnet bomb");
            stage.expect(stage.hadMobEffect(foe, "world_combat:status/magnetbomb"), "the foe carried the magnetic charge");
            stage.expect(stage.damageTo(foe) > 0, "the stuck bomb detonated and dealt damage");
            stage.note("bomb count, fuse length, how many bombs stuck, crit and splash are positional/random", {
                casts: stage.casts("magnetbomb", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                foeAlive: foe.alive(),
                tick: stage.tick()
            });
            stage.done();
        });
    }, "magnet bomb sticks and detonates within 60 s");
});
