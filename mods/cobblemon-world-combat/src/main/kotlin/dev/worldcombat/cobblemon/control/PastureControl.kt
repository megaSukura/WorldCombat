package dev.worldcombat.cobblemon.control

import com.cobblemon.mod.common.entity.pokemon.PokemonEntity
import dev.worldcombat.cobblemon.script.NativePasture
import dev.worldcombat.core.runtime.ActorHandle
import dev.worldcombat.core.world.CombatServices
import dev.worldcombat.core.world.MinecraftCombat
import net.minecraft.server.MinecraftServer
import java.util.IdentityHashMap

/** One server-owned brain per simulated pasture body. Player sessions only expose and command it. */
object PastureControl {
    private val servers = IdentityHashMap<MinecraftServer, MutableMap<ActorHandle, CompanionControl.Body>>()

    fun body(combat: MinecraftCombat, entity: PokemonEntity): CompanionControl.Body {
        val entries = servers.getOrPut(entity.server!!) { linkedMapOf() }
        val actor = combat.bind(entity)
        return entries.getOrPut(actor) {
            CompanionControl.Body(worldDriven = true).also {
                it.actor = actor; it.epoch = CombatServices.CONTENT.epoch(); it.reason = "ready"
                CompanionTactics.load(it, entity)
            }
        }
    }

    fun tick(server: MinecraftServer) {
        val combat = CombatServices.get(server)
        val entries = servers.getOrPut(server) { linkedMapOf() }
        val active = NativePasture.loaded(server).filter { combat.valid(combat.bind(it)) }
        val present = active.map { combat.bind(it) }.toSet()
        for ((handle, body) in entries.toMap()) if (handle !in present || body.epoch != CombatServices.CONTENT.epoch()) {
            combat.runtime().interruptPreparation(handle); combat.controlled(handle, false); entries.remove(handle)
        }
        for (entity in active) {
            val body = body(combat, entity)
            if (body.lastWorldTick == server.tickCount.toLong()) continue
            body.lastWorldTick = server.tickCount.toLong()
            body.manualActions.removeIf { combat.runtime().state(body.actor, it) == null }
            CompanionTactics.tick(body, combat)
        }
    }

    fun stop(server: MinecraftServer) { servers.remove(server) }
}
