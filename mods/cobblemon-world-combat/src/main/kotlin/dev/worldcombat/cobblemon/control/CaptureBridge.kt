package dev.worldcombat.cobblemon.control

import com.cobblemon.mod.common.api.events.CobblemonEvents
import com.cobblemon.mod.common.api.Priority
import dev.worldcombat.core.world.CombatServices
import net.minecraft.server.level.ServerPlayer

/** Native balls own the capture result and party insertion; combat only releases transient control. */
object CaptureBridge {
    fun install() {
        CobblemonEvents.THROWN_POKEBALL_HIT.subscribe(Priority.LOWEST) { event ->
            if (event.isCanceled) return@subscribe
            val player = event.pokeBall.owner as? ServerPlayer ?: return@subscribe
            val combat = CombatServices.get(player.server)
            val handle = combat.bind(event.pokemon)
            combat.runtime().cancelActor(handle, "capture-started")
            combat.runtime().cancelTarget(handle, "capture-started")
            combat.controlled(handle, false)
            val s = CompanionControl.session(player)
            val notice = com.google.gson.JsonObject().also { it.addProperty("pokemon", event.pokemon.pokemon.uuid.toString()) }.toString()
            CompanionTactics.notice(s, combat, "native_capture_started", notice)
            event.pokeBall.captureFuture.thenAccept { success ->
                player.server.execute {
                    if (player.isRemoved) return@execute
                    val current = CompanionControl.session(player)
                    CompanionTactics.notice(current, combat, if (success) "native_capture_complete" else "native_capture_failed", notice)
                }
            }
        }
        CobblemonEvents.POKEMON_CAPTURED.subscribe { event ->
            dev.worldcombat.cobblemon.CobblemonWorldCombat.LOGGER.info("WorldCombat native capture player={} pokemon={}", event.player.uuid, event.pokemon.uuid)
        }
    }
}
