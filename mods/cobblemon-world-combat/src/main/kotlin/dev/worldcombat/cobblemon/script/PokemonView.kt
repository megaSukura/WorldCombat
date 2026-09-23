package dev.worldcombat.cobblemon.script

import com.cobblemon.mod.common.Cobblemon
import com.cobblemon.mod.common.api.moves.Move
import com.cobblemon.mod.common.api.moves.MoveTemplate
import com.cobblemon.mod.common.api.pokemon.stats.Stat
import com.cobblemon.mod.common.entity.pokemon.PokemonEntity
import com.cobblemon.mod.common.entity.pokemon.PokemonServerDelegate
import net.minecraft.core.registries.BuiltInRegistries
import com.cobblemon.mod.common.pokemon.Pokemon
import com.google.gson.Gson
import java.util.Locale

/** Value snapshots: retaining a view never retains a mutable Pokemon, Move or ItemStack. */
class PokemonView private constructor(
    private val uuid: String,
    private val speciesId: String,
    private val levelValue: Int,
    private val hp: Int,
    private val maxHp: Int,
    private val worldHpScale: Double,
    private val natureId: String,
    private val effectiveNatureId: String,
    private val abilityId: String,
    private val heldItemId: String,
    private val types: List<String>,
    private val stats: Map<String, Values>,
    private val moves: List<PokemonMoveView?>,
    private val facts: NativeFacts,
    private val worldAttributes: Map<String, NativeAttributeView>,
    private val pastureValue: PastureView?
) {
    private data class Values(val value: Int, val base: Int?, val iv: Int, val effectiveIv: Int, val ev: Int, val yield: Int)
    private data class NativeFacts(val owner: String, val originalTrainer: String, val friendship: Int,
        val experience: Int, val baseExperience: Int, val heldTags: Set<String>,
        val form: String, val status: String, val wild: Boolean, val gender: String,
        val heldKey: String, val statusKey: String, val statusSeconds: Int, val weight: Double, val canEvolve: Boolean,
        val activeState: String, val pose: String, val grounded: Boolean, val ridingStyle: String,
        val vehicle: Boolean, val passenger: Boolean, val driver: String,
        val aiEnabled: Boolean, val accessibleMoves: Set<String>, val projectedArmor: Double, val projectedToughness: Double, val heldDescriptionId: String,
        val aspects: Set<String>, val statIds: List<String>, val heldStack: dev.worldcombat.core.runtime.ItemObservation,
        val shiny: Boolean, val scale: Double, val teraType: String, val dynamaxLevel: Int, val gigantamaxFactor: Boolean)
    fun attribute(id: String) = worldAttributes[id]
    fun id() = uuid
    fun species() = speciesId
    fun level() = levelValue
    fun health() = hp
    fun maxHealth() = maxHp
    /** Minecraft health units per native Pokemon HP, for the existing hit settlement boundary. */
    fun healthScale() = worldHpScale
    /** Native DEF projection already represented by a script using the permanent defence stat. */
    fun projectedArmor() = facts.projectedArmor
    fun projectedToughness() = facts.projectedToughness
    fun nature() = natureId
    fun effectiveNature() = effectiveNatureId
    fun ability() = abilityId
    fun heldItem() = heldItemId
    fun heldDescriptionId() = facts.heldDescriptionId
    fun heldStack() = facts.heldStack
    fun heldTag(id: String) = id in facts.heldTags
    fun owner() = facts.owner
    fun originalTrainer() = facts.originalTrainer
    fun friendship() = facts.friendship
    fun experience() = facts.experience
    fun baseExperience() = facts.baseExperience
    fun form() = facts.form
    fun aspects(): String = JSON.toJson(facts.aspects.sorted())
    fun aspect(name: String) = name in facts.aspects
    fun shiny() = facts.shiny
    fun scale() = facts.scale
    fun teraType() = facts.teraType
    fun dynamaxLevel() = facts.dynamaxLevel
    fun gigantamaxFactor() = facts.gigantamaxFactor
    fun status() = facts.status
    fun wild() = facts.wild
    fun gender() = facts.gender
    fun heldKey() = facts.heldKey
    fun statusKey() = facts.statusKey
    fun statusSeconds() = facts.statusSeconds
    fun weight() = facts.weight
    fun canEvolve() = facts.canEvolve
    fun activeState() = facts.activeState
    fun pasture() = pastureValue
    fun pose() = facts.pose
    fun grounded() = facts.grounded
    fun ridingStyle() = facts.ridingStyle
    /** Riding and physical state can change within the same tick without a Pokemon data mutation. */
    internal fun matchesMovement(entity: PokemonEntity): Boolean = facts.vehicle == entity.isVehicle &&
        facts.passenger == entity.isPassenger && facts.grounded == entity.onGround() &&
        facts.driver == (entity.controllingPassenger?.uuid?.toString() ?: "") &&
        facts.ridingStyle == (entity.takeIf { it.isVehicle }?.ridingController?.context?.style?.name?.lowercase(Locale.ROOT) ?: "")
    fun vehicle() = facts.vehicle
    fun passenger() = facts.passenger
    fun driver() = facts.driver
    fun aiEnabled() = facts.aiEnabled
    fun accessibleMoves(): String = JSON.toJson(facts.accessibleMoves.sorted())
    fun canAccessMove(id: String) = id in facts.accessibleMoves
    fun typeCount() = types.size
    fun type(index: Int) = types[index]
    fun stat(id: String) = values(id).value
    fun baseStat(id: String) = values(id).base
    fun statIds(): String = JSON.toJson(facts.statIds)
    fun iv(id: String) = values(id).iv
    fun effectiveIv(id: String) = values(id).effectiveIv
    fun ev(id: String) = values(id).ev
    fun evYield(id: String) = values(id).yield
    fun moveSlots() = moves.size
    fun move(slot: Int) = moves[slot]
    private fun values(id: String) = stats[id] ?: throw IllegalArgumentException("Unknown permanent stat: $id")

    companion object {
        private val JSON = Gson()
        fun capture(entity: PokemonEntity): PokemonView = capture(entity.pokemon)
        fun capture(pokemon: Pokemon): PokemonView {
            val stats = mutableMapOf<String, Values>()
            val statIds = mutableListOf<String>()
            // Use the installed provider, including addon stats and native cultivation modifiers.
            for (stat in Cobblemon.statProvider.ofType(Stat.Type.PERMANENT)) {
                statIds += stat.identifier.toString()
                val values = Values(pokemon.getStat(stat), pokemon.form.baseStats[stat], pokemon.ivs.getOrDefault(stat),
                    pokemon.ivs.getEffectiveBattleIV(stat), pokemon.evs.getOrDefault(stat), pokemon.form.evYield[stat] ?: 0)
                stats[stat.identifier.toString()] = values
                stats[stat.showdownId] = values
            }
            val held = pokemon.heldItem()
            val entity = pokemon.entity
            val access = entity?.registryAccess() ?: net.neoforged.neoforge.server.ServerLifecycleHooks.getCurrentServer()?.registryAccess()
                ?: net.minecraft.core.RegistryAccess.fromRegistryOfRegistries(BuiltInRegistries.REGISTRY)
            val projectedDefence = ((entity?.delegate as? PokemonServerDelegate) ?: PokemonServerDelegate())
                .defenceToArmourCurve(pokemon.defence)
            return PokemonView(pokemon.uuid.toString(), pokemon.species.resourceIdentifier.toString(),
                pokemon.level, pokemon.currentHealth, pokemon.maxHealth,
                (pokemon.entity?.maxHealth?.toDouble() ?: pokemon.maxHealth.toDouble()) / pokemon.maxHealth.coerceAtLeast(1),
                pokemon.nature.name.toString(), pokemon.effectiveNature.name.toString(), pokemon.ability.name,
                if (held.isEmpty) "" else BuiltInRegistries.ITEM.getKey(held.item).toString(),
                pokemon.types.map { it.showdownId() }, stats.toMap(),
                pokemon.moveSet.getMovesWithNulls().map { it?.let(PokemonMoveView::capture) },
                NativeFacts(pokemon.getOwnerUUID()?.toString() ?: "", pokemon.originalTrainer ?: "", pokemon.friendship,
                    pokemon.experience, pokemon.form.baseExperienceYield, held.tags.map { it.location().toString() }.toList().toSet(),
                    pokemon.form.name,
                    pokemon.status?.status?.name?.toString() ?: "", pokemon.isWild(), pokemon.gender.name.lowercase(Locale.ROOT),
                    NativeMechanics.heldKey(pokemon), NativeMechanics.statusKey(pokemon), pokemon.status?.secondsLeft ?: 0,
                    pokemon.form.weight.toDouble(), pokemon.form.evolutions.isNotEmpty(), pokemon.state.name,
                    entity?.getCurrentPoseType()?.name?.lowercase(Locale.ROOT) ?: "",
                    entity?.onGround() ?: false,
                    entity?.takeIf { it.isVehicle }?.ridingController?.context?.style?.name?.lowercase(Locale.ROOT) ?: "",
                    entity?.isVehicle ?: false, entity?.isPassenger ?: false, entity?.controllingPassenger?.uuid?.toString() ?: "",
                    entity != null && !entity.isNoAi,
                    (pokemon.allAccessibleMoves.map { it.name } + pokemon.moveSet.map { it.name }).toSet(),
                    projectedDefence.first, projectedDefence.second, if (held.isEmpty) "" else held.descriptionId,
                    pokemon.aspects.toSet(), statIds.sorted(), dev.worldcombat.core.world.NativeRegistryFacts.stack(access, held),
                    pokemon.shiny, pokemon.scaleModifier.toDouble(), pokemon.teraType.id.toString(), pokemon.dmaxLevel, pokemon.gmaxFactor),
                NativePublicAttributes.snapshot(pokemon), NativePasture.capture(entity))
        }
    }
}

class PokemonMoveView private constructor(
    private val moveKey: String, private val moveId: String, private val element: String, private val damageCategory: String,
    private val basePower: Double, private val chance: Double, private val currentPp: Int, private val maximumPp: Int,
    private val priorityValue: Int, private val criticalValue: Double,
    private val nativeTarget: String, private val nativeNumber: Int, private val basePpValue: Int,
    private val ppStages: Int, private val chances: String, private val metadata: NativeMoveData
) {
    fun key() = moveKey
    fun id() = moveId
    fun type() = element
    fun category() = damageCategory
    fun power() = basePower
    fun accuracy() = chance
    fun pp() = currentPp
    fun maxPp() = maximumPp
    fun priority() = priorityValue
    fun critRatio() = criticalValue
    fun target() = nativeTarget
    fun number() = nativeNumber
    fun basePp() = basePpValue
    fun raisedPpStages() = ppStages
    fun effectChances() = chances
    fun flags() = metadata.flags()
    fun flag(name: String) = metadata.flag(name)
    fun metadata() = metadata.metadata()

    companion object {
        private val JSON = Gson()
        fun capture(move: Move) = PokemonMoveView(NativeMoveKeys.key(move), move.name, move.type.showdownId(),
            move.damageCategory.name.lowercase(Locale.ROOT), move.power, move.accuracy, move.currentPp, move.maxPp, move.template.priority, move.template.critRatio,
            move.template.target.name, move.template.num, move.template.pp, move.raisedPpStages,
            JSON.toJson(move.template.effectChances), NativeMoveMetadata.of(move.name))
        fun capture(template: MoveTemplate) = PokemonMoveView("template:" + template.name, template.name, template.elementalType.showdownId(),
            template.damageCategory.name.lowercase(Locale.ROOT), template.power, template.accuracy, template.pp, template.pp, template.priority, template.critRatio,
            template.target.name, template.num, template.pp, 0, JSON.toJson(template.effectChances), NativeMoveMetadata.of(template.name))
    }
}
