/**
 * 爆炸头突击 / headcharge 的可执行设计说明。
 *
 * 场面：会爆炸头突击的爆炸头水牛（Bouffalant）沿一条线对两只只会跃起、不会还手、血厚的卡比兽（Snorlax）开战。
 * 两只靶子沿冲撞线前后贴近摆开，且都在一次冲程之内，让「撞穿第一个继续够到第二个」必然发生。
 * 必然事实：本招被提交过；两只靶子各被撞伤一次（前一个吃全额、后一个吃 through 占比）、施法者按两次命中各反噬掉血。
 * 一次具体伤害数值取决于力度与相性，写进 note 供读轨迹判断。
 */
Smoke.scenario("headcharge", function (stage) {
    stage.fill([-12, -1, -8], [12, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Bouffalant", level: 50, moves: ["headcharge"], at: [-3, 0, 0] });
    var near = stage.pokemon({ species: "Snorlax", level: 40, moves: ["splash"], at: [1.0, 0, 0] });
    var far = stage.pokemon({ species: "Snorlax", level: 40, moves: ["splash"], at: [2.4, 0, 0] });
    stage.hostile(caster, near);
    stage.hostile(caster, far);
    stage.until(1400, function () {
        return stage.casts("headcharge", caster) > 0 && stage.damageTo(caster) > 0
            && stage.damageTo(near) > 0 && stage.damageTo(far) > 0;
    }, function () {
        stage.expect(stage.casts("headcharge", caster) > 0, "headcharge was committed");
        stage.expect(stage.damageTo(near) > 0, "the charge hit the leading target");
        stage.expect(stage.damageTo(far) > 0, "the charge carried through to the second target");
        stage.expect(stage.damageTo(caster) > 0, "the user took per-hit recoil");
        stage.note("贯通：第一个落地目标吃全额、之后吃 through 占比；每撞中一个各反噬一次，两体都掉血说明同冲穿过了第一具身体", {
            casts: stage.casts("headcharge", caster),
            nearDamage: Math.round(stage.damageTo(near) * 10) / 10,
            farDamage: Math.round(stage.damageTo(far) * 10) / 10,
            selfDamage: Math.round(stage.damageTo(caster) * 10) / 10,
            hitTargets: (stage.damageTo(near) > 0 ? 1 : 0) + (stage.damageTo(far) > 0 ? 1 : 0),
            casterHp: caster.health()
        });
        stage.done();
    }, "headcharge plows through both lined-up targets and the user pays per hit");
});
