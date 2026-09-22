package dev.worldcombat.cobblemon.script

import com.cobblemon.mod.common.Cobblemon
import com.cobblemon.mod.common.api.moves.Move
import com.cobblemon.mod.common.api.pokemon.experience.SidemodExperienceSource
import com.cobblemon.mod.common.api.pokemon.stats.SidemodEvSource
import com.cobblemon.mod.common.api.pokemon.stats.Stat
import com.cobblemon.mod.common.entity.pokemon.PokemonEntity
import com.cobblemon.mod.common.pokemon.Pokemon
import dev.worldcombat.cobblemon.CobblemonWorldCombat
import dev.worldcombat.core.world.CombatServices
import net.minecraft.server.level.ServerLevel

class GrowthEvent internal constructor(private val kind: String, actor: PokemonEntity,
    target: PokemonEntity?, private val moveValue: Move?, private val amountValue: Int, private val causeValue: String) {
    private val server = (actor.level() as ServerLevel).server
    private val epoch = CombatServices.CONTENT.epoch()
    private val pokemon = actor.pokemon
    private val defeated = target?.pokemon
    private val owner = pokemon.getOwnerUUID()
    private val actorView = PokemonView.capture(pokemon)
    private val targetView = defeated?.let(PokemonView::capture)
    private val moveView = moveValue?.let(PokemonMoveView::capture)
    private var open = true
    private val progress = linkedMapOf<String, Int>()
    private val recipients = (if (kind == "defeat" && owner != null)
        Cobblemon.storage.getParty(owner, server.registryAccess()).toList() else emptyList())
        .map { GrowthRecipient(this, it, it === pokemon) }
    fun kind() = kind
    fun actor() = actorView
    fun target() = targetView
    fun move() = moveView
    fun amount() = amountValue
    fun cause() = causeValue
    fun recipientCount() = recipients.size
    fun recipient(index: Int) = recipients[index]
    fun config(key: String): Double = when (key) {
        "experienceMultiplier" -> Cobblemon.config.experienceMultiplier.toDouble()
        "experienceShareMultiplier" -> Cobblemon.config.experienceShareMultiplier
        "luckyEggMultiplier" -> Cobblemon.config.luckyEggMultiplier
        "awardExperienceToFaintedPokemon" -> if (Cobblemon.config.awardExperienceToFaintedPokemon) 1.0 else 0.0
        else -> throw IllegalArgumentException("Unknown native growth setting: $key")
    }
    fun record(id: String, amount: Double) {
        checkOpen()
        require(id in NativeProgress.ids && id !in progress)
        progress[id] = quantity(amount)
    }
    internal fun checkOpen() {
        CombatServices.get(server).checkThread()
        check(open && epoch == CombatServices.CONTENT.epoch() && CombatServices.CONTENT.ready()) { "Growth event has expired" }
    }
    internal fun apply() {
        checkOpen()
        check(pokemon.getOwnerUUID() == owner) { "Growth ownership changed" }
        recipients.forEach { check(it.individual.getOwnerUUID() == owner) { "Recipient ownership changed" } }
        open = false
        progress.forEach { (id, amount) -> NativeProgress.add(pokemon, id, amount, moveValue?.template, defeated) }
        recipients.forEach { recipient ->
            val individual = recipient.individual
            recipient.evs.forEach { (stat, amount) ->
                individual.evs.add(stat, amount, SidemodEvSource(CobblemonWorldCombat.MOD_ID, individual))
            }
            recipient.xp?.let { amount ->
                val source = SidemodExperienceSource(CobblemonWorldCombat.MOD_ID)
                val player = individual.getOwnerPlayer()
                val result = if (player == null) individual.addExperience(source, amount)
                    else individual.addExperienceWithPlayer(player, source, amount)
                CobblemonWorldCombat.LOGGER.info("WorldCombat growth pokemon={} experience={}", individual.uuid, result.experienceAdded)
            }
        }
    }
    internal fun close() { open = false }
    internal fun quantity(value: Double): Int {
        require(value.isFinite() && value in 0.0..1_000_000.0 && value == value.toInt().toDouble()) { "Growth amounts must be bounded nonnegative integers" }
        return value.toInt()
    }
}

class GrowthRecipient internal constructor(private val event: GrowthEvent, internal val individual: Pokemon,
    private val participant: Boolean) {
    private val view = PokemonView.capture(individual)
    private val readyEvolution = individual.evolutionProxy.server().any { evolution ->
        evolution.requirements.any { it is com.cobblemon.mod.common.pokemon.requirements.LevelRequirement } &&
            evolution.requirements.all { it.check(individual) } }
    internal var xp: Int? = null
    internal val evs = linkedMapOf<Stat, Int>()
    fun pokemon() = view
    fun participated() = participant
    fun readyLevelEvolution() = readyEvolution
    fun experience(amount: Double) {
        event.checkOpen(); check(xp == null) { "Experience already planned" }; xp = event.quantity(amount)
    }
    fun ev(id: String, amount: Double) {
        event.checkOpen()
        val stat = Cobblemon.statProvider.ofType(Stat.Type.PERMANENT).firstOrNull { it.identifier.toString() == id || it.showdownId == id }
            ?: throw IllegalArgumentException("Unknown permanent stat: $id")
        check(stat !in evs) { "EV yield already planned" }; evs[stat] = event.quantity(amount)
    }
}
