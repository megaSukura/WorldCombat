/**
 * 催眠粉 / sleeppowder 的可执行设计说明。
 *
 * 场面：开阔石地，两个缓慢走近的尸壳；走路草稍后取得抛粉机会，AI 在它们前路选点生云。
 *
 * 必然事实：催眠粉以点选方式放在移动目标的前路，随后至少一个目标走入云中睡下。
 * 随机结果：云落下时目标是否还站在云里、吸了几口才睡下，都写进 note 供读轨迹判断。
 *   它不造成伤害（原生威力 0），掉血来自中毒一类别的效果；草属性会直接穿过粉末。
 */
namespace SleeppowderLeadScenario {
    var sourceRef = "", targets: string[] = [], aimedAhead = false, pointCast = false, sample: any = null;
    WorldCombat.on("checks:sleeppowder/lead", "world_combat:committed", "", function (event) {
        const action = event.action();
        if (!action || String(action.content()) !== "world_combat:sleeppowder" || String(event.actor().ref()).indexOf(sourceRef) !== 0) return;
        if (action.target() !== null) return;
        pointCast = true;
        const world = event.world(), at = action.targetPosition();
        world.query(action.origin(), 16, false).forEach(function (actor) {
            if (!targets.some(function (ref) { return String(actor.ref()).indexOf(ref) === 0; })) return;
            const body = world.observe(actor); if (body === null) return;
            const v = body.velocity(), speed = Math.sqrt(v.x() * v.x() + v.z() * v.z());
            if (speed <= 0.005) return;
            const delta = at.minus(body.position()), lead = (delta.x() * v.x() + delta.z() * v.z()) / speed;
            if (lead > 0.01) { aimedAhead = true; sample = { point: [at.x(), at.y(), at.z()], target: [body.position().x(), body.position().y(), body.position().z()],
                velocity: [v.x(), v.y(), v.z()], ahead: lead }; }
        });
    });
Smoke.scenario("sleeppowder", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.weather("clear");
    stage.time("night");
    var caster = stage.pokemon({ species: "oddish", level: 38, moves: ["sleeppowder"], at: [-3, 0, 0] });
    var target = stage.mob({ type: "minecraft:husk", at: [4, 0, 0] });
    var second = stage.mob({ type: "minecraft:husk", at: [4, 0, 1.4] });
    sourceRef = caster.ref; targets = [target.ref, second.ref]; aimedAhead = false; pointCast = false; sample = null;
    stage.setPp(caster, "sleeppowder", 0);
    stage.command("effect give " + target.ref.split("/")[0] + " minecraft:slowness 30 1 true");
    stage.command("effect give " + second.ref.split("/")[0] + " minecraft:slowness 30 1 true");
    stage.hostile(caster, target);
    stage.hostile(caster, second);
    stage.after(20, function () { stage.setPp(caster, "sleeppowder", 15); });
    stage.until(1600, function () {
        return stage.casts("sleeppowder", caster) > 0 && (stage.hadMobEffect(target, "world_combat:status/sleep") || stage.hadMobEffect(second, "world_combat:status/sleep"));
    }, function () {
        stage.expect(stage.casts("sleeppowder", caster) > 0, "sleep powder was committed");
        stage.expect(stage.hadMobEffect(target, "world_combat:status/sleep") || stage.hadMobEffect(second, "world_combat:status/sleep"), "a target entering the cloud fell asleep");
        stage.expect(pointCast && aimedAhead, "the AI cast to a real moving enemy's forward route as a point");
        stage.note("AI 使用敌人的真实速度在前路点选抛粉；粉团仍按原有首次碰撞/飞尽生云。此次记录证明前路点选、移动目标后来获得睡眠；各片云的积累过程见轨迹。", {
            casts: stage.casts("sleeppowder", caster),
            targetHp: Math.round(target.health() * 10) / 10,
            leadSample: sample,
            travelled: Math.round(stage.travelled(target) * 10) / 10
        });
        stage.done();
    }, "the cloud puts the target standing in it to sleep");
});
}
