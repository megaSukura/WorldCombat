/**
 * 扑击的可执行设计说明。
 *
 * 场面：一只身板结实的精灵（Machop）朝正前方的一小簇目标开战。正前放 3 个加害目标（一具铁傀儡居中、两只僵尸分列两侧），
 * 身后与身侧各放一个中立目标，全部冻结（NoAI）以免它们自己走位。铁傀儡原生抗击退，用来验证「照样受伤但不被强推」；
 * 身后的目标用来验证肩面只盖正前方。夜晚避免无关的日光灼烧污染伤害统计。
 * 必然事实：本招被提交过；正面触体受到伤害、施法者向前短踏；身后与身侧的中立目标毫发无伤；抗击退的铁傀儡受到伤害但几乎没被推动。
 * 具体压到几个、总伤害与推距怎么在触体间均分、以及宽面覆盖，都写进 note 供读轨迹判断。
 */
Smoke.scenario("bodypress", function (stage) {
    stage.time("night");
    var caster = stage.pokemon({ species: "Machop", level: 32, moves: ["bodypress"], at: [0, 0, 0] });
    var frontMid = stage.mob({ type: "minecraft:iron_golem", at: [1.5, 0, 0] });
    var frontLeft = stage.mob({ type: "minecraft:zombie", at: [1.25, 0, -0.4] });
    var frontRight = stage.mob({ type: "minecraft:zombie", at: [1.25, 0, 0.4] });
    var behind = stage.mob({ type: "minecraft:zombie", at: [-1.6, 0, 0] });
    var flank = stage.mob({ type: "minecraft:zombie", at: [0, 0, 1.6] });
    stage.hostile(caster, frontMid);
    stage.hostile(caster, frontLeft);
    stage.hostile(caster, frontRight);
    stage.noai(frontMid, frontLeft, frontRight, behind, flank);
    stage.until(1000, function () {
        return stage.casts("bodypress") > 0 && stage.damageTo(frontMid) > 0 && stage.travelled(caster) > 0.2;
    }, function () {
        stage.after(40, function () {
            stage.expect(stage.casts("bodypress") > 0, "bodypress was committed");
            stage.expect(stage.travelled(caster) > 0.2, "the caster stepped forward while pressing");
            stage.expect(stage.damageTo(frontMid) > 0, "the front body in the shoulder face took damage");
            stage.expect(stage.damageTo(frontLeft) > 0 || stage.damageTo(frontRight) > 0, "the broad shoulder face also reached a flank body in front");
            stage.expect(stage.damageTo(behind) === 0, "the body directly behind was never touched");
            stage.expect(stage.damageTo(flank) === 0, "the body off to the side was never touched");
            stage.expect(stage.travelled(frontMid) < 0.6, "the knockback-resistant golem was damaged but not force-shoved");
            stage.note("bodypress observations", { casts: stage.casts("bodypress"),
                frontDamage: Math.round(stage.damageTo(frontMid) * 10) / 10,
                leftDamage: Math.round(stage.damageTo(frontLeft) * 10) / 10,
                rightDamage: Math.round(stage.damageTo(frontRight) * 10) / 10,
                behindDamage: Math.round(stage.damageTo(behind) * 10) / 10,
                flankDamage: Math.round(stage.damageTo(flank) * 10) / 10,
                casterMoved: Math.round(stage.travelled(caster) * 10) / 10,
                golemMoved: Math.round(stage.travelled(frontMid) * 10) / 10,
                hurtBack: Math.round(stage.damageTo(caster) * 10) / 10 });
            stage.done();
        });
    }, "bodypress presses the front line");
});
