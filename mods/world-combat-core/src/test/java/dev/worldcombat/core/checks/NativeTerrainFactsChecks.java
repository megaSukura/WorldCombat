package dev.worldcombat.core.checks;

import dev.worldcombat.core.world.MinecraftCombat;
import net.minecraft.core.BlockPos;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.level.block.Blocks;
import static dev.worldcombat.core.checks.TestWorld.*;

public final class NativeTerrainFactsChecks {
    public static void run(MinecraftCombat combat, ServerLevel level) {
        var entity = mob(EntityType.COW, level, 2); var actor = combat.bind(entity);
        try {
            var cells = "{\"cells\":[{\"x\":9,\"y\":100,\"z\":2,\"block\":\"minecraft:glass\"},{\"x\":10,\"y\":100,\"z\":2,\"block\":\"minecraft:glass\"}]}";
            long id = combat.terrain(-921001, actor, null, cells, 80);
            require(combat.terrainCells(actor, id).length == 2, "Installed cells missing from lease facts");
            level.setBlockAndUpdate(new BlockPos(9,100,2), Blocks.AIR.defaultBlockState());
            require(combat.terrainCells(actor, id).length == 1, "Destroyed cell still claimed active");
            combat.release(-921001, "checks:ended");
            require(combat.terrainCells(actor, id).length == 0 && level.getBlockState(new BlockPos(10,100,2)).isAir(), "Released wall still grants active cells");
            mark("Native terrain facts verified: actual cells, external destruction and owner cleanup");
        } finally { combat.release(-921001, "checks:cleanup"); entity.discard(); }
    }
}
