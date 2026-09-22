package dev.worldcombat.cobblemon.script

import com.cobblemon.mod.common.Cobblemon
import com.cobblemon.mod.common.api.pokeball.catching.CatchRateModifier
import com.cobblemon.mod.common.entity.pokemon.PokemonEntity
import com.cobblemon.mod.common.pokemon.Pokemon
import dev.worldcombat.core.world.CombatServices
import dev.latvian.mods.kubejs.script.ConsoleJS
import net.minecraft.server.level.ServerPlayer
import net.minecraft.world.damagesource.DamageSource
import net.minecraft.world.entity.LivingEntity
import java.util.WeakHashMap
import java.util.function.Consumer

/** Native modifier decorator. All ball selection and elapsed-time rules are authored in content. */
object CaptureContent {
    private var epoch = -1L
    private var handler: Consumer<CaptureView>? = null
    private val states = WeakHashMap<ServerPlayer, WeakHashMap<Pokemon, MutableMap<String, Double>>>()
    fun register(expectedEpoch: Long, callback: Consumer<CaptureView>) {
        check(expectedEpoch == CombatServices.CONTENT.epoch() && !CombatServices.CONTENT.ready())
        check(epoch != expectedEpoch || handler == null) { "Duplicate capture policy" }
        epoch = expectedEpoch; handler = callback; states.clear()
    }
    private fun dispatch(player: ServerPlayer, pokemon: Pokemon, ball: String, kind: String): Float? {
        val callback = handler?.takeIf { epoch == CombatServices.CONTENT.epoch() && CombatServices.CONTENT.ready() } ?: return null
        CombatServices.get(player.server).checkThread()
        var view: CaptureView? = null
        return try {
            val state = states.getOrPut(player) { WeakHashMap() }.getOrPut(pokemon) { linkedMapOf() }
            view = CaptureView(player, pokemon, ball, kind, state)
            callback.accept(view)
            view.finish()
        } catch (error: RuntimeException) {
            handler = null
            ConsoleJS.SERVER.error("WorldCombat capture policy disabled", error)
            null
        } finally { view?.close() }
    }
    fun damaged(target: PokemonEntity, source: DamageSource) {
        val player = when (val attacker = source.entity) {
            is ServerPlayer -> attacker
            is PokemonEntity -> attacker.pokemon.getOwnerPlayer()
            else -> null
        } ?: return
        dispatch(player, target.pokemon, "", "interaction")
    }
    @JvmStatic fun wrap(ball: String, original: CatchRateModifier): CatchRateModifier = object : CatchRateModifier {
        private fun replacement(thrower: LivingEntity, pokemon: Pokemon) =
            (thrower as? ServerPlayer)?.let { dispatch(it, pokemon, ball, "capture") }
        override fun isGuaranteed() = original.isGuaranteed()
        override fun isValid(thrower: LivingEntity, pokemon: Pokemon) = original.isValid(thrower, pokemon)
        override fun behavior(thrower: LivingEntity, pokemon: Pokemon) = original.behavior(thrower, pokemon)
        override fun value(thrower: LivingEntity, pokemon: Pokemon) = replacement(thrower, pokemon) ?: original.value(thrower, pokemon)
        override fun modifyCatchRate(currentCatchRate: Float, thrower: LivingEntity, pokemon: Pokemon): Float {
            val value = replacement(thrower, pokemon) ?: return original.modifyCatchRate(currentCatchRate, thrower, pokemon)
            return behavior(thrower, pokemon).mutator(currentCatchRate, value)
        }
    }
}

class CaptureView internal constructor(private val player: ServerPlayer, pokemon: Pokemon, private val ballId: String,
    private val kindValue: String, private val state: MutableMap<String, Double>) {
    private val epoch = CombatServices.CONTENT.epoch()
    private val now = player.server.tickCount.toDouble()
    private val pokemonView = PokemonView.capture(pokemon)
    private val active = Cobblemon.storage.getParty(player).mapNotNull { member ->
        member.entity?.takeIf { it.level() === player.level() && it.isAlive && !it.isBusy && !it.isEvolving }
            ?.let(PokemonView::capture) }
    private val numbers = state.toMap()
    private val writes = linkedMapOf<String, Double>()
    private var open = true
    private var replacement: Float? = null
    fun kind() = kindValue
    fun ball() = ballId
    fun target() = pokemonView
    fun tick() = now
    fun activeCount() = active.size
    fun active(index: Int) = active[index]
    fun number(key: String) = writes[key] ?: numbers[key] ?: Double.NaN
    private fun checkOpen() {
        CombatServices.get(player.server).checkThread()
        check(open && epoch == CombatServices.CONTENT.epoch() && CombatServices.CONTENT.ready()) { "Capture event has expired" }
    }
    fun setNumber(key: String, value: Double) {
        checkOpen(); require(key.matches(Regex("[a-zA-Z0-9_.:-]{1,64}")) && value.isFinite())
        require((numbers.keys + writes.keys + key).size <= 16)
        writes[key] = value
    }
    fun multiplier(value: Double) {
        checkOpen(); require(value.isFinite() && value in 0.0..64.0); check(replacement == null)
        replacement = value.toFloat()
    }
    internal fun finish(): Float? { checkOpen(); state.putAll(writes); open = false; return replacement }
    internal fun close() { open = false }
}
