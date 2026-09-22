package dev.worldcombat.cobblemon

import com.cobblemon.mod.common.entity.pokemon.PokemonEntity
import com.cobblemon.mod.common.pokemon.Pokemon
import kotlin.math.abs
import kotlin.math.ceil
import kotlin.math.round

object PokemonHealthBridge {
    private val worldWrites = ThreadLocal.withInitial { java.util.Collections.newSetFromMap(java.util.IdentityHashMap<Pokemon, Boolean>()) }
    private const val ROOT = "WorldCombat"
    private const val FRACTION = "HealthFraction"
    private const val ANCHOR = "HealthFractionAnchor"

    private fun fraction(pokemon: Pokemon): Double {
        val data = pokemon.persistentData.getCompound(ROOT)
        return if (data.getInt(ANCHOR) == pokemon.currentHealth) data.getDouble(FRACTION).coerceIn(0.0, 0.999999999) else 0.0
    }
    private fun fraction(pokemon: Pokemon, value: Double, anchor: Int) {
        val data = pokemon.persistentData.getCompound(ROOT).copy()
        if (value <= 0.00000001) { data.remove(FRACTION); data.remove(ANCHOR) }
        else { data.putDouble(FRACTION, value); data.putInt(ANCHOR, anchor) }
        if (data.isEmpty) pokemon.persistentData.remove(ROOT) else pokemon.persistentData.put(ROOT, data)
    }
    private fun writeWorldHealth(entity: PokemonEntity) {
        val pokemon = entity.pokemon
        val scaled = (pokemon.maxHealth * entity.health.toDouble() / entity.maxHealth).coerceIn(0.0, pokemon.maxHealth.toDouble())
        val precision = 2.0 * Math.ulp(entity.maxHealth) * pokemon.maxHealth / entity.maxHealth
        val nearest = round(scaled)
        val exact = if (abs(scaled - nearest) <= precision) nearest else scaled
        val health = if (entity.health <= 0F) 0 else ceil(exact).toInt().coerceIn(1, pokemon.maxHealth)
        fraction(pokemon, if (health <= 0) 0.0 else health - exact, health)
        worldWrites.get().add(pokemon)
        try { pokemon.currentHealth = health }
        finally { worldWrites.get().remove(pokemon) }
        project(pokemon)
    }

    @JvmStatic
    fun afterDamage(entity: PokemonEntity, source: net.minecraft.world.damagesource.DamageSource) {
        if (entity.level().isClientSide || entity.maxHealth <= 0F) return
        val pokemon = entity.pokemon
        val before = pokemon.currentHealth
        val beforeExact = before - fraction(pokemon)
        val afterExact = pokemon.maxHealth * entity.health.toDouble() / entity.maxHealth
        writeWorldHealth(entity)
        if (beforeExact - afterExact > 0.000001) {
            dev.worldcombat.cobblemon.script.CaptureContent.damaged(entity, source)
            if (before > pokemon.currentHealth) dev.worldcombat.cobblemon.script.GrowthContent.damaged(entity, before - pokemon.currentHealth, source.msgId)
            dev.worldcombat.core.world.CombatServices.get((entity.level() as net.minecraft.server.level.ServerLevel).server).applied(entity, source)
        }
    }

    @JvmStatic
    fun afterHealing(entity: PokemonEntity) {
        if (!entity.level().isClientSide && entity.maxHealth > 0F) writeWorldHealth(entity)
    }

    /** A native item/heal/assignment supplies a new authoritative integer HP value. */
    @JvmStatic
    fun nativeWrite(pokemon: Pokemon) {
        if (!worldWrites.get().contains(pokemon)) fraction(pokemon, 0.0, pokemon.currentHealth)
        project(pokemon)
    }

    /** Native codec initialization recalculates species HP after loading persistent precision data. */
    @JvmStatic
    fun initializationFraction(pokemon: Pokemon): Double = fraction(pokemon).let { if (it.isFinite()) it else 0.0 }

    @JvmStatic
    fun afterInitialization(pokemon: Pokemon, retained: Double, anchor: Int) {
        // Preserve a saved sub-HP remainder only when initialization retained the authoritative integer HP.
        if (retained > 0.0 && retained < 1.0 && retained.isFinite() && pokemon.currentHealth == anchor) {
            fraction(pokemon, retained, anchor)
            project(pokemon)
        }
    }

    @JvmStatic
    fun project(pokemon: Pokemon) {
        val entity = pokemon.entity ?: return
        project(entity, pokemon)
    }

    /** During send-out the delegate already has the entity before Pokemon.state exposes it. */
    @JvmStatic
    fun project(entity: PokemonEntity) {
        project(entity, entity.pokemon)
    }

    private fun project(entity: PokemonEntity, pokemon: Pokemon) {
        if (entity.level().isClientSide || pokemon.maxHealth <= 0) return
        entity.health = (entity.maxHealth.toDouble() * (pokemon.currentHealth - fraction(pokemon)) / pokemon.maxHealth).toFloat()
    }
}
