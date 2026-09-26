/**
 * 龙尾的可执行设计说明。
 *
 * 场面：一只只会「龙尾」的伙伴面对一只厚实的对手（先靠近到射程内）。
 * 必然事实：本招被提交过、对手挨过伤害。尾扫从一侧摆到另一侧、尾梢重击与内段折扣、被送飞的落点都受身位和
 * 地形影响，写进 note 供读轨迹判断；不再断言「溃退」，因为本招只做当次抽飞与强制换下，不长期清目标。
 */
Smoke.scenario("dragontail", function (stage) {
    var caster = stage.pokemon({ species: "Druddigon", level: 30, moves: ["dragontail"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "Snorlax", level: 34, moves: ["tackle"], at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("dragontail", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        // 等这一扫与随后的送飞走完，再看实际结果。
        stage.after(30, function () {
            stage.expect(stage.casts("dragontail", caster) > 0, "龙尾被放出来了");
            stage.expect(stage.damageTo(foe) > 0, "尾扫打到了目标身上");
            stage.note("尾扫分 6 刻摆过扇形；离中心越远越接近尾梢重击（外三分之一吃满，内段折扣），位移撞墙会被挡住。是否命中（原生命中 90）与暴击不被舞台接口决定，不写断言。",
                { casts: stage.casts("dragontail", caster), damage: Math.round(stage.damageTo(foe) * 10) / 10,
                    travelled: Math.round(stage.travelled(foe) * 10) / 10, foeAt: foe.position() });
            stage.done();
        });
    }, "龙尾命中并抽飞");
});
