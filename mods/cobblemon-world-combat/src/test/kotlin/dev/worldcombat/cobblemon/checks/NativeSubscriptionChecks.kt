package dev.worldcombat.cobblemon.checks

import com.cobblemon.mod.common.pokemon.Pokemon
import dev.worldcombat.cobblemon.script.NativeContentData
import dev.worldcombat.cobblemon.script.NativeContentSubscriptions
import net.minecraft.server.MinecraftServer
import net.minecraft.server.level.ServerPlayer

/** Call with a real owned-party Pokemon after the server/native fixture has been initialized. */
object NativeSubscriptionChecks {
    fun verify(server: MinecraftServer, owner: ServerPlayer, pokemon: Pokemon) {
        val key = "subscription_check:state"
        val original = NativeContentData.read(pokemon, key)
        NativeContentSubscriptions.viewed(owner, "subscription_check:details", pokemon.uuid)
        repeat(300) { check(NativeContentSubscriptions.drain(server).isEmpty()) { "Unchanged native state produced an invalidation" } }
        check(NativeContentData.compare(pokemon, mapOf(key to NativeContentData.Change(original, "{\"value\":1}"))))
        check(NativeContentData.compare(pokemon, mapOf(key to NativeContentData.Change("{\"value\":1}", "{\"value\":2}"))))
        val changed = NativeContentSubscriptions.drain(server)
        check(changed.size == 1 && changed.single().first === owner)
        check(changed.single().second.pokemon() == pokemon.uuid && changed.single().second.channel() == "subscription_check:details")
        val revision = changed.single().second.revision()
        check(NativeContentSubscriptions.drain(server).isEmpty())
        val move = checkNotNull(pokemon.moveSet[0])
        val pp = move.currentPp
        move.currentPp = if (pp > 0) pp - 1 else 1
        check(NativeContentSubscriptions.drain(server).single().second.revision() > revision) { "Native PP change did not invalidate" }
        move.currentPp = pp
        NativeContentSubscriptions.drain(server)
        val health = pokemon.currentHealth
        pokemon.currentHealth = if (health > 1) health - 1 else health + 1
        check(NativeContentSubscriptions.drain(server).size == 1) { "Native health change did not invalidate" }
        pokemon.currentHealth = health
        NativeContentSubscriptions.drain(server)
        // The request that commits a change already returns the updated values.
        pokemon.onChange()
        NativeContentSubscriptions.viewed(owner, "subscription_check:details", pokemon.uuid)
        check(NativeContentSubscriptions.drain(server).isEmpty()) { "The fresh reply must absorb its own mutation" }
        pokemon.onChange()
        NativeContentSubscriptions.viewed(owner, "subscription_check:details", pokemon.uuid, false)
        check(NativeContentSubscriptions.drain(server).size == 1) { "An error response swallowed an unseen external change" }
        val store: com.cobblemon.mod.common.api.storage.PokemonStore<*> = com.cobblemon.mod.common.Cobblemon.storage.getParty(owner)
        @Suppress("UNCHECKED_CAST")
        val signal = store.getAnyChangeObservable() as com.cobblemon.mod.common.api.reactive.SimpleObservable<Unit>
        val external = Thread { signal.emit(Unit) }
        external.start(); external.join()
        check(NativeContentSubscriptions.drain(server).size == 1) { "An external-thread native notification was lost" }
        pokemon.onChange()
        check(NativeContentSubscriptions.drain(server).single().second.revision() > revision)
        NativeContentSubscriptions.remove(owner)
        pokemon.onChange()
        check(NativeContentSubscriptions.drain(server).isEmpty()) { "Released subscribers must not receive native updates" }
        check(NativeContentData.compare(pokemon, mapOf(key to NativeContentData.Change("{\"value\":2}", original))))
        println("PASS native party content subscription: unchanged silence, data/PP/stat event path, burst coalescing, fresh-reply absorption and cleanup")
    }
}
