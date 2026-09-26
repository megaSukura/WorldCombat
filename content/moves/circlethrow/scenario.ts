/**
 * 巴投的可执行设计说明。
 *
 * 场面：一只只会「巴投」的伙伴面对一只厚实的对手（先贴到抓取距离内）。
 * 必然事实：本招被提交过、对手挨过伤害。抓取要求贴身与通视，摔的落点受身位和地形影响，写进 note 供读轨迹判断；
 * 不再断言「溃退」，因为本招只在落地做一次打断与强制换下，不长期清目标。
 */
Smoke.scenario("circlethrow", function (stage) {
    var caster = stage.pokemon({ species: "Throh", level: 30, moves: ["circlethrow"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "Snorlax", level: 34, moves: ["tackle"], at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("circlethrow", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        // 等越肩抛投走完，再读目标实际停下的位置。
        stage.after(40, function () {
            stage.expect(stage.casts("circlethrow", caster) > 0, "巴投被放出来了");
            stage.expect(stage.damageTo(foe) > 0, "抓摔打到了目标身上");
            stage.note("巴投只对一个目标、必须贴身且通视；命中后目标沿越肩抛物线被摔到施法者另一侧，撞墙就地落下，落地做一次打断与换人。是否命中（原生命中 90）与暴击不写断言。",
                { casts: stage.casts("circlethrow", caster), damage: Math.round(stage.damageTo(foe) * 10) / 10,
                    travelled: Math.round(stage.travelled(foe) * 10) / 10, foeAt: foe.position(), casterAt: caster.position() });
            stage.done();
        });
    }, "巴投命中并摔出");
});
