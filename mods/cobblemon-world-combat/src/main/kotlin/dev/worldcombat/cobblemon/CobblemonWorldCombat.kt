package dev.worldcombat.cobblemon

import com.mojang.logging.LogUtils
import dev.worldcombat.core.world.CombatServices
import net.neoforged.bus.api.IEventBus
import net.neoforged.fml.common.Mod
import net.neoforged.fml.event.lifecycle.FMLCommonSetupEvent
import net.neoforged.neoforge.common.NeoForge
import net.neoforged.neoforge.event.server.ServerStartedEvent

@Mod(CobblemonWorldCombat.MOD_ID)
class CobblemonWorldCombat(modBus: IEventBus, container: net.neoforged.fml.ModContainer) {
    init {
        container.registerConfig(net.neoforged.fml.config.ModConfig.Type.CLIENT, dev.worldcombat.cobblemon.control.ControlConfig.CLIENT)
        container.registerConfig(net.neoforged.fml.config.ModConfig.Type.SERVER, dev.worldcombat.cobblemon.config.WorldCombatConfig.SERVER)
        modBus.addListener<net.neoforged.neoforge.network.event.RegisterPayloadHandlersEvent> {
            dev.worldcombat.cobblemon.network.ControlNetwork.register(it)
        }
        NeoForge.EVENT_BUS.addListener<net.neoforged.neoforge.event.tick.ServerTickEvent.Post> {
            dev.worldcombat.cobblemon.review.ReviewTool.tick(it.server)
            dev.worldcombat.cobblemon.control.CompanionControl.tick(it.server)
            dev.worldcombat.cobblemon.review.ReviewTool.tickHeld()
            dev.worldcombat.cobblemon.script.NativePublicAttributes.flush()
            dev.worldcombat.cobblemon.script.NativeContentSubscriptions.flush(it.server)
        }
        NeoForge.EVENT_BUS.addListener<net.neoforged.neoforge.event.entity.player.PlayerInteractEvent.RightClickItem> {
            dev.worldcombat.cobblemon.review.ReviewTool.interact(it)
        }
        NeoForge.EVENT_BUS.addListener<net.neoforged.neoforge.event.entity.player.PlayerInteractEvent.RightClickBlock> {
            dev.worldcombat.cobblemon.review.ReviewTool.interact(it)
        }
        NeoForge.EVENT_BUS.addListener<net.neoforged.neoforge.event.entity.player.PlayerInteractEvent.EntityInteract> {
            dev.worldcombat.cobblemon.review.ReviewTool.interact(it)
        }
        NeoForge.EVENT_BUS.addListener<net.neoforged.neoforge.event.entity.player.PlayerInteractEvent.EntityInteractSpecific> {
            dev.worldcombat.cobblemon.review.ReviewTool.interact(it)
        }
        NeoForge.EVENT_BUS.addListener<net.neoforged.neoforge.event.server.ServerStoppedEvent> {
            dev.worldcombat.cobblemon.control.CompanionControl.stop(it.server)
            dev.worldcombat.cobblemon.script.NativeContentSubscriptions.reset()
            dev.worldcombat.cobblemon.script.NativePublicAttributes.reset()
            dev.worldcombat.cobblemon.review.ReviewTool.reset()
        }
        NeoForge.EVENT_BUS.addListener<net.neoforged.neoforge.event.entity.player.PlayerEvent.PlayerLoggedOutEvent> {
            (it.entity as? net.minecraft.server.level.ServerPlayer)?.let(dev.worldcombat.cobblemon.script.NativeContentSubscriptions::remove)
        }
        NeoForge.EVENT_BUS.addListener<net.neoforged.neoforge.event.entity.player.PlayerEvent.Clone> {
            (it.original as? net.minecraft.server.level.ServerPlayer)?.let(dev.worldcombat.cobblemon.script.NativeContentSubscriptions::remove)
        }
        NeoForge.EVENT_BUS.addListener<dev.worldcombat.core.world.CombatEffectChangedEvent> {
            dev.worldcombat.cobblemon.script.NativeContentSubscriptions.entityChanged(it.entity)
        }
        NeoForge.EVENT_BUS.addListener<dev.worldcombat.core.world.CombatEquipmentChangedEvent> {
            dev.worldcombat.cobblemon.script.NativeContentSubscriptions.entityChanged(it.entity)
        }
        NeoForge.EVENT_BUS.addListener<net.neoforged.neoforge.event.entity.living.MobEffectEvent.Added> {
            dev.worldcombat.cobblemon.script.NativeContentSubscriptions.entityChanged(it.entity)
        }
        NeoForge.EVENT_BUS.addListener<net.neoforged.neoforge.event.entity.living.MobEffectEvent.Remove> {
            dev.worldcombat.cobblemon.script.NativeContentSubscriptions.entityChanged(it.entity)
        }
        NeoForge.EVENT_BUS.addListener<net.neoforged.neoforge.event.entity.living.MobEffectEvent.Expired> {
            dev.worldcombat.cobblemon.script.NativeContentSubscriptions.entityChanged(it.entity)
        }
        NeoForge.EVENT_BUS.addListener<dev.worldcombat.core.world.CombatAttributeChangedEvent> {
            (it.entity as? com.cobblemon.mod.common.entity.pokemon.PokemonEntity)?.let { entity ->
                dev.worldcombat.cobblemon.script.PokemonViews.invalidate(entity.pokemon)
                dev.worldcombat.cobblemon.script.NativePublicAttributes.changed(entity)
            }
        }
        NeoForge.EVENT_BUS.addListener<net.neoforged.neoforge.event.entity.EntityLeaveLevelEvent> {
            if (!it.level.isClientSide) (it.entity as? com.cobblemon.mod.common.entity.pokemon.PokemonEntity)?.let(dev.worldcombat.cobblemon.script.NativePublicAttributes::save)
        }
        CombatServices.registerDomain(PokemonCombatDomain())
        dev.worldcombat.cobblemon.script.NativeMoveMetadata.install()
        dev.worldcombat.cobblemon.control.CaptureBridge.install()
        com.cobblemon.mod.common.api.events.CobblemonEvents.HELD_ITEM_POST.subscribe {
            if (net.neoforged.neoforge.server.ServerLifecycleHooks.getCurrentServer()?.isSameThread == true)
                dev.worldcombat.cobblemon.script.NativeMechanics.heldChanged(it.pokemon)
        }
        NeoForge.EVENT_BUS.addListener<net.neoforged.neoforge.event.RegisterCommandsEvent> {
            CompanionCommands.register(it.dispatcher)
        }
        modBus.addListener<FMLCommonSetupEvent> {
            LOGGER.info("WorldCombat adapter common setup complete.")
        }
        NeoForge.EVENT_BUS.addListener<ServerStartedEvent> {
            LOGGER.info("WorldCombat adapter server started. prewarmSkipped={}", LegacyBattleGate.prewarmSkipped.get())
        }
    }

    companion object {
        const val MOD_ID = "cobblemon_world_combat"
        val LOGGER = LogUtils.getLogger()
    }
}
