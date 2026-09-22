/**
 * 爬击 / skittersmack —— 可执行设计说明。
 *
 * 一句话：贴地绕到目标身侧再绕到背后，从背后拍一记，目标是掉特攻的那一个。
 *
 * 场面：一只只会爬击的蜻蜻蜓（38 级）对一只被点住、不会还手、不会跑的铁傀儡（稳当的靶子）。只给它爬击，
 * AI 就只会用它。断言只取必然事实：招式被提交过、目标受过伤害。绕背是否成功、背击加成是否吃到、特攻等级
 * 是否下降（对非宝可梦落到攻击阶梯，场景读不到）写进 note 供读轨迹判断。
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
        stage.expect(stage.casts("skittersmack", caster) > 0, "爬击被放出来了");
        stage.expect(stage.damageTo(foe) > 0, "爬击拍中了目标");
        stage.note("绕背是否成功、背击加成是否吃到、特攻下降（对非宝可梦落到攻击阶梯）都是位置/对象结果，只作记录；绕行会被墙挡住时改为从侧面出手。",
            { casts: stage.casts("skittersmack", caster), damage: Math.round(stage.damageTo(foe) * 10) / 10,
                travelled: Math.round(stage.travelled(caster) * 10) / 10, foeAlive: foe.alive() });
        stage.done();
    }, "爬击在 35 秒内拍中目标");
});
