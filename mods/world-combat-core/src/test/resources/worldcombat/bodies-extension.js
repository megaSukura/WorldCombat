// Test-only content and harness for persistent bodies, run on the compiled core with the mechanisms profile.
// A body is summoned by an action, places a lasting block from its brain, reports player interaction to its brain,
// keeps a periodic tick, survives its summoner leaving, can be launched, and leaves when dismissed.
WorldBodies.define("checks:totem", {
    start: function (brain) {
        var state = JSON.parse(brain.state()), world = brain.world();
        state.placed = world.placeBlock(WorldCombat.point(state.at[0], state.at[1], state.at[2]), "minecraft:ice", "{}");
        // The chest beside the ice belongs to the player: every lasting write against it must come back refused.
        var chest = WorldCombat.point(state.at[0] + 1, state.at[1], state.at[2]);
        state.chestBreak = world.breakBlock(chest, true);
        state.chestReplace = world.placeBlock(chest, "minecraft:stone", JSON.stringify({ replace: true }));
        state.chestData = world.setBlockData(chest, JSON.stringify({ Items: [] }));
        state.chestInsert = world.insertItem(chest, "minecraft:stick", 3);
        state.ticks = 0; state.clicks = 0; state.touches = 0;
        brain.state(JSON.stringify(state));
    },
    tick: { every: 5, handler: function (brain) { var state = JSON.parse(brain.state()); state.ticks++; brain.state(JSON.stringify(state)); } },
    interact: function (brain, player, input) {
        var state = JSON.parse(brain.state()); state.clicks++; state.lastItem = input.item; state.by = String(player.ref()); brain.state(JSON.stringify(state)); return true;
    },
    touch: function (brain) { var state = JSON.parse(brain.state()); state.touches++; brain.state(JSON.stringify(state)); },
    operations: { "checks:rename": function (brain) { brain.world().configure(brain.target(), JSON.stringify({ name: JSON.parse(brain.input()).name })); } }
});
WorldCombat.registerAction("checks:summon_totem", "bodies-extension", 40, "point", 16, function (action) {
    action.commit(1);
    var world = action.world(), point = action.targetPosition();
    // Leased ice that lingers after this action finishes (and after the summoner is gone), then fades on its own.
    // Beside it a scoped lease of the same length: it goes away with the action.
    world.terrain(JSON.stringify({ cells: [{ x: 7, y: 100, z: 4, block: "minecraft:ice" }], linger: true }), 14);
    world.terrain(JSON.stringify({ cells: [{ x: 7, y: 100, z: 5, block: "minecraft:ice" }] }), 14);
    // A lingering gap in a stone wall: it must not close on the cow that will be standing in it when the lease runs out.
    world.terrain(JSON.stringify({ cells: [{ x: 7, y: 100, z: 7, block: "minecraft:air" }], replace: true, linger: true }), 14);
    var body = WorldBodies.spawn(world, point, { appearance: { block: "minecraft:amethyst_block", spin: true }, size: [0.8, 1.6], health: 40, gravity: true, name: "Totem" },
        "checks:totem", { at: [Math.floor(point.x()) + 2, Math.floor(point.y()), Math.floor(point.z())] }, 6000);
    world.configure(body, JSON.stringify({ knockbackResistance: 1 }));
    action.finish();
});
var bodiesAge = 0, bodiesDone = false, bodiesSummoner, bodiesBystander, bodiesLevel, bodiesEntity, bodiesHandle, bodiesBrain, bodiesY;
ServerEvents.tick(function (event) {
    if (bodiesDone) return;
    var Test = Java.loadClass("dev.worldcombat.core.checks.TestWorld");
    var Services = Java.loadClass("dev.worldcombat.core.world.CombatServices");
    var Types = Java.loadClass("net.minecraft.world.entity.EntityType");
    var Bodies = Java.loadClass("dev.worldcombat.core.world.ScriptedBody");
    var AABB = Java.loadClass("net.minecraft.world.phys.AABB");
    var BlockPos = Java.loadClass("net.minecraft.core.BlockPos");
    var Blocks = Java.loadClass("net.minecraft.world.level.block.Blocks");
    try {
        var combat = Services.get(event.server);
        var state = function () { return JSON.parse(combat.runtime().effects().state(bodiesBrain)); };
        var bodies = function () { return bodiesLevel.getEntitiesOfClass(Bodies, new AABB(-4, 95, -4, 24, 110, 10)); };
        if (++bodiesAge === 1) {
            bodiesLevel = Test.prepare(event.server);
            bodiesSummoner = Test.mob(Types.COW, bodiesLevel, 2);
            bodiesLevel.setBlock(new BlockPos(9, 100, 2), Blocks.CHEST.defaultBlockState(), 3);
            bodiesLevel.setBlock(new BlockPos(7, 100, 7), Blocks.STONE.defaultBlockState(), 3);
            var Targets = Java.loadClass("dev.worldcombat.core.runtime.ActionTarget");
            var Point = Java.loadClass("dev.worldcombat.core.runtime.Point");
            combat.runtime().start("checks:summon_totem", combat.bind(bodiesSummoner), Targets.point(new Point(6, 100, 2), new Point(1, 0, 0)), null, Java.loadClass("java.util.Collections").emptyMap());
        }
        if (bodiesAge === 3) {
            var found = bodies();
            Test.require(found.size() === 1, "Expected one summoned body, found " + found.size());
            bodiesEntity = found.get(0); bodiesHandle = combat.bind(bodiesEntity);
            var info = JSON.parse(combat.bodies().info(bodiesHandle));
            Test.require(info.definition === "checks:totem" && info.brain > 0, "Body lacks its brain: " + JSON.stringify(info));
            bodiesBrain = info.brain;
            Test.require(bodiesEntity.getMaxHealth() === 40 && Math.abs(bodiesEntity.getBbWidth() - 0.8) < 0.01 && Math.abs(bodiesEntity.getBbHeight() - 1.6) < 0.01, "Body configuration was not applied");
            Test.require(bodiesEntity.hasCustomName() && bodiesEntity.getCustomName().getString() === "Totem", "Body name missing");
            Test.require(bodiesLevel.getBlockState(new BlockPos(8, 100, 2)).getBlock() === Blocks.ICE, "Brain start did not place a lasting block: " + state().placed);
            Test.require(bodiesLevel.getBlockState(new BlockPos(9, 100, 2)).getBlock() === Blocks.CHEST, "A lasting write reached the player's chest: " + JSON.stringify(state()));
            Test.require(state().chestBreak === "block-entity" && state().chestReplace === "block-entity" && state().chestData === "container" && state().chestInsert === 3, "Property guards did not answer as documented: " + JSON.stringify(state()));
            Test.require(combat.runtime().stats().instances() === 0, "Summoning action did not finish");
            Test.require(bodiesLevel.getBlockState(new BlockPos(7, 100, 4)).getBlock() === Blocks.ICE, "Lingering lease did not outlive its action");
            Test.require(bodiesLevel.getBlockState(new BlockPos(7, 100, 5)).isAir(), "Scoped lease outlived its action");
            Test.require(bodiesLevel.getBlockState(new BlockPos(7, 100, 7)).isAir(), "Gap lease did not open the wall");
            bodiesBystander = Test.mob(Types.COW, bodiesLevel, 7.5); bodiesBystander.setPos(7.5, 100, 7.5); bodiesBystander.setNoAi(true);
            var Hand = Java.loadClass("net.minecraft.world.InteractionHand");
            var Fake = Java.loadClass("net.neoforged.neoforge.common.util.FakePlayerFactory");
            var Profile = Java.loadClass("com.mojang.authlib.GameProfile");
            var player = Fake.get(bodiesLevel, new Profile(Java.loadClass("java.util.UUID").randomUUID(), "BodyTester"));
            player.setPos(6, 100, 3); bodiesLevel.addFreshEntity(player);
            player.setItemInHand(Hand.MAIN_HAND, new (Java.loadClass("net.minecraft.world.item.ItemStack"))(Java.loadClass("net.minecraft.world.item.Items").STICK));
            var result = bodiesEntity.interact(player, Hand.MAIN_HAND);
            Test.require(result.consumesAction(), "Consumed interaction was not reported to the host: " + result);
            var after = state();
            Test.require(after.clicks === 1 && after.lastItem === "minecraft:stick" && after.by === String(combat.bind(player).ref()), "Interaction did not reach the brain: " + JSON.stringify(after));
            player.discard();
            bodiesSummoner.discard();
        }
        if (bodiesAge === 12) {
            Test.require(bodiesLevel.getBlockState(new BlockPos(7, 100, 4)).getBlock() === Blocks.ICE, "Lingering lease faded early or with its summoner");
            Test.require(bodies().size() === 1 && !bodiesEntity.isRemoved(), "Body did not survive its summoner leaving");
            Test.require(combat.runtime().effects().exists(bodiesBrain), "Brain did not survive the summoner leaving");
            Test.require(state().ticks >= 1, "Periodic tick did not run: " + JSON.stringify(state()));
            bodiesY = bodiesEntity.getY();
            var Point2 = Java.loadClass("dev.worldcombat.core.runtime.Point");
            Test.require(combat.motion(bodiesHandle, new Point2(0, 0.6, 0), false), "Motion refused");
        }
        if (bodiesAge === 14) {
            Test.require(bodiesEntity.getY() > bodiesY + 0.3, "Motion did not move the body: " + bodiesY + " -> " + bodiesEntity.getY());
            Test.require(combat.bodies().dismiss(bodiesHandle, bodiesHandle), "Body refused to dismiss itself");
        }
        if (bodiesAge === 20) {
            Test.require(bodiesLevel.getBlockState(new BlockPos(7, 100, 7)).getBlock() === Blocks.STONE, "Wall did not close once the gap was clear");
            bodiesDone = true; console.info("P4CHECK PASS script-only bodies: summon, brain start placed a block, lingering lease, safe restore, property guards, interaction reached the brain, periodic tick, survived summoner, motion, dismiss");
        }
        if (bodiesAge === 17) {
            Test.require(bodies().size() === 0, "Dismissed body is still present");
            Test.require(!combat.runtime().effects().exists(bodiesBrain), "Dismissed brain still exists");
            Test.require(bodiesLevel.getBlockState(new BlockPos(8, 100, 2)).getBlock() === Blocks.ICE, "Lasting block vanished with the body");
            Test.require(combat.runtime().effects().stats().active() === 0, "Effects leaked after dismissal");
            Test.require(bodiesLevel.getBlockState(new BlockPos(7, 100, 4)).isAir(), "Lingering lease did not fade on its timer");
            Test.require(bodiesLevel.getBlockState(new BlockPos(7, 100, 7)).isAir(), "Wall closed on the cow standing in the gap");
            bodiesBystander.discard();

        }
    } catch (error) { bodiesDone = true; console.error("P4CHECK FAIL script-only bodies " + error); }
});
