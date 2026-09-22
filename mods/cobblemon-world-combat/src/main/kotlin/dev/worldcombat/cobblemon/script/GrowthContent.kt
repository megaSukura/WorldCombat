package dev.worldcombat.cobblemon.script

import com.cobblemon.mod.common.entity.pokemon.PokemonEntity
import dev.worldcombat.core.runtime.ActionContext
import dev.worldcombat.core.world.CombatServices
import dev.latvian.mods.kubejs.script.ConsoleJS
import net.minecraft.server.level.ServerPlayer
import java.util.function.Consumer

/** Native observations feed one script policy. Its write plans live only for this callback. */
object GrowthContent {
    private var epoch = -1L
    private var handler: Consumer<GrowthEvent>? = null
    fun register(expectedEpoch: Long, callback: Consumer<GrowthEvent>) {
        check(expectedEpoch == CombatServices.CONTENT.epoch() && !CombatServices.CONTENT.ready())
        check(epoch != expectedEpoch || handler == null) { "Duplicate growth policy" }
        epoch = expectedEpoch; handler = callback
    }
    private fun dispatch(factory: () -> GrowthEvent) {
        val callback = handler?.takeIf { epoch == CombatServices.CONTENT.epoch() && CombatServices.CONTENT.ready() } ?: return
        var event: GrowthEvent? = null
        try {
            event = factory()
            callback.accept(event)
            event.apply()
        } catch (error: RuntimeException) {
            handler = null
            ConsoleJS.SERVER.error("WorldCombat growth policy disabled", error)
        } finally { event?.close() }
    }
    fun defeated(actor: PokemonEntity, target: PokemonEntity, controller: ServerPlayer?) {
        if (controller != null && actor.ownerUUID != controller.uuid) return
        dispatch { GrowthEvent("defeat", actor, target, null, 0, "") }
    }
    fun damaged(actor: PokemonEntity, amount: Int, cause: String) {
        dispatch { GrowthEvent("damage", actor, null, null, amount, cause) }
    }
    fun committed(actor: PokemonEntity, action: ActionContext) {
        val slot = action.argument("native-slot")?.toIntOrNull() ?: return
        if (slot !in 0..3) return
        val move = actor.pokemon.moveSet[slot] ?: return
        if (NativeMoveKeys.key(move) != action.argument("native-move")) return
        dispatch { GrowthEvent("move-used", actor, null, move, 0, "") }
    }
}
