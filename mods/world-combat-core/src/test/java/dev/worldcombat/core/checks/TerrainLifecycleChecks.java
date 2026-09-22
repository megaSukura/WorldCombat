package dev.worldcombat.core.checks;

import com.mojang.authlib.GameProfile;
import dev.worldcombat.core.runtime.ActorHandle;
import dev.worldcombat.core.runtime.Point;
import dev.worldcombat.core.world.*;
import net.minecraft.core.BlockPos;
import net.minecraft.core.HolderLookup;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.ExperienceOrb;
import net.minecraft.world.entity.animal.Cow;
import net.minecraft.world.entity.item.ItemEntity;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.Items;
import net.minecraft.world.level.GameType;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.saveddata.SavedData;
import net.minecraft.world.phys.AABB;
import net.neoforged.bus.api.EventPriority;
import net.neoforged.neoforge.common.NeoForge;
import net.neoforged.neoforge.common.util.BlockSnapshot;
import net.neoforged.neoforge.common.util.FakePlayerFactory;
import net.neoforged.neoforge.event.level.BlockEvent;

import java.util.List;
import java.util.UUID;

/** Native lifecycle regression fixture, independent of authored moves and visual content. */
public final class TerrainLifecycleChecks {
    private static boolean done, started;
    private static long expires;
    private static BlockPos blockedBreak, blockedPlace;
    private static ActorHandle actor;
    private static final BlockPos CELL = new BlockPos(10, 99, 4);
    private static final AABB AREA = new AABB(8, 98, 3, 15, 103, 6);

    public static void tick(MinecraftServer server) {
        if (done) return;
        try {
            var combat = CombatServices.get(server); var level = server.overworld();
            if (!started) {
                started = true;
                TestWorld.prepare(server);
                Cow source = TestWorld.mob(EntityType.COW, level, 2);
                actor = combat.bind(source);
                var player = FakePlayerFactory.get(level, new GameProfile(UUID.randomUUID(), "TerrainChecker"));
                player.moveTo(8, 100, 4, 0, 0);
                player.gameMode.changeGameModeForPlayer(GameType.SURVIVAL);
                player.setItemInHand(InteractionHand.MAIN_HAND, new ItemStack(Items.DIAMOND_PICKAXE));
                NeoForge.EVENT_BUS.addListener(EventPriority.LOWEST, (BlockEvent.BreakEvent event) -> {
                    if (event.getPos().equals(blockedBreak)) event.setCanceled(true);
                });
                NeoForge.EVENT_BUS.addListener(EventPriority.LOWEST, (BlockEvent.EntityPlaceEvent event) -> {
                    if (event.getPos().equals(blockedPlace)) event.setCanceled(true);
                });

                // Actual survival mining must recover the original state without duplicating ore or experience.
                reset(level);
                lease(combat, CELL, "minecraft:diamond_ore", 200);
                TestWorld.require(player.gameMode.destroyBlock(CELL), "Native survival break failed");
                combat.effects().tick();
                stone(level, "Mining temporary terrain lost the original block");
                TestWorld.require(level.getEntitiesOfClass(ItemEntity.class, AREA).isEmpty(), "Temporary terrain dropped items");
                TestWorld.require(level.getEntitiesOfClass(ExperienceOrb.class, AREA).isEmpty(), "Temporary terrain dropped experience");
                var ordinary = CELL.east(2); level.setBlockAndUpdate(ordinary, Blocks.DIAMOND_ORE.defaultBlockState());
                TestWorld.require(player.gameMode.destroyBlock(ordinary), "Native neighbouring mining failed");
                TestWorld.require(!level.getEntitiesOfClass(ItemEntity.class, AREA).isEmpty(), "Normal mining lost its items");
                TestWorld.require(!level.getEntitiesOfClass(ExperienceOrb.class, AREA).isEmpty(), "Normal mining lost its experience");
                level.getEntitiesOfClass(ItemEntity.class, AREA).forEach(e -> e.discard());
                level.getEntitiesOfClass(ExperienceOrb.class, AREA).forEach(e -> e.discard());

                reset(level);
                long cancelled = lease(combat, CELL, "minecraft:clay", 200);
                blockedBreak = CELL;
                TestWorld.require(!player.gameMode.destroyBlock(CELL), "Protection cancellation did not stop mining");
                blockedBreak = null; combat.effects().tick();
                TestWorld.require(level.getBlockState(CELL).is(Blocks.CLAY), "Cancelled mining changed the cover");
                combat.effects().remove(actor, cancelled); stone(level, "Cancelled break discarded restoration ownership");

                // Creative mining has no drops event; the break-attempt queue must cover it as well.
                reset(level); lease(combat, CELL, "minecraft:clay", 200);
                player.gameMode.changeGameModeForPlayer(GameType.CREATIVE);
                TestWorld.require(player.gameMode.destroyBlock(CELL), "Native creative break failed");
                combat.effects().tick(); stone(level, "Creative break lost the original block");
                player.gameMode.changeGameModeForPlayer(GameType.SURVIVAL);

                reset(level); long wall = lease(combat, CELL.above(), "minecraft:clay", 200);
                TestWorld.require(player.gameMode.destroyBlock(CELL.above()), "Temporary wall break failed");
                combat.effects().tick();
                TestWorld.require(level.getBlockState(CELL.above()).isAir(), "Dismantled temporary wall grew back");
                combat.effects().remove(actor, wall);

                // Native script breaking uses the same hooks, with its requested drops still suppressed for a lease.
                reset(level); lease(combat, CELL, "minecraft:clay", 200);
                TestWorld.require(NativeWorldWrites.breakBlock(combat, actor, null, point(CELL), true).isEmpty(), "Script break rejected");
                combat.effects().tick(); stone(level, "Script break lost the original block");

                reset(level);
                // TestWorld builds one suspended floor; native ice needs solid support underneath to become water.
                level.setBlockAndUpdate(CELL.below(), Blocks.STONE.defaultBlockState());
                lease(combat, CELL, "minecraft:ice", 200);
                TestWorld.require(player.gameMode.destroyBlock(CELL), "Native ice break failed");
                TestWorld.require(level.getBlockState(CELL).is(Blocks.WATER), "Native ice fixture did not produce water");
                combat.effects().tick(); stone(level, "Native ice melt residue lost the original ground");

                reset(level); long replaced = lease(combat, CELL, "minecraft:clay", 200);
                TestWorld.require(player.gameMode.destroyBlock(CELL), "Replacement setup break failed");
                TestWorld.require(NativeWorldWrites.placeBlock(combat, actor, null, point(CELL), "minecraft:clay", "{}").isEmpty(), "Player replacement failed");
                combat.effects().remove(actor, replaced);
                TestWorld.require(level.getBlockState(CELL).is(Blocks.CLAY), "Restoration overwrote a later same-material permanent placement");

                reset(level); long kept = lease(combat, CELL, "minecraft:clay", 200);
                blockedPlace = CELL;
                TestWorld.require(NativeWorldWrites.placeBlock(combat, actor, null, point(CELL), "minecraft:stone", "{\"replace\":true}").equals("protected-area"), "Placement cancellation was not respected");
                blockedPlace = null; combat.effects().tick(); combat.effects().remove(actor, kept);
                stone(level, "Cancelled placement discarded the original state");

                // A two-cell placement releases both lease cells, not just EntityPlaceEvent#getPos().
                reset(level); var second = CELL.south(); level.setBlockAndUpdate(second, Blocks.STONE.defaultBlockState());
                long firstLease = lease(combat, CELL, "minecraft:clay", 200);
                long secondLease = lease(combat, second, "minecraft:clay", 200);
                var firstSnapshot = BlockSnapshot.create(level.dimension(), level, CELL);
                var secondSnapshot = BlockSnapshot.create(level.dimension(), level, second);
                NeoForge.EVENT_BUS.post(new BlockEvent.EntityMultiPlaceEvent(List.of(firstSnapshot, secondSnapshot), Blocks.STONE.defaultBlockState(), player));
                combat.effects().tick(); combat.effects().remove(actor, firstLease); combat.effects().remove(actor, secondLease);
                TestWorld.require(level.getBlockState(CELL).is(Blocks.CLAY) && level.getBlockState(second).is(Blocks.CLAY), "Multi-place failed to release every claimed cell");

                reset(level); long lower = lease(combat, CELL, "minecraft:clay", 200);
                blockedPlace = CELL;
                boolean rejected = false;
                try { lease(combat, CELL, "minecraft:gold_block", 200); }
                catch (dev.worldcombat.core.runtime.ActionRejectedException expected) { rejected = true; }
                blockedPlace = null;
                TestWorld.require(rejected && level.getBlockState(CELL).is(Blocks.CLAY), "Rejected overlap failed to roll back");
                combat.effects().remove(actor, lower); stone(level, "Rejected overlap lost previous ownership");

                reset(level); lower = lease(combat, CELL, "minecraft:clay", 1);
                long upper = lease(combat, CELL, "minecraft:gold_block", 200);
                combat.effects().remove(actor, lower);
                TestWorld.require(level.getBlockState(CELL).is(Blocks.GOLD_BLOCK), "Retired old lease disturbed the new cover");
                combat.effects().remove(actor, upper); stone(level, "Overlap restored temporary material instead of original terrain");

                reset(level); lease(combat, CELL, "minecraft:clay", 200);
                TestWorld.require(player.gameMode.destroyBlock(CELL), "Immediate replacement setup break failed");
                upper = lease(combat, CELL, "minecraft:gold_block", 200);
                combat.effects().remove(actor, upper); stone(level, "Same-tick re-lease forgot ground below the broken cover");

                // Reclaimed ground waits until an entity has left; it does not close through its body.
                reset(level); lease(combat, CELL, "minecraft:clay", 200);
                TestWorld.require(player.gameMode.destroyBlock(CELL), "Occupied restoration setup failed");
                var occupant = TestWorld.mob(EntityType.COW, level, 12);
                occupant.moveTo(CELL.getX() + .5, CELL.getY(), CELL.getZ() + .5, 0, 0);
                combat.effects().tick(); TestWorld.require(level.getBlockState(CELL).isAir(), "Restoration trapped an entity");
                occupant.moveTo(12, 101, 2, 0, 0); combat.effects().tick(); stone(level, "Vacated restoration was never retried");

                // Ended leases waiting on an occupied opening also survive the native SavedData roundtrip.
                reset(level); long opening = lease(combat, CELL, "minecraft:air", 200);
                occupant.moveTo(CELL.getX() + .5, CELL.getY(), CELL.getZ() + .5, 0, 0);
                combat.effects().remove(actor, opening);
                roundtrip(combat, server, opening);
                combat.effects().stop();
                TestWorld.require(level.getBlockState(CELL).isAir(), "Shutdown restored ground through an occupant");
                roundtrip(combat, server, opening);
                occupant.discard(); combat.effects().tick(); stone(level, "Released occupied opening was not retried");
                legacyOverlap(combat, server);

                // A removal path without a break/drop event still recovers at lease expiry.
                reset(level); lease(combat, CELL, "minecraft:clay", 1);
                level.removeBlock(CELL, false); expires = level.getGameTime() + 1;
            } else if (level.getGameTime() >= expires) {
                combat.effects().tick(); stone(level, "Silent native removal was not recovered at expiry");
                done = true;
                System.out.println("REVIEWCHECK PASS terrain lifecycle: native mining, cancellation, permanent replacements, overlap, drops/XP, occupied retry and native data roundtrip");
                server.halt(false);
            }
        } catch (Throwable error) {
            done = true; error.printStackTrace();
            System.out.println("REVIEWCHECK FAIL terrain lifecycle: " + error);
            server.halt(false);
        }
    }
    private static void reset(ServerLevel level) {
        level.setBlockAndUpdate(CELL, Blocks.STONE.defaultBlockState());
        level.setBlockAndUpdate(CELL.above(), Blocks.AIR.defaultBlockState());
    }
    private static Point point(BlockPos pos) { return new Point(pos.getX(), pos.getY(), pos.getZ()); }
    private static void stone(ServerLevel level, String reason) { TestWorld.require(level.getBlockState(CELL).is(Blocks.STONE), reason); }
    private static long lease(MinecraftCombat combat, BlockPos pos, String state, int ticks) {
        return combat.effects().place(72001, actor, null,
            "{\"replace\":true,\"linger\":true,\"cells\":[{\"x\":" + pos.getX() + ",\"y\":" + pos.getY() + ",\"z\":" + pos.getZ() + ",\"state\":\"" + state + "\"}]}", ticks);
    }
    private static void roundtrip(MinecraftCombat combat, MinecraftServer server, long leaseId) throws Exception {
        var field = WorldEffects.class.getDeclaredField("store"); field.setAccessible(true);
        var saved = (SavedData) field.get(combat.effects());
        var data = saved.save(new CompoundTag(), server.registryAccess());
        var read = saved.getClass().getDeclaredMethod("read", CompoundTag.class, HolderLookup.Provider.class); read.setAccessible(true);
        var restored = (SavedData) read.invoke(null, data, server.registryAccess());
        var again = restored.save(new CompoundTag(), server.registryAccess());
        TestWorld.require(data.equals(again), "Native terrain storage failed to roundtrip");
        boolean found = false;
        for (var row : again.getList("Leases", net.minecraft.nbt.Tag.TAG_COMPOUND)) {
            var tag = (CompoundTag) row;
            if (tag.getLong("Id") == leaseId) { found = true; TestWorld.require(tag.getBoolean("Restoring"), "Pending restoration was not persisted"); }
        }
        TestWorld.require(found, "Occupied restoration lost its persisted lease");
    }
    private static void legacyOverlap(MinecraftCombat combat, MinecraftServer server) throws Exception {
        var field = WorldEffects.class.getDeclaredField("store"); field.setAccessible(true);
        var saved = (SavedData) field.get(combat.effects());
        var data = new CompoundTag(); var rows = new net.minecraft.nbt.ListTag();
        for (int i = 0; i < 2; i++) {
            var row = new CompoundTag(); row.putLong("Id", 900 + i); row.putUUID("Source", actor.entity());
            row.putString("Dimension", "minecraft:overworld"); row.putLong("Expiry", 1 + i); row.putBoolean("Linger", true);
            var cells = new net.minecraft.nbt.ListTag(); var cell = new CompoundTag(); cell.putLong("Pos", CELL.asLong());
            cell.put("Before", net.minecraft.nbt.NbtUtils.writeBlockState((i == 0 ? Blocks.STONE : Blocks.CLAY).defaultBlockState()));
            cell.put("Placed", net.minecraft.nbt.NbtUtils.writeBlockState((i == 0 ? Blocks.CLAY : Blocks.GOLD_BLOCK).defaultBlockState()));
            cells.add(cell); row.put("Cells", cells); rows.add(row);
        }
        data.put("Leases", rows);
        var read = saved.getClass().getDeclaredMethod("read", CompoundTag.class, HolderLookup.Provider.class); read.setAccessible(true);
        var restored = (SavedData) read.invoke(null, data, server.registryAccess());
        var result = restored.save(new CompoundTag(), server.registryAccess()).getList("Leases", net.minecraft.nbt.Tag.TAG_COMPOUND);
        TestWorld.require(result.size() == 1 && result.getCompound(0).getLong("Id") == 901, "Old overlapping leases were not consolidated");
        var before = result.getCompound(0).getList("Cells", net.minecraft.nbt.Tag.TAG_COMPOUND).getCompound(0).getCompound("Before");
        TestWorld.require(before.getString("Name").equals("minecraft:stone"), "Old overlapping save lost its root original state");
    }
}
