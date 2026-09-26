/**
 * 落石 / rockthrow —— 可执行设计说明。
 *
 * 一句话：从脚边地上抄起一块小石，平直快速甩向目标；一块石头一次伤害，砸中崩出石屑。
 *
 * 场面：已选高抛的隆隆石与站定蠹虫隔一条固定厚雪矮墙，有真实攻击关系；直线看不到目标。
 * 必然事实：AI 保留既选高抛，向真实弧线可达的墙后落点投石并命中，墙仍完整。
 */
namespace RockthrowLobScenario {
    var sourceRef = "", targetRef = "", occludedAtCast = false, pointAtCast = false;
    var activeStage: Smoke.Stage | null = null, diagnosed = false;
    CompanionBehavior.registry.goal({ id: "checks:rockthrow/ai-facts", propose: function (context) {
        if (!activeStage || diagnosed || !sourceRef || context.actor.indexOf(sourceRef) !== 0) return [];
        const item = context.capabilities.filter(function (value) { return value.data.move === "rockthrow" && value.data.config.lob; })[0];
        if (!item) return [];
        const self = CompanionBehavior.source(context);
        const target = (context.facts.nearby as CompanionBehavior.Entity[]).filter(function (value) { return value.ref.indexOf(targetRef) === 0; })[0]
            || WorldMethods.find(context, self.attacking || String(context.facts.focus || ""));
        if (!target) { activeStage.note("known target not in current observation", { attacking: self.attacking, focus: context.facts.focus }); diagnosed = true; return []; }
        const rule = CompanionBehavior.uses.get("rockthrow")!;
        const plan = rule.approachTarget!(context, item, target), world = CompanionBehavior.world(context);
        const facts: PokemonSkills.FactContext = { world: world, actor: world.source(), detail: { values: item.data.config } };
        activeStage.note("native AI cast facts at the unchanged obstacle", { origin: self.point, point: target.point, visible: target.visible,
            attacking: self.attacking, targetAttacking: target.attacking, sourceRef: self.ref, targetRef: target.ref,
            range: item.data.range, ready: item.data.ready, available: rule.available!(context, item, "attack", target),
            accepts: rule.accepts!(context, item, target), arcReady: plan !== null && plan.ref === self.ref,
            speed: PokemonSkills.p("rockthrow", "velocity", facts), gravity: PokemonSkills.p("rockthrow", "arc", facts),
            wall: String(world.block(WorldCombat.point(0, -60, 0))!.state()) });
        diagnosed = true; return [];
    } });
    WorldCombat.on("checks:rockthrow/lob-cast", "world_combat:committed", "", function (event) {
        const action = event.action();
        if (!action || String(action.content()) !== "world_combat:rockthrow" || String(event.actor().ref()).indexOf(sourceRef) !== 0) return;
        const world = event.world(), target = world.query(action.origin(), 16, false).filter(function (actor) {
            return String(actor.ref()).indexOf(targetRef) === 0;
        })[0], body = target && world.observe(target);
        if (body) occludedAtCast = occludedAtCast || !body.visible();
        pointAtCast = pointAtCast || action.target() === null;
    });
Smoke.scenario("rockthrow", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.fill([-8, 0, -8], [8, 2, 8], "minecraft:air");
    stage.time("day");
    stage.weather("clear");
    stage.fill([0, 0, -5], [0, 0, 5], "minecraft:snow[layers=4]");
    var caster = stage.pokemon({ species: "geodude", level: 40, moves: ["rockthrow"], at: [-3.5, 0, 0] });
    var foe = stage.mob({ type: "minecraft:silverfish", at: [3.5, 0, 0] });
    sourceRef = caster.ref; targetRef = foe.ref; occludedAtCast = false; pointAtCast = false;
    activeStage = stage; diagnosed = false;
    stage.noai(foe);
    stage.after(2, function () {
        stage.prefer(caster, "rockthrow", { lob: true });
        stage.hostile(caster, foe);
    });
    stage.until(700, function () {
        return stage.casts("rockthrow", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("rockthrow", caster) > 0, "geodude committed rock throw");
        stage.expect(stage.damageTo(foe) > 0, "the small stone dealt damage to the foe");
        stage.expect(occludedAtCast && pointAtCast, "the selected lob cast used a point behind native line-of-sight cover");
        stage.expect(stage.blockAt([0, 0, 0]) === "minecraft:snow", "the original low wall stayed in place");
        stage.note("stone power/scatter/arc follow Attack/Speed/weight/level and the lob choice; the throw does not home, so a moving target can slip it", {
            casts: stage.casts("rockthrow", caster),
            damage: Math.round(stage.damageTo(foe) * 10) / 10,
            occludedAtCast: occludedAtCast, pointAtCast: pointAtCast,
            foeAlive: foe.alive()
        });
        stage.done();
    }, "rock throw commits and lands within 35 s");
});
}
