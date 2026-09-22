package dev.worldcombat.cobblemon.client

import dev.worldcombat.cobblemon.CobblemonWorldCombat
import net.neoforged.api.distmarker.Dist
import net.neoforged.bus.api.SubscribeEvent
import net.neoforged.fml.common.EventBusSubscriber
import net.neoforged.fml.event.lifecycle.FMLClientSetupEvent

@EventBusSubscriber(
    modid = CobblemonWorldCombat.MOD_ID,
    value = [Dist.CLIENT]
)
object AdapterClient {
    @SubscribeEvent
    fun keys(event: net.neoforged.neoforge.client.event.RegisterKeyMappingsEvent) { CompanionInput.registerKeys(event); ReviewScreen.registerKeys(event) }
    @SubscribeEvent
    fun onClientSetup(event: FMLClientSetupEvent) {
        CompanionInput.setup()
        ReviewScreen.setup()
        net.neoforged.neoforge.common.NeoForge.EVENT_BUS.addListener(SummaryContentBridge::addAttributesButton)
        CobblemonWorldCombat.LOGGER.info("WorldCombat adapter client setup complete.")
    }
}
