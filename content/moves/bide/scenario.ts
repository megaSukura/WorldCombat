/**
 * 忍耐 / bide —— 可执行设计说明。
 *
 * 一句话：先站定忍耐，把挨到的打记进账本，时间到把这份伤害加倍还给打你的人。
 *
 * 场面：晴天白天、石地。只会忍耐的怪力站在一侧，近处一只僵尸——两个都开战，僵尸会自己贴身攻击，
 *   正好让忍耐有账可记、还手也够得到账主。目标不用任何已注册招式，单跑本单元也能验出「挨打→记账→还手」。
 *
 * 必然事实：忍耐被提交过；忍耐者受过伤（僵尸的招式命中）；忍耐中的账在结账后必然打过账主
 *   （固定伤害结算会向最后攻击者的方向兑现），所以忍耐者一定造成过伤害。窗口长度、账本大小与
 *   是否暴击是随机项，写进 note 供读轨迹判断。
 */
Smoke.scenario("bide", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");

    var caster = stage.pokemon({ species: "machoke", level: 34, moves: ["bide"], at: [-1, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [2, 0, 0] });
    stage.hostile(caster, foe);

    stage.until(1000, function () {
        return stage.casts("bide", caster) >= 1 && stage.damageBy(caster) > 0;
    }, function () {
        stage.expect(stage.casts("bide", caster) >= 1, "the bide user committed the endurance stance");
        stage.expect(stage.damageTo(caster) > 0, "the foe's blow landed and was recorded while the user endured");
        stage.expect(stage.damageBy(caster) > 0, "the recorded damage was paid back to the attacker");
        stage.note("the payback is the ledger times 1.4-2.8 and only reaches the last attacker within releaseReach; whether both warriors survived the exchange and how big the ledger grew are chance outcomes", {
            casterCasts: stage.casts("bide", caster),
            takenByCaster: Math.round(stage.damageTo(caster) * 10) / 10,
            dealtByCaster: Math.round(stage.damageBy(caster) * 10) / 10,
            foeHealth: Math.round(foe.health() * 10) / 10,
            casterHealth: Math.round(caster.health() * 10) / 10,
            bracedSeen: stage.hadMobEffect(caster, "world_combat:status/bide"),
            tick: stage.tick()
        });
        stage.done();
    }, "bide endures, records and pays back within 50 s");
});
