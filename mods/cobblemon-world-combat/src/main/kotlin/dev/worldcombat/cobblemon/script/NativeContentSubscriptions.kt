package dev.worldcombat.cobblemon.script

import com.cobblemon.mod.common.Cobblemon
import com.cobblemon.mod.common.api.reactive.ObservableSubscription
import dev.worldcombat.cobblemon.control.CompanionControl
import dev.worldcombat.cobblemon.network.ContentInvalidation
import dev.worldcombat.core.world.CombatServices
import net.minecraft.server.MinecraftServer
import net.minecraft.server.level.ServerPlayer
import net.neoforged.neoforge.network.PacketDistributor
import java.util.UUID
import java.util.function.Consumer
import java.util.concurrent.atomic.AtomicBoolean

/** Native changes invalidate subscribed views. Declared world observations send only changed snapshots. */
object NativeContentSubscriptions {
    private class Watch(val player: ServerPlayer) {
        val channels = linkedMapOf<String, UUID>()
        val dirty = linkedSetOf<String>()
        val changed = AtomicBoolean()
        var revision = 0L
        var subscription: ObservableSubscription<Unit>? = null
        val observations = linkedMapOf<String, String?>()
    }
    // A retired player object's cleanup must not remove the respawned player's observer.
    private val watches = java.util.IdentityHashMap<ServerPlayer, Watch>()

    internal fun viewed(player: ServerPlayer, channel: String, pokemon: UUID, fresh: Boolean = true, dependencies: Set<String> = emptySet()) {
        if (!CompanionControl.isCurrentPlayer(player)) {
            remove(player)
            throw dev.worldcombat.core.runtime.ActionInactiveException("Player subscription expired")
        }
        val watch = watches.getOrPut(player) {
            Watch(player).also { created ->
                val store: com.cobblemon.mod.common.api.storage.PokemonStore<*> = Cobblemon.storage.getParty(player)
                created.subscription = store.getAnyChangeObservable().subscribe(Consumer<Unit> { created.changed.set(true) })
            }
        }
        watch.channels[channel] = pokemon
        if (fresh) {
            if ("world.environment" in dependencies) watch.observations[channel] = environment(player, pokemon)
            else watch.observations.remove(channel)
        }
        if (watch.changed.getAndSet(false)) watch.dirty.addAll(watch.channels.keys)
        // The successful reply already includes mutations made by this request.
        if (fresh) watch.dirty.remove(channel)
    }

    fun flush(server: MinecraftServer) {
        drain(server).forEach { (player, change) -> PacketDistributor.sendToPlayer(player, change) }
    }
    internal fun drain(server: MinecraftServer): List<Pair<ServerPlayer, ContentInvalidation>> {
        val changes = mutableListOf<Pair<ServerPlayer, ContentInvalidation>>()
        watches.values.toList().forEach { watch ->
            if (watch.player.server !== server) return@forEach
            // Respawn replaces the player object while preserving its UUID and party store.
            // Retire its observer before it can acquire or replace the live control session.
            if (!CompanionControl.isCurrentPlayer(watch.player)) {
                remove(watch.player)
                return@forEach
            }
            if (watch.changed.getAndSet(false)) watch.dirty.addAll(watch.channels.keys)
            if (server.tickCount % 20 == 0) watch.observations.keys.toList().forEach { channel ->
                val value = environment(watch.player, watch.channels.getValue(channel))
                if (watch.observations[channel] != value) { watch.observations[channel] = value; watch.dirty.add(channel) }
            }
            if (watch.dirty.isEmpty()) return@forEach
            val changed = watch.dirty.toList(); watch.dirty.clear()
            val session = CompanionControl.session(watch.player)
            changed.forEach channel@ { channel ->
                val pokemon = watch.channels[channel] ?: return@channel
                changes += watch.player to ContentInvalidation(session.id, CombatServices.CONTENT.epoch(), channel, pokemon, ++watch.revision)
            }
        }
        return changes
    }
    fun remove(player: ServerPlayer) { watches.remove(player)?.subscription?.unsubscribe() }
    fun entityChanged(entity: net.minecraft.world.entity.Entity) {
        if (entity is ServerPlayer) { entity.server.execute { watches[entity]?.let { it.dirty.addAll(it.channels.keys) } }; return }
        val pokemon = (entity as? com.cobblemon.mod.common.entity.pokemon.PokemonEntity)?.pokemon ?: return
        val server = (entity.level() as? net.minecraft.server.level.ServerLevel)?.server ?: return
        val id = pokemon.uuid
        server.execute { watches.values.forEach { watch ->
            if (watch.player.server === server) watch.channels.forEach { (channel, observed) -> if (observed == id) watch.dirty.add(channel) }
        } }
    }
    private fun environment(player: ServerPlayer, id: UUID): String? {
        val entity = NativeContentChannels.owned(player, id)?.entity ?: return null
        if (entity.level() !== player.level() || !entity.isAlive) return null
        val level = entity.level(); val pos = entity.blockPosition()
        if (!level.hasChunkAt(pos)) return null
        return "${level.dimension().location()}/${level.isDay}/${level.canSeeSky(pos)}/${level.getBrightness(net.minecraft.world.level.LightLayer.SKY, pos)}/${kotlin.math.round(level.getRainLevel(1f) * 20)}"
    }
    fun reset() { watches.values.forEach { it.subscription?.unsubscribe() }; watches.clear() }
}
