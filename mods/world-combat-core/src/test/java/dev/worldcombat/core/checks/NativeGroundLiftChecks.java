package dev.worldcombat.core.checks;

import dev.worldcombat.core.world.*;
import net.minecraft.core.BlockPos;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.phys.Vec3;
import static dev.worldcombat.core.checks.TestWorld.*;

public final class NativeGroundLiftChecks {
    public static void run(MinecraftCombat combat, ServerLevel level) {
        var body = mob(EntityType.COW, level, 2); body.setNoAi(false); body.setNoGravity(false); var actor = combat.bind(body);
        double gravity = body.getAttributeValue(Attributes.GRAVITY);
        var navigation = body.getNavigation();
        try {
            for(int i=0;i<60;i++) { combat.groundLift(-923001,actor,.5,.2,.6); body.travel(Vec3.ZERO); }
            require(body.getY() > 100.35 && body.getY() < 100.65 && !body.onGround() && !body.isNoGravity(), "Lift did not produce real ground clearance without falsifying collision/gravity flags: " + body.getY());
            require(body.getNavigation() == navigation && navigation.createPath(6,100,2,0) != null, "Supported body lost its native ground navigator");
            level.setBlockAndUpdate(new BlockPos(2,102,2),Blocks.STONE.defaultBlockState());
            for(int i=0;i<60;i++) { combat.groundLift(-923001,actor,1.2,.2,.6); body.travel(Vec3.ZERO); }
            require(body.getBoundingBox().maxY <= 102.001, "Lift passed through a native ceiling");
            level.setBlockAndUpdate(new BlockPos(2,102,2),Blocks.AIR.defaultBlockState());
            combat.release(-923001,"checks:ended");
            require(body.getAttributeValue(Attributes.GRAVITY) == gravity && !NativeGroundLift.supported(body), "Ending lift left a gravity/navigation modification");
            body.moveTo(12,100.5,2); body.setDeltaMovement(Vec3.ZERO);
            for(int x=11;x<=13;x++) for(int z=1;z<=3;z++) level.setBlockAndUpdate(new BlockPos(x,99,z),Blocks.AIR.defaultBlockState());
            combat.groundLift(-923001,actor,.5,.2,.6);
            require(!NativeGroundLift.supported(body) && body.getAttributeValue(Attributes.GRAVITY) == gravity, "Unsupported cliff became infinite flight");
            mark("Native ground lift verified: real clearance, native navigation, ceiling collision, cliff and gravity restoration");
        } finally {
            combat.release(-923001,"checks:cleanup"); body.discard();
            level.setBlockAndUpdate(new BlockPos(2,102,2),Blocks.AIR.defaultBlockState());
            for(int x=11;x<=13;x++) for(int z=1;z<=3;z++) level.setBlockAndUpdate(new BlockPos(x,99,z),Blocks.STONE.defaultBlockState());
        }
    }
}
