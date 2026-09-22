/**
 * 胃液的可执行设计说明。
 *
 * 场面：一条只会胃液的阿柏怪（等级高）对 6 格外的卡蒂狗（威吓特性）。胃液的预检要求目标在射程内、
 *   有通视直线、还没沾过酸，且特性可被压制，因此它一定是在看到威胁、走近到能通视之后才吐的。
 * 必然事实：本招被提交过；目标身上出现过“沾酸”状态（命中后挂上，承载共享身份 world_combat:status/gastroacid）。
 * 随机结果：命中的具体时机、酸弹是否被身体挡住写进 note 供读轨迹判断。
 * 特性压制走共享的 NativeModifiers suppressAbility 层，不是 MobEffect；smoke 不能直接读特性，改动记在 note 里。
 */
Smoke.scenario("gastroacid", function (stage) {
    var caster = stage.pokemon({ species: "Arbok", level: 42, moves: ["gastroacid"], at: [-3, 0, 0] });
    var target = stage.pokemon({ species: "Growlithe", level: 24, ability: "intimidate", moves: [], at: [3, 0, 0] });
    stage.hostile(caster, target);
    stage.note("staged: arbok(42) gastroacid vs growlithe(24, intimidate); the target's Ability is suppressible so the cast should be accepted");
    stage.until(1200, function () { return stage.hadMobEffect(target, "world_combat:status/gastroacid"); }, function () {
        stage.expect(stage.casts("gastroacid", caster) >= 1, "gastroacid was committed");
        stage.expect(stage.hadMobEffect(target, "world_combat:status/gastroacid"), "acid-coated status appeared on the target");
        stage.note("gastroacid committed; suppression is written through the shared NativeModifiers suppressAbility layer", {
            casts: stage.casts("gastroacid", caster),
            damageToTarget: Math.round(stage.damageTo(target) * 10) / 10
        });
        stage.done();
    }, "gastroacid coat");
});
