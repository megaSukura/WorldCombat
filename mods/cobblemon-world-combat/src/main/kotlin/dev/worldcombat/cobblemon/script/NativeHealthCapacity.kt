package dev.worldcombat.cobblemon.script

import com.cobblemon.mod.common.entity.pokemon.PokemonEntity
import dev.worldcombat.cobblemon.PokemonHealthBridge
import dev.worldcombat.core.runtime.ActorHandle
import dev.worldcombat.core.runtime.WorldAccess
import dev.worldcombat.core.runtime.ActionInactiveException
import dev.worldcombat.core.world.CombatServices
import net.minecraft.world.entity.ai.attributes.Attributes
import net.neoforged.neoforge.server.ServerLifecycleHooks

/** Applies a script-authored world capacity while retaining the native individual's current HP. */
object NativeHealthCapacity {
    fun apply(world: WorldAccess, actor: ActorHandle, value: Double) {
        world.requireMutation(actor)
        require(value.isFinite() && value > 0 && value <= 65536) { "Invalid world health capacity" }
        val server = ServerLifecycleHooks.getCurrentServer() ?: throw ActionInactiveException("Server stopped")
        val entity = CombatServices.get(server).inspect(actor) as? PokemonEntity
            ?: throw ActionInactiveException("Pokemon left")
        val attribute = entity.getAttribute(Attributes.MAX_HEALTH) ?: return
        if (kotlin.math.abs(attribute.baseValue - value) < 0.0001) return
        attribute.baseValue = value
        PokemonHealthBridge.project(entity.pokemon)
    }
}
