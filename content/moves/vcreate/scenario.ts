/**
 * Ｖ热焰 / vcreate —— 可执行设计说明。
 *
 * 一句话：从前额生出灼热火焰、把自身当弹丸撞出去；提交时就把防御、特防、速度三段一起压下。
 *
 * 场面：只会Ｖ热焰的比克提尼（Victini）对一只被点住、不会还手的铁傀儡，脚下铺石头。
 * 断言只取必然事实：这招被提交过、目标受过伤害、施法者确实位移过（这是一记舍身冲撞）。
 * 三段降级写在公共能力阶梯上（宝可梦的原生能力等级，smoke 的 attribute 读不到），是否命中、撞飞距离与
 * 尽燃式分支都写进 note。
 */
Smoke.scenario("vcreate", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "victini", level: 45, moves: ["vcreate"], at: [-3, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..8,limit:1] {NoAI:1b}");
    stage.until(700, function () {
        return stage.casts("vcreate", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("vcreate", caster) >= 1, "caster committed V-create");
        stage.expect(stage.damageTo(foe) > 0, "V-create dealt damage");
        stage.expect(stage.travelled(caster) > 1, "the dive carried the caster forward");
        stage.note("the Defense/Sp. Def/Speed drops go on the native stat stages at commit and are not readable through smoke's Minecraft attribute probe; the golem is a NoAI stone target so the knockback and nova branch are read from the trace only", {
            casts: stage.casts("vcreate", caster),
            damage: Math.round(stage.damageTo(foe) * 10) / 10,
            travelled: Math.round(stage.travelled(caster) * 10) / 10,
            foeAlive: foe.alive()
        });
        stage.done();
    }, "V-create lands within 35 s");
});
