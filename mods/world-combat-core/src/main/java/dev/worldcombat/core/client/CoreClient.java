package dev.worldcombat.core.client;

import dev.worldcombat.core.WorldCombatCore;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.bus.api.SubscribeEvent;
import net.neoforged.fml.common.EventBusSubscriber;
import net.neoforged.fml.event.lifecycle.FMLClientSetupEvent;

@EventBusSubscriber(modid = WorldCombatCore.MOD_ID, value = Dist.CLIENT)
public final class CoreClient {
    private CoreClient() {}
    @SubscribeEvent
    public static void renderers(net.neoforged.neoforge.client.event.EntityRenderersEvent.RegisterRenderers event) {
        event.registerEntityRenderer(dev.worldcombat.core.world.CombatWorldContent.HELPER.get(), HelperRenderer::new);
        event.registerEntityRenderer(dev.worldcombat.core.world.CombatWorldContent.PROJECTILE.get(), ProjectileRenderer::new);
        event.registerEntityRenderer(dev.worldcombat.core.world.CombatWorldContent.BODY.get(), BodyRenderer::new);
    }

    @SubscribeEvent
    public static void onClientSetup(FMLClientSetupEvent event) {
        dev.worldcombat.core.network.SceneState.receiver = ClientPresentation::receive;
        net.neoforged.neoforge.common.NeoForge.EVENT_BUS.addListener(ClientPresentation::tick);
        net.neoforged.neoforge.common.NeoForge.EVENT_BUS.addListener(ClientPresentation::render);
        net.neoforged.neoforge.common.NeoForge.EVENT_BUS.addListener(dev.worldcombat.core.client.particles.ParticleDirector::onClientTick);
        net.neoforged.neoforge.common.NeoForge.EVENT_BUS.addListener((net.neoforged.neoforge.client.event.RegisterClientCommandsEvent commands) ->
            dev.worldcombat.core.client.particles.ParticleCommand.register(commands.getDispatcher()));
        dev.worldcombat.core.client.particles.ParticleDirector.INSTANCE.sink(dev.worldcombat.core.client.particles.MadParticleSink.INSTANCE);
        WorldCombatCore.LOGGER.info("WorldCombat core client setup complete.");
    }

    @SubscribeEvent
    public static void particleProviders(net.neoforged.neoforge.client.event.RegisterParticleProvidersEvent event) {
        for (var type : dev.worldcombat.core.client.particles.ParticleTypes.registeredTypes()) {
            // A SpriteSet is all MadParticle needs; the returned provider is never used to build one.
            event.registerSpriteSet(type, sprites -> (t, level, x, y, z, dx, dy, dz) -> null);
        }
    }
    @SubscribeEvent public static void hud(net.neoforged.neoforge.client.event.RegisterGuiLayersEvent event) {
        event.registerAboveAll(net.minecraft.resources.ResourceLocation.fromNamespaceAndPath(WorldCombatCore.MOD_ID, "script_hud"), (gui, delta) -> {
            ClientPresentation.drawHud(gui);
            NativeUiHost.render(gui, delta);
        });
    }
}
