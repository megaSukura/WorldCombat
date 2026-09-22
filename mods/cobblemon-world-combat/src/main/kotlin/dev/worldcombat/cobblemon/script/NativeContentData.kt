package dev.worldcombat.cobblemon.script

import com.cobblemon.mod.common.entity.pokemon.PokemonEntity
import com.cobblemon.mod.common.pokemon.Pokemon
import com.google.gson.JsonArray
import com.google.gson.JsonElement
import com.google.gson.JsonObject
import com.google.gson.JsonPrimitive
import dev.worldcombat.core.runtime.ActionInactiveException
import dev.worldcombat.core.runtime.ActorHandle
import dev.worldcombat.core.runtime.WorldAccess
import dev.worldcombat.core.runtime.effect.EffectData
import dev.worldcombat.core.world.CombatServices
import net.minecraft.nbt.Tag
import net.neoforged.neoforge.server.ServerLifecycleHooks

/** Individual content storage. Keys and JSON have no host-owned gameplay fields. */
object NativeContentData {
    private const val ROOT = "WorldCombat"
    private const val CONTENT = "Content"

    internal data class Change(val expected: String?, val value: String?)

    /** Object ordering and numeric spelling do not change a compare-and-write value. */
    fun canonical(json: String): String {
        val result = EffectData.GSON.toJson(ordered(com.google.gson.JsonParser.parseString(EffectData.copy(json))))
        return result
    }
    /** UI documents and stored values share the same logical JSON contract. */
    fun document(json: String): String {
        val parsed = EffectData.copy(json)
        val result = EffectData.GSON.toJson(ordered(com.google.gson.JsonParser.parseString(parsed)))
        return result
    }

    private fun ordered(value: JsonElement): JsonElement = when {
        value.isJsonObject -> JsonObject().also { result ->
            value.asJsonObject.entrySet().sortedBy { it.key }.forEach { result.add(it.key, ordered(it.value)) }
        }
        value.isJsonArray -> JsonArray().also { result -> value.asJsonArray.forEach { result.add(ordered(it)) } }
        value.isJsonPrimitive && value.asJsonPrimitive.isNumber -> JsonPrimitive(value.asBigDecimal.stripTrailingZeros())
        else -> value.deepCopy()
    }

    private fun resolve(world: WorldAccess, actor: ActorHandle, write: Boolean): Pokemon {
        if (write) world.requireMutation(actor) else {
            world.check()
            if (!world.valid(actor)) throw ActionInactiveException("Pokemon left the observation")
        }
        val server = ServerLifecycleHooks.getCurrentServer() ?: throw ActionInactiveException("Server stopped")
        return (CombatServices.get(server).inspect(actor) as? PokemonEntity)?.pokemon
            ?: throw ActionInactiveException("Pokemon left")
    }

    fun data(world: WorldAccess, actor: ActorHandle, key: String): String? = read(resolve(world, actor, false), key)

    fun compareData(world: WorldAccess, actor: ActorHandle, key: String, expected: String?, value: String?): Boolean =
        compare(resolve(world, actor, true), mapOf(EffectData.id(key) to Change(expected?.let(::canonical), value?.let(::canonical))))

    internal fun read(pokemon: Pokemon, key: String): String? {
        EffectData.id(key)
        val content = pokemon.persistentData.getCompound(ROOT).getCompound(CONTENT)
        if (!content.contains(key)) return null
        return canonical(dev.worldcombat.core.world.NbtJson.read(content.get(key)))
    }

    /** Validate the entire change set before publishing one copied native compound. */
    internal fun compare(pokemon: Pokemon, changes: Map<String, Change>): Boolean {
        if (changes.isEmpty()) return true
        val normalized = changes.mapKeys { EffectData.id(it.key) }.mapValues { (_, change) ->
            Change(change.expected?.let(::canonical), change.value?.let(::canonical))
        }
        if (normalized.any { (key, change) -> read(pokemon, key) != change.expected }) return false
        val root = pokemon.persistentData.getCompound(ROOT).copy()
        val content = root.getCompound(CONTENT).copy()
        normalized.forEach { (key, change) ->
            if (change.value == null) content.remove(key) else content.put(key, dev.worldcombat.core.world.NbtJson.write(change.value))
        }
        if (normalized.all { (_, change) -> change.expected == change.value }) return true
        if (content.isEmpty) root.remove(CONTENT) else root.put(CONTENT, content)
        pokemon.persistentData.put(ROOT, root)
        pokemon.onChange()
        return true
    }
}
