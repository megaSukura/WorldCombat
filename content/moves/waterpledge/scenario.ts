/** Native-world probes call this unit's real Use.target; they do not submit extra moves or alter its budgets. */
let waterpledgeAiProbe: ((action: CombatAction) => void) | null = null;
let waterpledgeAiLead = false, waterpledgeAiWall = false, waterpledgeAiPlain = false;
WorldCombat.on("world_combat:checks/waterpledge_placement", "world_combat:committed", "", function (event) {
    const action = event.action();
    if (!action || action.content() !== "world_combat:waterpledge" || !waterpledgeAiProbe) return;
    const probe = waterpledgeAiProbe; waterpledgeAiProbe = null; probe(action);
});

/**
 * 水之誓约 / waterpledge 的可执行设计说明。
 *
 * 场面：一只会水之誓约的水系（Squirtle）隔着 5 格对一只稍高等级的对手开战，逼出「水柱涌起、把目标推开顶起、
 *   柱脚浸出短印」这一幕。
 * 必然事实：本招被提交过；水柱造成过伤害；目标被水势推动了。单水不再施加拖慢（拖慢只在共鸣湿地），
 *   也不替换地表方块；命中几个、暴击、推开多远、誓约印停留与共鸣写进 note。
 */
Smoke.scenario("waterpledge", function (stage) {
    stage.fill([-9, -1, -9], [9, -1, 9], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Squirtle", level: 42, moves: ["waterpledge"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "Rattata", level: 30, moves: ["splash"], at: [2, 0, 0] });
    waterpledgeAiLead = false; waterpledgeAiWall = false; waterpledgeAiPlain = false;
    waterpledgeAiProbe = function (action) {
        const world = action.world(), victim = world.query(action.origin(), 16, false).filter(function (actor) { return String(actor.ref()).indexOf(foe.ref) === 0; })[0];
        if (!victim) return;
        const body = world.observe(victim); if (!body) return;
        const previous = body.velocity(), at = body.position(), feet = at.y() - body.height() / 2;
        const use = CompanionBehavior.uses.get("waterpledge"); if (!use || !use.target) return;
        function selection(): { point: number[]; score: number } | null {
            const frame = CompanionBehavior.frame(world, CobblemonCombat.pokemon(action.actor()), "autonomous", action.origin(), null, null, victim, 16, "", function () { return false; }, function () { });
            const context = frame as WorldBehavior.Context;
            context.senses = {}; context.scratch = {}; context.memory = {}; context.registry = CompanionBehavior.registry;
            context.active = null; context.suspended = []; context.choice = null;
            const item = frame.capabilities.filter(function (entry) { return entry.data.move === "waterpledge"; })[0];
            const target = (frame.facts.nearby as CompanionBehavior.Entity[]).filter(function (entry) { return entry.ref.indexOf(foe.ref) === 0; })[0];
            if (!item || !target) return null;
            const chosen = use!.target!(context, item, target);
            return chosen ? { point: chosen.point, score: use!.priority ? use!.priority(context, item, target) : 0 } : null;
        }
        world.motion(victim, WorldCombat.point(0, 0, 0.12), false);
        const ordinary = selection();
        waterpledgeAiPlain = !!ordinary && Math.abs(ordinary.point[2] - at.z()) < 0.05;
        // Both pledge units are supplied in the targeted batch; a standalone water run records only its ordinary branch.
        if (WorldEffects.hasFieldRule("world_combat:field/pledge_grass")) {
            const detect = PokemonSkills.p("waterpledge", "comboDetect", world);
            WorldEffects.field(world, "world_combat:field/pledge_grass", WorldCombat.point(at.x(), feet + 0.02, at.z() + detect + 0.3), 1,
                { element: "grass", root: 30, slow: 60, marks: 8 }, 200);
            const leading = selection();
            waterpledgeAiLead = !!leading && leading.point[2] > at.z() + 0.15 && Math.abs(leading.point[1] - feet) < 0.08
                && !!ordinary && leading.score > ordinary.score;
        }
        const x = Math.floor(at.x()), z = Math.floor(at.z()) + 1, y = Math.floor(feet);
        const previousBlocks: string[] = [];
        for (let dy = 0; dy < 4; dy++) {
            const block = world.block(WorldCombat.point(x, y + dy, z)); previousBlocks.push(block ? block.blockState() : "minecraft:air");
            stage.command("setblock " + x + " " + (y + dy) + " " + z + " minecraft:stone");
        }
        world.motion(victim, WorldCombat.point(0, 0, 0.6), false);
        const blocked = selection();
        waterpledgeAiWall = !!blocked && Math.abs(blocked.point[2] - at.z()) < 0.05;
        for (let dy = 0; dy < 4; dy++) stage.command("setblock " + x + " " + (y + dy) + " " + z + " " + previousBlocks[dy]);
        world.motion(victim, previous, false);
        stage.note("native AI point probes", { leading: waterpledgeAiLead, wallFallback: waterpledgeAiWall, ordinaryPoint: waterpledgeAiPlain });
    };
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("waterpledge", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(12, function () {
            stage.expect(stage.casts("waterpledge", caster) > 0, "waterpledge was committed");
            stage.expect(waterpledgeAiWall, "the AI rejects a predicted point beyond a real wall and keeps the current reachable foot point");
            stage.expect(waterpledgeAiPlain, "ordinary water retains the immediate push point");
            if (WorldEffects.hasFieldRule("world_combat:field/pledge_grass"))
                stage.expect(waterpledgeAiLead, "an actual grass seal makes water prefer a supported wetland point across the native short route");
            stage.expect(stage.damageTo(foe) > 0, "the water pillar dealt damage");
            stage.expect(stage.travelled(foe) > 0, "the surge pushed the target");
            stage.note("水柱命中与推开是必然；命中几个、暴击、推开多远、誓约印停留与共鸣由局面决定。单水不施加拖慢（拖慢只在共鸣湿地）、也不替换地表方块；共鸣需要另一元素（火／草）的誓约印在落点附近，单招场景里无法合法制造，故不在此断言", {
                casts: stage.casts("waterpledge", caster),
                foeDamage: Math.round(stage.damageTo(foe) * 10) / 10,
                travelled: Math.round(stage.travelled(foe) * 10) / 10
            });
            waterpledgeAiProbe = null; stage.done();
        });
    }, "waterpledge surges on its target");
});
