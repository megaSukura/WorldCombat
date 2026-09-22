package dev.worldcombat.core.world;

import com.mojang.authlib.GameProfile;
import dev.worldcombat.core.runtime.*;
import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.phys.BlockHitResult;
import net.minecraft.world.phys.Vec3;
import net.neoforged.neoforge.capabilities.Capabilities;
import net.neoforged.neoforge.common.CommonHooks;
import net.neoforged.neoforge.common.util.FakePlayerFactory;
import net.neoforged.neoforge.common.util.TriState;
import net.neoforged.neoforge.energy.IEnergyStorage;
import net.neoforged.neoforge.event.EventHooks;
import java.util.Locale;
import java.util.UUID;

/** Native FE access. Content owns energy budgets, conversion, timing and costs. No capability is retained across calls. */
public final class NativeEnergy {
    private NativeEnergy() {}
    private record Access(Direction side, IEnergyStorage storage) {}
    private static Direction side(String name) {
        if (name == null || name.isBlank() || name.equals("none")) return null;
        var result = Direction.byName(name.toLowerCase(Locale.ROOT));
        if (result == null) throw new IllegalArgumentException("Unknown energy face: " + name);
        return result;
    }
    private static Access access(ServerLevel level, BlockPos pos, String face) {
        if (!level.hasChunkAt(pos) || level.isOutsideBuildHeight(pos) || !level.getWorldBorder().isWithinBounds(pos)) return null;
        if ("auto".equals(face)) {
            var unsided = level.getCapability(Capabilities.EnergyStorage.BLOCK, pos, null);
            if (unsided != null && unsided.canReceive()) return new Access(null, unsided);
            Access fallback = unsided == null ? null : new Access(null, unsided);
            for (var direction : Direction.values()) {
                var storage = level.getCapability(Capabilities.EnergyStorage.BLOCK, pos, direction);
                if (storage != null && storage.canReceive()) return new Access(direction, storage);
                if (fallback == null && storage != null) fallback = new Access(direction, storage);
            }
            return fallback;
        }
        var direction = side(face);
        var storage = level.getCapability(Capabilities.EnergyStorage.BLOCK, pos, direction);
        return storage == null ? null : new Access(direction, storage);
    }
    public static EnergyObservation read(MinecraftCombat combat, ActorHandle actor, Point point, String face) {
        var entity = combat.resolve(actor); if (entity == null) return null;
        var value = access((ServerLevel) entity.level(), BlockPos.containing(point.x(), point.y(), point.z()), face);
        return value == null ? null : new EnergyObservation(value.side() == null ? "none" : value.side().getName(),
            value.storage().getEnergyStored(), value.storage().getMaxEnergyStored(), value.storage().canReceive(), value.storage().canExtract());
    }
    public static int receive(MinecraftCombat combat, ActorHandle actor, UUID controller, Point point, String face, int amount, boolean simulate) {
        if (amount < 0) throw new IllegalArgumentException("Energy amount must be non-negative");
        var entity = combat.resolve(actor); if (entity == null || amount == 0) return 0;
        var level = (ServerLevel) entity.level(); var pos = BlockPos.containing(point.x(), point.y(), point.z());
        var value = access(level, pos, face); if (value == null || !value.storage().canReceive()) return 0;
        var player = controller == null ? null : combat.server().getPlayerList().getPlayer(controller);
        if (player == null && !EventHooks.canEntityGrief(level, entity)) return 0;
        var proxy = FakePlayerFactory.get(level, player == null ? new GameProfile(entity.getUUID(), "WorldCombat") : player.getGameProfile());
        var previous = proxy.position(); var yaw = proxy.getYRot(); var pitch = proxy.getXRot();
        var hand = proxy.getMainHandItem(); var crouched = proxy.isShiftKeyDown();
        try {
            proxy.moveTo(entity.getX(), entity.getY(), entity.getZ(), entity.getYRot(), entity.getXRot());
            proxy.setItemInHand(InteractionHand.MAIN_HAND, ItemStack.EMPTY); proxy.setShiftKeyDown(false);
            if (!level.mayInteract(player == null ? proxy : player, pos)) return 0;
            var hit = new BlockHitResult(Vec3.atCenterOf(pos), value.side() == null ? Direction.UP : value.side(), pos, false);
            var event = CommonHooks.onRightClickBlock(proxy, InteractionHand.MAIN_HAND, pos, hit);
            if (event.isCanceled() || event.getUseBlock() == TriState.FALSE) return 0;
            int accepted = value.storage().receiveEnergy(amount, simulate);
            if (accepted < 0 || accepted > amount) throw new IllegalStateException("Energy provider returned an invalid accepted amount");
            return accepted;
        } finally {
            proxy.setItemInHand(InteractionHand.MAIN_HAND, hand); proxy.setShiftKeyDown(crouched);
            proxy.moveTo(previous.x, previous.y, previous.z, yaw, pitch);
        }
    }
}
