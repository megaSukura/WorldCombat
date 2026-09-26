/** Native-world probes call this unit's real Use.target; they do not submit extra moves or alter its budgets. */
let grasspledgeAiProbe: ((action: CombatAction) => void) | null = null;
let grasspledgeAiLead = false, grasspledgeAiWall = false, grasspledgeAiPlain = false;
WorldCombat.on("world_combat:checks/grasspledge_placement", "world_combat:committed", "", function (event) {
    const action = event.action();
    if (!action || action.content() !== "world_combat:grasspledge" || !grasspledgeAiProbe) return;
    const probe = grasspledgeAiProbe; grasspledgeAiProbe = null; probe(action);
});

/**
 * 草之誓约 / grasspledge 的可执行设计说明。
 *
 * 场面：一只会草之誓约的草系（Bulbasaur）隔着 5 格对一只低等级对手开战。
 * 必然事实：本招被提交过；草柱造成过伤害；目标被拖慢（`minecraft:slowness`）。
 * 命中几个、暴击、缠住时长、誓约印停留与共鸣（需另一元素的誓约印在附近，单招场景里造不出）写进 note。
 * 草柱不再替换地表方块，柱脚盘根只由粒子表达，故不再断言 changedBlocks。
 */
Smoke.scenario("grasspledge", function (stage) {
    stage.fill([-9, -1, -9], [9, -1, 9], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Bulbasaur", level: 42, moves: ["grasspledge"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "Rattata", level: 30, moves: ["splash"], at: [2, 0, 0] });
    grasspledgeAiLead = false; grasspledgeAiWall = false; grasspledgeAiPlain = false;
    grasspledgeAiProbe = function (action) {
        const world = action.world(), victim = world.query(action.origin(), 16, false).filter(function (actor) { return String(actor.ref()).indexOf(foe.ref) === 0; })[0];
        if (!victim) return;
        const body = world.observe(victim); if (!body) return;
        const previous = body.velocity(), at = body.position(), feet = at.y() - body.height() / 2;
        const use = CompanionBehavior.uses.get("grasspledge"); if (!use || !use.target) return;
        function selection(): { point: number[]; score: number } | null {
            const frame = CompanionBehavior.frame(world, CobblemonCombat.pokemon(action.actor()), "autonomous", action.origin(), null, null, victim, 16, "", function () { return false; }, function () { });
            const context = frame as WorldBehavior.Context;
            context.senses = {}; context.scratch = {}; context.memory = {}; context.registry = CompanionBehavior.registry;
            context.active = null; context.suspended = []; context.choice = null;
            const item = frame.capabilities.filter(function (entry) { return entry.data.move === "grasspledge"; })[0];
            const target = (frame.facts.nearby as CompanionBehavior.Entity[]).filter(function (entry) { return entry.ref.indexOf(foe.ref) === 0; })[0];
            if (!item || !target) return null;
            const chosen = use!.target!(context, item, target);
            return chosen ? { point: chosen.point, score: use!.priority ? use!.priority(context, item, target) : 0 } : null;
        }
        world.motion(victim, WorldCombat.point(0, 0, 0.12), false);
        const leading = selection();
        grasspledgeAiLead = !!leading && leading.point[2] > at.z() + 0.15 && Math.abs(leading.point[1] - feet) < 0.08;
        const x = Math.floor(at.x()), z = Math.floor(at.z()) + 1, y = Math.floor(feet);
        const previousBlocks: string[] = [];
        for (let dy = 0; dy < 4; dy++) {
            const block = world.block(WorldCombat.point(x, y + dy, z)); previousBlocks.push(block ? block.blockState() : "minecraft:air");
            stage.command("setblock " + x + " " + (y + dy) + " " + z + " minecraft:stone");
        }
        world.motion(victim, WorldCombat.point(0, 0, 0.6), false);
        const blocked = selection();
        grasspledgeAiWall = !!blocked && Math.abs(blocked.point[2] - at.z()) < 0.05;
        for (let dy = 0; dy < 4; dy++) stage.command("setblock " + x + " " + (y + dy) + " " + z + " " + previousBlocks[dy]);
        world.motion(victim, previous, false);
        stage.note("native AI point probes", { leading: grasspledgeAiLead, wallFallback: grasspledgeAiWall, ordinaryPoint: grasspledgeAiPlain });
    };
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("grasspledge", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(10, function () {
            stage.expect(stage.casts("grasspledge", caster) > 0, "grasspledge was committed");
            stage.expect(grasspledgeAiWall, "the AI rejects a predicted point beyond a real wall and keeps the current reachable foot point");
            stage.expect(grasspledgeAiLead, "the grass AI selects a supported short point ahead of native target velocity");
            stage.expect(stage.damageTo(foe) > 0, "the grass pillar dealt damage");
            stage.expect(stage.hadMobEffect(foe, "minecraft:slowness"), "the pillar entangled and slowed the target");
            stage.note("草柱命中与拖慢是必然；命中几个、暴击、缠住时长、誓约印停留与共鸣由局面决定。单草印只是短寿共鸣标记、本身不拖慢，共鸣需要另一元素（火／水）的誓约印在落点附近，单招场景里无法合法制造，故不在此断言；柱脚盘根只由粒子表达，不再替换地表方块", {
                casts: stage.casts("grasspledge", caster),
                foeDamage: Math.round(stage.damageTo(foe) * 10) / 10,
                slowed: stage.hadMobEffect(foe, "minecraft:slowness")
            });
            grasspledgeAiProbe = null; stage.done();
        });
    }, "grasspledge entangles its target");
});
