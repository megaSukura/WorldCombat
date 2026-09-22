package dev.worldcombat.cobblemon.script

import com.cobblemon.mod.common.entity.pokemon.PokemonEntity
import com.cobblemon.mod.common.pokemon.Pokemon
import dev.worldcombat.core.world.PublicAttributes
import dev.worldcombat.core.world.CombatServices
import dev.worldcombat.core.runtime.ActorHandle
import dev.worldcombat.core.runtime.WorldAccess
import net.minecraft.nbt.CompoundTag
import net.minecraft.nbt.Tag
import net.minecraft.world.entity.ai.attributes.AttributeInstance
import net.minecraft.core.registries.BuiltInRegistries
import net.minecraft.resources.ResourceLocation
import net.neoforged.neoforge.server.ServerLifecycleHooks
import java.util.Collections
import java.util.IdentityHashMap

/** Preserve native base values and permanent modifiers across Cobblemon's recreated world entities. */
object NativePublicAttributes {
    private const val KEY = "WorldCombatNativeAttributes"
    private val dirty = Collections.newSetFromMap(IdentityHashMap<PokemonEntity, Boolean>())
    fun changed(entity: PokemonEntity) { dirty.add(entity) }
    fun flush() {
        val pending = dirty.toList(); dirty.clear()
        pending.forEach { save(it); NativeContentSubscriptions.entityChanged(it) }
    }
    fun reset() { dirty.clear() }
    fun restore(entity: PokemonEntity) {
        val saved = entity.pokemon.persistentData.getCompound(KEY)
        PublicAttributes.entries().forEach { holder ->
            val id = holder.id.toString()
            if (saved.contains(id, Tag.TAG_COMPOUND.toInt())) entity.getAttribute(holder)?.load(saved.getCompound(id))
        }
    }
    fun save(entity: PokemonEntity) {
        dirty.remove(entity)
        if (entity.pokemon.entity != null && entity.pokemon.entity !== entity) return
        val stored = CompoundTag()
        PublicAttributes.entries().forEach { holder -> entity.getAttribute(holder)?.let { stored.put(holder.id.toString(), it.save()) } }
        if (stored != entity.pokemon.persistentData.getCompound(KEY)) {
            entity.pokemon.persistentData.put(KEY, stored)
            entity.pokemon.onChange()
        }
    }
    fun snapshot(pokemon: Pokemon): Map<String, NativeAttributeView> {
        val saved = pokemon.persistentData.getCompound(KEY)
        return PublicAttributes.entries().associate { holder ->
            val id = holder.id.toString()
            val instance = pokemon.entity?.getAttribute(holder) ?: AttributeInstance(holder) {}.also {
                if (saved.contains(id, Tag.TAG_COMPOUND.toInt())) it.load(saved.getCompound(id))
            }
            id to NativeAttributeView(instance)
        }
    }
    fun compareBase(world: WorldAccess, actor: ActorHandle, id: String, expected: Double, value: Double): Boolean {
        world.requireMutation(actor)
        require(expected.isFinite() && value.isFinite())
        val server = ServerLifecycleHooks.getCurrentServer() ?: error("Server stopped")
        val entity = CombatServices.get(server).inspect(actor) as? PokemonEntity ?: error("Pokemon left")
        val holder = BuiltInRegistries.ATTRIBUTE.getHolder(ResourceLocation.parse(id)).orElseThrow()
        require(PublicAttributes.entries().any { it.id == ResourceLocation.parse(id) })
        val instance = entity.getAttribute(holder) ?: error("Missing native attribute")
        if (instance.baseValue != expected) return false
        instance.baseValue = value
        save(entity)
        return true
    }
}

class NativeAttributeView(instance: AttributeInstance) {
    private val base = instance.baseValue
    private val actual = instance.value
    private val terms = instance.modifiers.map { modifier -> mapOf("id" to modifier.id().toString(), "amount" to modifier.amount(), "operation" to modifier.operation().serializedName) }
    fun base() = base
    fun value() = actual
    fun modifiers() = com.google.gson.Gson().toJson(terms)
}
