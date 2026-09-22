/**
 * 鳃咬 / fishiousrend —— 可执行设计说明。
 *
 * 一句话：抢在对手反应前扑上去一口咬住；目标尚未打过施法者时翻倍，咬住后把目标拖近并压低它的速度。
 *
 * 场面：一只物攻手站在三格外对一只低等级对手，只带这一招；平地、夜晚，避免日光干扰读数。
 * 断言只取必然事实：这招被提交过、目标受过伤害。先手翻倍取决于目标此前有没有打过施法者，
 * 拖拽与压速是必然后果但都由条件触发，一并写进 note 供读轨迹判断。
 */
Smoke.scenario("fishiousrend", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    const caster = stage.pokemon({ species: "gyarados", level: 45, moves: ["fishiousrend"], at: [-2, 0, 0], properties: "nature=adamant" });
    const target = stage.pokemon({ species: "raticate", level: 22, moves: ["tackle"], at: [2, 0, 0] });
    stage.hostile(caster, target);
    stage.until(600, function () { return stage.casts("fishiousrend", caster) >= 1 && stage.damageTo(target) > 0; }, function () {
        stage.expect(stage.casts("fishiousrend", caster) >= 1, "gyarados committed fishious rend");
        stage.expect(stage.damageTo(target) > 0, "the gill bite dealt damage");
        stage.note("the doubling needs the target not to have hit the caster first; drag and the Speed stage drop follow the landed bite", {
            casts: stage.casts("fishiousrend", caster),
            dealt: Math.round(stage.damageBy(caster) * 10) / 10,
            taken: Math.round(stage.damageTo(caster) * 10) / 10,
            targetDamage: Math.round(stage.damageTo(target) * 10) / 10,
            movedBy: Math.round(stage.travelled(caster) * 10) / 10,
            targetSpeedAttribute: Math.round(stage.attribute(target, "minecraft:generic.movement_speed") * 100) / 100,
            tick: stage.tick()
        });
        stage.done();
    }, "fishious rend lands on the target within 30 s");
});
