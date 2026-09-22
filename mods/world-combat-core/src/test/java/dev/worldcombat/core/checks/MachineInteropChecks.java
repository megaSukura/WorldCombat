package dev.worldcombat.core.checks;

import dev.worldcombat.core.runtime.*;
import dev.worldcombat.core.world.*;
import net.minecraft.core.*;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.MinecraftServer;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.level.GameRules;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.LeverBlock;
import net.neoforged.neoforge.capabilities.*;
import net.neoforged.neoforge.common.NeoForge;
import net.neoforged.neoforge.energy.EnergyStorage;
import net.neoforged.neoforge.event.entity.player.PlayerInteractEvent;
import java.util.function.Consumer;

/** Neutral external-capability fixture plus the optional, actual Create block. Never shipped. */
public final class MachineInteropChecks {
    private static boolean done;
    private static void require(boolean test, String message) { TestWorld.require(test, message); }
    public static void tick(MinecraftServer server) {
        if (done || !CombatServices.CONTENT.ready()) return;
        done = true;
        try {
            var level = TestWorld.prepare(server);
            var combat = CombatServices.get(server);
            var actor = combat.bind(TestWorld.mob(EntityType.COW, level, 2));
            var world = new WorldAccess(combat.runtime(), actor, null, () -> {}, true, 0);
            var pos = new BlockPos(4, 100, 2); var point = new Point(4.5, 100.5, 2.5);
            level.setBlockAndUpdate(pos, Blocks.GOLD_BLOCK.defaultBlockState());
            var capacity = new EnergyStorage(100, 40, 20);
            var constructor = RegisterCapabilitiesEvent.class.getDeclaredConstructor(); constructor.setAccessible(true);
            constructor.newInstance().registerBlock(Capabilities.EnergyStorage.BLOCK,
                (l, p, state, be, side) -> side == Direction.EAST ? capacity : null, Blocks.GOLD_BLOCK);
            var observation = world.energy(point, "auto");
            require(observation != null && observation.side().equals("east") && observation.capacity() == 100, "Sided external FE provider missing");
            require(world.energy(point, "west") == null, "Wrong face accessed FE");
            require(world.receiveEnergy(point, "auto", 70, true) == 40 && capacity.getEnergyStored() == 0, "Simulation mutated FE or bypassed transfer rate");
            require(world.receiveEnergy(point, "auto", 70, false) == 40 && capacity.getEnergyStored() == 40, "Real transfer did not conserve accepted FE");
            world.receiveEnergy(point, "east", 70, false);
            require(world.receiveEnergy(point, "east", 70, false) == 20 && world.receiveEnergy(point, "east", 70, false) == 0, "Full capacity not honored");
            Consumer<PlayerInteractEvent.RightClickBlock> protection = event -> { if (event.getPos().equals(pos)) event.setCanceled(true); };
            capacity.extractEnergy(20, false);
            NeoForge.EVENT_BUS.addListener(protection);
            try { require(world.receiveEnergy(point, "auto", 20, false) == 0 && capacity.getEnergyStored() == 80, "Protected FE transfer proceeded"); }
            finally { NeoForge.EVENT_BUS.unregister(protection); }
            server.getGameRules().getRule(GameRules.RULE_MOBGRIEFING).set(false, server);
            require(world.receiveEnergy(point, "auto", 20, false) == 0, "Unowned entity ignored mobGriefing");
            server.getGameRules().getRule(GameRules.RULE_MOBGRIEFING).set(true, server);
            level.setBlockAndUpdate(pos, Blocks.AIR.defaultBlockState());
            require(world.energy(point, "auto") == null && world.receiveEnergy(point, "auto", 20, false) == 0, "Removed provider remained cached");
            var far = new Point(100000.5, 100, 100000.5); var farPos = BlockPos.containing(far.x(), far.y(), far.z());
            require(!level.hasChunkAt(farPos) && NativeEnergy.read(combat, actor, far, "auto") == null && !level.hasChunkAt(farPos), "Capability query loaded a chunk");

            level.setBlockAndUpdate(pos, Blocks.LEVER.defaultBlockState());
            var facts = world.block(point);
            require(world.interactBlock(point, "up", false, facts.state()).equals("used") && level.getBlockState(pos).getValue(LeverBlock.POWERED), "Native block default fallback did not operate lever");
            require(world.interactBlock(point, "up", false, facts.state()).equals("state-changed"), "Stale block state was accepted");
            NeoForge.EVENT_BUS.addListener(protection);
            try { require(world.interactBlock(point, "up", false, world.block(point).state()).equals("protected-area") && level.getBlockState(pos).getValue(LeverBlock.POWERED), "Protected block interaction proceeded"); }
            finally { NeoForge.EVENT_BUS.unregister(protection); }

            var crank = BuiltInRegistries.BLOCK.getOptional(ResourceLocation.parse("create:hand_crank"));
            if (Boolean.getBoolean("worldcombat.check.create")) require(crank.isPresent(), "Requested Create integration is not installed");
            if (crank.isPresent()) {
                level.setBlockAndUpdate(pos, crank.get().defaultBlockState().setValue(net.minecraft.world.level.block.state.properties.BlockStateProperties.FACING, Direction.UP));
                var blockEntity = level.getBlockEntity(pos);
                require(blockEntity != null, "Create crank block entity missing");
                Consumer<PlayerInteractEvent.RightClickBlock> receipt = event -> System.out.println("P1CHECK native interaction event: cancelled=" + event.isCanceled() + ", result=" + event.getCancellationResult() + ", block=" + event.getUseBlock());
                NeoForge.EVENT_BUS.addListener(net.neoforged.bus.api.EventPriority.LOWEST, true, PlayerInteractEvent.RightClickBlock.class, receipt);
                var used = world.interactBlock(point, "up", false, world.block(point).state());
                NeoForge.EVENT_BUS.unregister(receipt);
                require(used.equals("used"), "Actual Create crank did not consume native useItemOn(EMPTY): " + used);
                var speed = blockEntity.getClass().getMethod("getGeneratedSpeed");
                float forward = ((Number) speed.invoke(blockEntity)).floatValue();
                require(forward != 0, "Actual Create crank did not generate rotation");
                require(world.interactBlock(point, "up", true, world.block(point).state()).equals("used"), "Create reverse interaction failed");
                float reverse = ((Number) speed.invoke(blockEntity)).floatValue();
                require(reverse == -forward, "Shift did not reverse actual Create crank speed");
                System.out.println("P1CHECK actual Create crank native forward/reverse: " + forward + "/" + reverse);
            }
            System.out.println("P1CHECK PASS native machines: sided FE, simulation, transfer limits, full capacity, permissions, removal, unloaded chunks, default interaction and installed Create crank");
        } catch (Throwable error) { error.printStackTrace(); System.out.println("P1CHECK FAIL native machines: " + error); }
    }
}
