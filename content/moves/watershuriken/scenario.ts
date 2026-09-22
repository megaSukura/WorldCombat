/**
 * 飞水手里剑 / watershuriken 的可执行设计说明。
 *
 * 一句话：在掌中搓出旋转的水盘，一枚接一枚沿直线甩向目标，每枚独立结算特殊伤害并挂上浇透。
 *
 * 场面：一只只会飞水手里剑的水系精灵（Greninja，40 级）面对六格外的铁傀儡（被点住不还手、耐打，所以一轮水星会陆续挂上浇透）；
 *   设为夜晚，环境不会造成伤害。两者开战，AI 只有这一招可用。
 * 必然事实：本招被提交过；目标受到过伤害；目标身上出现过共享身份 soaked（命中即浇透）。
 *   甩几枚（2～5，随等级／特攻／速度与配置变化）、散布与暴击写进 note 供读轨迹判断。
 */
Smoke.scenario("watershuriken", function (stage) {
    stage.fill([-10, -1, -6], [10, -1, 6], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Greninja", level: 40, moves: ["watershuriken"], at: [-3, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..8,limit=1] {NoAI:1b}");
    stage.until(900, function () {
        return stage.casts("watershuriken", caster) > 0 && stage.damageTo(foe) > 0 && stage.hadMobEffect(foe, "world_combat:status/soaked");
    }, function () {
        // 第一枚命中后再等这一轮甩完，把整轮的总伤害记下来（甩几枚是数据与配置的结果，只作 note）。
        stage.after(60, function () {
            stage.expect(stage.casts("watershuriken", caster) > 0, "water shuriken was committed");
            stage.expect(stage.damageTo(foe) > 0, "the water stars dealt damage");
            stage.expect(stage.hadMobEffect(foe, "world_combat:status/soaked"), "the target was soaked");
            stage.note("the star count (2-5) follows level/Special Attack/Speed and the focused choice; each star settles its own special damage and refreshes the shared soaked identity. Star count, spread and crits are probability-free data results.", {
                casts: stage.casts("watershuriken", caster),
                onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
                moved: Math.round(stage.travelled(caster) * 10) / 10,
                hurtBack: Math.round(stage.damageTo(caster) * 10) / 10,
                tick: stage.tick()
            });
            stage.done();
        });
    }, "water shuriken's star volley lands and soaks the zombie");
});
