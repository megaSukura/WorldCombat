package dev.worldcombat.core.world;

import com.mojang.serialization.MapCodec;
import net.minecraft.core.BlockPos;
import net.minecraft.core.HolderLookup;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.*;
import net.minecraft.world.level.block.entity.*;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.block.state.BlockBehaviour;
import net.minecraft.world.level.material.PushReaction;
import java.util.UUID;

public final class TemporaryRock extends BaseEntityBlock {
    public static final MapCodec<TemporaryRock> CODEC = simpleCodec(TemporaryRock::new);
    public TemporaryRock(BlockBehaviour.Properties properties) { super(properties); }
    @Override protected MapCodec<? extends BaseEntityBlock> codec() { return CODEC; }
    @Override protected RenderShape getRenderShape(BlockState state) { return RenderShape.MODEL; }
    @Override public BlockEntity newBlockEntity(BlockPos pos, BlockState state) { return new Lease(pos, state); }
    @Override public <T extends BlockEntity> BlockEntityTicker<T> getTicker(Level level, BlockState state, BlockEntityType<T> type) {
        return level.isClientSide ? null : createTickerHelper(type, CombatWorldContent.ROCK_ENTITY.get(), Lease::tick);
    }
    public static final class Lease extends BlockEntity {
        private UUID effect;
        private UUID actor;
        private long expiry;
        public Lease(BlockPos pos, BlockState state) { super(CombatWorldContent.ROCK_ENTITY.get(), pos, state); }
        public void initialize(UUID effect, UUID actor, long expiry) {
            this.effect = effect; this.actor = actor; this.expiry = expiry; setChanged();
        }
        public boolean belongs(UUID id) { return id.equals(effect); }
        public static void tick(Level level, BlockPos pos, BlockState state, Lease lease) {
            if (level.getGameTime() % 10 != 0) return;
            if (CombatServices.get(((ServerLevel) level).getServer()).effects().owns(lease.effect, (ServerLevel) level, pos)) return;
            var source = lease.actor == null ? null : ((ServerLevel) level).getEntity(lease.actor);
            if (lease.effect == null || level.getGameTime() >= lease.expiry || source == null || !source.isAlive())
                level.removeBlock(pos, false);
        }
        @Override protected void saveAdditional(CompoundTag tag, HolderLookup.Provider lookup) {
            super.saveAdditional(tag, lookup);
            if (effect != null) tag.putUUID("Effect", effect);
            if (actor != null) tag.putUUID("Actor", actor);
            tag.putLong("Expiry", expiry);
        }
        @Override protected void loadAdditional(CompoundTag tag, HolderLookup.Provider lookup) {
            super.loadAdditional(tag, lookup);
            effect = tag.hasUUID("Effect") ? tag.getUUID("Effect") : null;
            actor = tag.hasUUID("Actor") ? tag.getUUID("Actor") : null;
            expiry = tag.getLong("Expiry");
        }
    }
}
