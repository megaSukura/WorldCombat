package dev.worldcombat.core.checks;

import dev.worldcombat.core.world.*;
import net.minecraft.core.BlockPos;
import net.minecraft.server.MinecraftServer;
import net.minecraft.world.level.block.Blocks;

public final class RestoredTerrainChecks {
    private static int age;
    private static boolean done;
    public static void tick(MinecraftServer server) {
        if (done) return;
        try {
            var level = server.overworld();
            if (age++ == 0) {
                level.setChunkForced(0, 0, true);
                TestWorld.require(level.getBlockEntity(new BlockPos(14, 100, 3)) instanceof TemporaryRock.Lease,
                    "Native region data did not restore the live lease");
                var playerCell = CombatGeometry.cells(CombatServices.CONTENT.preview("world_combat:wall"),
                    new dev.worldcombat.core.runtime.Point(6, 100, 2), new dev.worldcombat.core.runtime.Point(1, 0, 0)).getFirst();
                TestWorld.require(level.getBlockState(playerCell).is(Blocks.STONE),
                    "Native restart lost player construction");
            }
            if (age == 120) {
                TestWorld.require(level.getBlockState(new BlockPos(14, 100, 3)).isAir(), "Restored lease failed to expire");
                TestWorld.require(level.getBlockState(new BlockPos(14, 100, 4)).isAir(), "Restored orphan was not reclaimed");
                done = true;
                System.out.println("P2CHECK PASS terrain restart: native region lease, absolute expiry, orphan recovery and player construction");
            }
        } catch (Throwable error) {
            done = true; error.printStackTrace();
            System.out.println("P2CHECK FAIL terrain restart: " + error);
        }
    }
}
