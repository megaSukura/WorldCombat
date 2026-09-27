/**
 * 爬击 / skittersmack —— 可执行设计说明。
 *
 * 一句话：贴地绕到目标身侧再绕到背后，最后肢端按真实 reach 与 smackWidth 横扫一记，目标是掉特攻的那一个。
 *
 * 场面：一只只会爬击的蜻蜻蜓（38 级）对一只被点住、不会还手、不会跑的铁傀儡（稳当的靶子）。只给它爬击，
 * AI 就只会用它。断言只取必然事实：招式被提交过、目标受过伤害、特攻阶梯确实下降（对非宝可梦落到共享攻击阶梯，
 * `stage.stages(foe).spa` 可读）。绕背是否成功、背击加成是否吃到写进 note 供读轨迹判断。
 */
Smoke.scenario("skittersmack", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "yanma", level: 38, moves: ["skittersmack"], at: [-2.5, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..8,limit=1] {NoAI:1b}");
    stage.until(700, function () {
        return stage.casts("skittersmack", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(2, function () {
            stage.expect(stage.casts("skittersmack", caster) > 0, "爬击被放出来了");
            stage.expect(stage.damageTo(foe) > 0, "爬击拍中了目标");
            stage.expect(stage.stages(foe).spa <= -1, "拍中后目标特攻阶梯确实下降 1 级");
            stage.note("绕背是否成功、背击加成是否吃到都是位置/对象结果，只作记录；绕行用原生身体扫掠，落点先确认可站，被墙或身体挡住就改从侧面出手或不伪称绕背。最后那一记横扫按真实 reach 与 smackWidth 画扇面，特攻下降只按实际被接受的级数回执。",
                { casts: stage.casts("skittersmack", caster), damage: Math.round(stage.damageTo(foe) * 10) / 10,
                    spaStage: stage.stages(foe).spa,
                    travelled: Math.round(stage.travelled(caster) * 10) / 10, foeAlive: foe.alive() });
            stage.done();
        });
    }, "爬击在 35 秒内拍中目标");
});
