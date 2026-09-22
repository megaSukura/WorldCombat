/**
 * 月亮之力 / moonblast —— 可执行设计说明。
 *
 * 一句话：借头顶的月光拢成一颗球射出去，命中造成妖精特殊伤害，偶尔把目标特攻压下一级。
 *
 * 场面：一只只会月亮之力的皮皮（40 级）在开阔夜空下对一只凯西（25 级）。只给这一招，AI 就只会用它；
 * 时间设为夜晚、天气晴朗，让月华（世界事实）真正生效。断言只取必然事实：招式被提交过、目标受过伤害。
 * 是否触发降攻（约三成起）与月华数值写进 note 供读轨迹判断。
 */
Smoke.scenario("moonblast", function (stage) {
    stage.fill([-12, -1, -8], [12, -1, 8], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "clefairy", level: 40, moves: ["moonblast"], at: [-6, 0, 0] });
    var foe = stage.pokemon({ species: "abra", level: 25, moves: ["tackle"], at: [0, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(700, function () {
        return stage.casts("moonblast", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("moonblast", caster) > 0, "月亮之力被放出来了");
        stage.expect(stage.damageTo(foe) > 0, "月华球打中了目标");
        stage.note("降攻是概率结果（基础三成起、随特攻与月华上升），只作记录；本场为开阔夜空，月华应接近满值；换到白天或室内威力会明显降低。",
            { casts: stage.casts("moonblast", caster), damage: Math.round(stage.damageTo(foe) * 10) / 10,
                foeAlive: foe.alive() });
        stage.done();
    }, "月华球命中目标");
});
