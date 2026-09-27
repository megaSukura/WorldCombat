// 挑衅的可执行设计说明：先让一只只会挑衅的宝可梦对着一道矮墙喊一句——矮墙挡住躯干中线，
// 但眼睛还看得见对方，所以它会尝试出手；这一次必然落空、不挂状态。再拆掉矮墙，同样的距离下
// 有真实通视直线，它才喊中——怒火期间只会变化招式的对手无法提交变化招式。
// 必然事实：矮墙那次提交发生过但没有挂上共享身份；拆墙后的提交挂上了身份且变化招式不再成功。
Smoke.scenario("taunt", function (stage) {
    stage.fill([-10, -1, -10], [10, -1, 10], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "zoroark", level: 40, moves: ["taunt"], at: [-6, 0, 0] });
    // 同高的对手：带一个变化招式 growl 与一个伤害招式 scratch，所以它会正面接战而不是逃跑；
    // 眼睛高过矮墙，躯干中线却被挡住。
    var target = stage.pokemon({ species: "zoroark", level: 20, moves: ["growl", "scratch"], at: [0, 0, 0] });
    stage.hostile(target, caster);
    // 一格高的真实矮墙：躯干中线被挡，但双方的视线高过墙顶，所以伙伴仍能看见并尝试挑衅。
    stage.fill([-3, 0, -3], [-3, 0, 3], "minecraft:stone");
    stage.noai(target);
    stage.until(600, function () {
        return stage.casts("taunt", caster) > 0;
    }, function () {
        stage.expect(stage.casts("taunt", caster) > 0, "the caster still tries the taunt at a walled foe");
        stage.expect(!stage.hadMobEffect(target, "world_combat:status/taunt"), "the shout does not pass through the wall");
        // 拆墙，恢复对手行动：同样的距离，这次有真实通视直线。
        stage.fill([-3, 0, -3], [-3, 0, 3], "minecraft:air");
        stage.command("data merge entity " + target.ref.split("/")[0] + " {NoAI:0b}");
        stage.until(900, function () {
            return stage.hasMobEffect(target, "world_combat:status/taunt");
        }, function () {
            stage.expect(stage.hasMobEffect(target, "world_combat:status/taunt"), "with a clear line the taunt enrages the foe");
            var before = stage.casts("growl", target);
            stage.after(80, function () {
                stage.expect(stage.hasMobEffect(target, "world_combat:status/taunt"), "the rage still holds while we watch");
                stage.expect(stage.casts("growl", target) === before, "the enraged foe's status move stays rejected");
                stage.note("命中在提交点按真实射程/通视复核：矮墙挡住躯干中线时落空，停在墙面接触点、不挂状态；" +
                    "拆墙后有直线才喊中。怒火期间只会变化招式的对手无法提交变化招式（本作／已接入的原生招式按 category 识别）；" +
                    "怒火时长随施法者等级与特攻变化，落空的灰白爆与命中的红怒可由轨迹区分。", {
                    casts: stage.casts("taunt", caster),
                    targetHp: target.health(), casterHp: caster.health(),
                    targetStatusMoveCasts: stage.casts("growl", target)
                });
                stage.done();
            });
        }, "taunt lands once the wall is gone");
    }, "caster taunts toward the walled foe");
});
