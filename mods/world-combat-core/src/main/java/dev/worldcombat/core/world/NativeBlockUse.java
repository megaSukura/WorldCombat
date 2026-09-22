package dev.worldcombat.core.world;

import com.google.gson.JsonArray;
import com.mojang.authlib.GameProfile;
import dev.worldcombat.core.runtime.*;
import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.context.UseOnContext;
import net.minecraft.world.level.block.BonemealableBlock;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.block.state.properties.Property;
import net.minecraft.world.phys.BlockHitResult;
import net.minecraft.world.phys.Vec3;
import net.neoforged.neoforge.common.CommonHooks;
import net.neoforged.neoforge.common.util.FakePlayerFactory;
import net.neoforged.neoforge.event.EventHooks;
import net.neoforged.neoforge.common.util.TriState;
import java.util.*;

/** Calls native item/block interfaces under the acting identity; content supplies tool and purpose. */
public final class NativeBlockUse {
    private NativeBlockUse() {}
    private static <T extends Comparable<T>> String value(BlockState state, Property<T> property) {
        return property.getName(state.getValue(property));
    }
    public static BlockObservation observe(MinecraftCombat combat, ActorHandle actor, Point point) {
        var entity = combat.resolve(actor); if (entity == null) return null;
        var level = (ServerLevel) entity.level(); var pos = BlockPos.containing(point.x(), point.y(), point.z());
        if (!level.hasChunkAt(pos) || level.isOutsideBuildHeight(pos) || !level.getWorldBorder().isWithinBounds(pos)) return null;
        var state = level.getBlockState(pos); var properties = new TreeMap<String, String>();
        for (var property : state.getProperties()) properties.put(property.getName(), value(state, property));
        var tags = new JsonArray(); state.getTags().map(tag -> tag.location().toString()).sorted().forEach(tags::add);
        boolean growable = state.getBlock() instanceof BonemealableBlock plant && plant.isValidBonemealTarget(level, pos, state);
        return new BlockObservation(new Point(pos.getX(), pos.getY(), pos.getZ()),
            BuiltInRegistries.BLOCK.getKey(state.getBlock()).toString(), state.toString(), properties, tags.toString(), growable);
    }
    public static String use(MinecraftCombat combat, ActorHandle actor, UUID controller, Point point, String itemId, String expected) {
        var entity = combat.resolve(actor); if (entity == null) return "actor-unavailable";
        var level = (ServerLevel) entity.level(); var pos = BlockPos.containing(point.x(), point.y(), point.z());
        var facts = observe(combat, actor, point); if (facts == null) return "unloaded";
        if (!facts.state().equals(expected)) return "state-changed";
        var player = controller == null ? null : combat.server().getPlayerList().getPlayer(controller);
        if (player == null && !EventHooks.canEntityGrief(level, entity)) return "protected-area";
        var item = BuiltInRegistries.ITEM.getOptional(ResourceLocation.parse(itemId)).orElseThrow();
        var stack = new ItemStack(item);
        var proxy = FakePlayerFactory.get(level, player == null ? new GameProfile(entity.getUUID(), "WorldCombat") : player.getGameProfile());
        var oldPosition = proxy.position(); var oldYaw = proxy.getYRot(); var oldPitch = proxy.getXRot();
        var oldHand = proxy.getMainHandItem();
        try {
            proxy.moveTo(entity.getX(), entity.getY(), entity.getZ(), entity.getYRot(), entity.getXRot());
            proxy.setItemInHand(InteractionHand.MAIN_HAND, stack);
            if (!level.mayInteract(player == null ? proxy : player, pos) || !proxy.mayUseItemAt(pos, Direction.UP, stack)) return "protected-area";
            var hit = new BlockHitResult(Vec3.atCenterOf(pos), Direction.UP, pos, false);
            var event = CommonHooks.onRightClickBlock(proxy, InteractionHand.MAIN_HAND, pos, hit);
            if (event.isCanceled() || event.getUseItem() == TriState.FALSE) return "protected-area";
            var use = new UseOnContext(proxy, InteractionHand.MAIN_HAND, hit);
            InteractionResult result = stack.onItemUseFirst(use);
            if (result == InteractionResult.PASS) result = stack.useOn(use);
            if (!level.getBlockState(pos).toString().equals(expected)) return "changed";
            return result.consumesAction() ? "used" : result == InteractionResult.FAIL ? "refused" : "pass";
        } finally {
            proxy.setItemInHand(InteractionHand.MAIN_HAND, oldHand);
            proxy.moveTo(oldPosition.x, oldPosition.y, oldPosition.z, oldYaw, oldPitch);
        }
    }
}
