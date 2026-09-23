package dev.worldcombat.core;

import com.mojang.logging.LogUtils;
import dev.worldcombat.core.world.*;
import net.neoforged.bus.api.IEventBus;
import net.neoforged.fml.common.Mod;
import net.neoforged.fml.event.lifecycle.FMLCommonSetupEvent;
import net.neoforged.neoforge.common.NeoForge;
import net.neoforged.neoforge.event.RegisterCommandsEvent;
import net.neoforged.neoforge.event.entity.EntityJoinLevelEvent;
import net.neoforged.neoforge.event.entity.EntityLeaveLevelEvent;
import net.neoforged.neoforge.event.server.*;
import net.neoforged.neoforge.event.tick.ServerTickEvent;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.server.level.ServerLevel;
import org.slf4j.Logger;

@Mod(WorldCombatCore.MOD_ID)
public final class WorldCombatCore {
    public static final String MOD_ID = "world_combat_core";
    public static final Logger LOGGER = LogUtils.getLogger();

    public WorldCombatCore(IEventBus modBus) {
        modBus.addListener(dev.worldcombat.core.network.SceneState::register);
        dev.worldcombat.core.world.CombatWorldContent.register(modBus);
        PublicAttributes.register(modBus);
        NativeItemUse.install(NeoForge.EVENT_BUS);
        dev.worldcombat.core.client.particles.ParticleTypes.register(modBus);
        NeoForge.EVENT_BUS.addListener(net.neoforged.bus.api.EventPriority.LOWEST, (net.neoforged.neoforge.event.PlayLevelSoundEvent.AtPosition event) -> {
            if (event.getLevel() instanceof ServerLevel level) {
                var combat = CombatServices.existing(level.getServer());
                if (combat != null) combat.observeSound(event, event.getPosition());
            }
        });
        NeoForge.EVENT_BUS.addListener(net.neoforged.bus.api.EventPriority.LOWEST, (net.neoforged.neoforge.event.PlayLevelSoundEvent.AtEntity event) -> {
            if (event.getLevel() instanceof ServerLevel level) {
                var combat = CombatServices.existing(level.getServer());
                if (combat != null) combat.observeSound(event, event.getEntity().position());
            }
        });
        NeoForge.EVENT_BUS.addListener((net.neoforged.neoforge.event.entity.living.LivingIncomingDamageEvent event) -> {
            if (event.getEntity().level() instanceof ServerLevel level) {
                CombatServices.get(level.getServer()).incoming(event);
            }
        });
        NeoForge.EVENT_BUS.addListener(net.neoforged.bus.api.EventPriority.LOWEST, (net.neoforged.neoforge.event.entity.living.LivingKnockBackEvent event) -> {
            if (event.getEntity().level() instanceof ServerLevel level
                && !CombatServices.get(level.getServer()).allowsKnockback(event.getEntity())) event.setCanceled(true);
        });
        NeoForge.EVENT_BUS.addListener(net.neoforged.bus.api.EventPriority.LOWEST, (net.neoforged.neoforge.event.level.BlockEvent.EntityPlaceEvent event) -> {
            if (event.getLevel() instanceof ServerLevel level) CombatServices.get(level.getServer()).effects().placed(event);
        });
        NeoForge.EVENT_BUS.addListener((net.neoforged.neoforge.event.entity.living.LivingDamageEvent.Post event) -> {
            if (event.getEntity().level() instanceof ServerLevel level && !CombatServices.domain(event.getEntity()).deferredDamage())
                CombatServices.get(level.getServer()).applied(event.getEntity(), event.getSource());
        });
        NeoForge.EVENT_BUS.addListener(net.neoforged.bus.api.EventPriority.LOWEST, (net.neoforged.neoforge.event.level.BlockDropsEvent event) -> {
            CombatServices.get(event.getLevel().getServer()).effects().drops(event);
        });
        NeoForge.EVENT_BUS.addListener(net.neoforged.bus.api.EventPriority.LOWEST, (net.neoforged.neoforge.event.level.BlockEvent.BreakEvent event) -> {
            if (event.getLevel() instanceof ServerLevel level) CombatServices.get(level.getServer()).effects().breaking(event);
        });
        if (net.neoforged.fml.ModList.get().isLoaded("curios")) dev.worldcombat.core.integration.CuriosEquipment.install();
        NeoForge.EVENT_BUS.addListener((net.neoforged.neoforge.event.entity.living.LivingEquipmentChangeEvent event) -> WorldEquipment.changed(event.getEntity()));
        // Effect endings reach content as one topic; the Remove event fires before the actual removal, so a cancelled removal is skipped.
        NeoForge.EVENT_BUS.addListener(net.neoforged.bus.api.EventPriority.LOWEST, (net.neoforged.neoforge.event.entity.living.MobEffectEvent.Remove event) -> {
            if (!event.isCanceled() && event.getEffectInstance() != null && event.getEntity().level() instanceof ServerLevel level)
                CombatServices.get(level.getServer()).mobEffectEnded(event.getEntity(), event.getEffectInstance(), "removed");
        });
        NeoForge.EVENT_BUS.addListener((net.neoforged.neoforge.event.entity.living.MobEffectEvent.Expired event) -> {
            if (event.getEffectInstance() != null && event.getEntity().level() instanceof ServerLevel level)
                CombatServices.get(level.getServer()).mobEffectEnded(event.getEntity(), event.getEffectInstance(), "expired");
        });
        NeoForge.EVENT_BUS.addListener((net.neoforged.neoforge.event.entity.living.MobEffectEvent.Added event) -> {
            if (event.getEffectInstance() != null && event.getEntity().level() instanceof ServerLevel level)
                CombatServices.get(level.getServer()).mobEffectAdded(event.getEntity(), event.getEffectInstance(), event.getOldEffectInstance());
        });
        modBus.addListener((FMLCommonSetupEvent event) -> {
            // T88 registers its configs in its own constructor; after common setup every mod has constructed.
            if (net.neoforged.fml.ModList.get().isLoaded("t88")) event.enqueueWork(dev.worldcombat.core.integration.T88Compat::install);
            LOGGER.info("WorldCombat core common setup complete.");
        });
        NeoForge.EVENT_BUS.addListener((RegisterCommandsEvent event) -> CombatCommands.register(event.getDispatcher()));
        NeoForge.EVENT_BUS.addListener((ServerStartedEvent event) -> LOGGER.info("WorldCombat core server started."));
        NeoForge.EVENT_BUS.addListener((ServerTickEvent.Post event) -> CombatServices.get(event.getServer()).tick());
        NeoForge.EVENT_BUS.addListener((ServerStoppingEvent event) -> CombatServices.stopping(event.getServer()));
        NeoForge.EVENT_BUS.addListener((ServerStoppedEvent event) -> CombatServices.stopped(event.getServer()));
        NeoForge.EVENT_BUS.addListener((EntityJoinLevelEvent event) -> {
            if (event.getLevel() instanceof ServerLevel && event.getEntity() instanceof LivingEntity entity) {
                CombatServices.domain(entity).joined(entity);
                PublicAttributes.observe(entity);
            }
        });
        NeoForge.EVENT_BUS.addListener((EntityLeaveLevelEvent event) -> {
            if (event.getLevel() instanceof ServerLevel level && event.getEntity() instanceof LivingEntity entity) {
                CombatServices.get(level.getServer()).left(entity);
                PublicAttributes.forget(entity);
            }
        });
    }
}
