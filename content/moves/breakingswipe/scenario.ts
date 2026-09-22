/**
 * 广域破坏 / breakingswipe —— 可执行设计说明。
 *
 * 一句话：原地甩尾扫出一道宽扇，扇里的敌人一起挨打、被掀开并降低攻击；地面留下短时犁痕。
 *
 * 场面：石头地面、晴夜。一只只会「广域破坏」的快龙（技能表只给这一招，AI 就只会用它）对上一只铁傀儡——
 *   快龙血厚，扛得住铁傀儡的还手、不会掉头逃跑，好让这一记尾扫落到目标身上并把掉攻读到攻击属性上。
 *   双方起手就贴得近（3 格），第一轮决策就能扫到。
 * 必然事实：广域破坏被提交过；铁傀儡受到过伤害；铁傀儡的攻击属性在一次命中后下降。
 *   扫到几人、掀开距离、犁痕地格数与伤害数值写进 note，供读轨迹判断。
 */
Smoke.scenario("breakingswipe", function (stage) {
    stage.fill([-10, -1, -10], [10, -1, 10], "minecraft:stone");
    stage.fill([-10, 0, -10], [10, 10, 10], "minecraft:air");
    stage.weather("clear");
    stage.time("night");
    var axe = stage.pokemon({ species: "dragonite", level: 45, moves: ["breakingswipe"], at: [-1.5, 0, 0], properties: "nature=adamant" });
    var golem = stage.mob({ type: "minecraft:iron_golem", at: [1.5, 0, 0] });
    var baseAttack = stage.attribute(golem, "minecraft:generic.attack_damage");
    stage.hostile(axe, golem);
    stage.until(1500, function () {
        return stage.casts("breakingswipe", axe) >= 1 && stage.damageTo(golem) > 0;
    }, function () {
        stage.after(60, function () {
            stage.expect(stage.casts("breakingswipe", axe) >= 1, "dragonite committed breaking swipe");
            stage.expect(stage.damageTo(golem) > 0, "the tail sweep dealt damage to the target");
            stage.expect(stage.attribute(golem, "minecraft:generic.attack_damage") < baseAttack,
                "the sweep lowered the target's attack attribute through the shared stat ladder");
            stage.note("breaking swipe is a directional fan around the user that hits every enemy inside it and leaves a coarse-dirt furrow (a leased terrain layer). This stage has a single target; the crowd-sweep, the knockback and the furrow cell count are read from the trace or a manual playtest.", {
                casts: stage.casts("breakingswipe", axe),
                baseAttack: Math.round(baseAttack * 100) / 100,
                attackNow: Math.round(stage.attribute(golem, "minecraft:generic.attack_damage") * 100) / 100,
                dealt: Math.round(stage.damageBy(axe) * 10) / 10,
                targetDamage: Math.round(stage.damageTo(golem) * 10) / 10,
                travelled: Math.round(stage.travelled(axe) * 10) / 10,
                changedBlocks: stage.changedBlocks().length,
                targetAlive: golem.alive(),
                tick: stage.tick()
            });
            stage.done();
        });
    }, "breaking swipe lands on the target within 75 s");
});
