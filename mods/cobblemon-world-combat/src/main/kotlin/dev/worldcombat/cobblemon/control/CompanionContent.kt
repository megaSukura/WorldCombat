package dev.worldcombat.cobblemon.control

import dev.worldcombat.core.world.CombatServices
import dev.worldcombat.core.runtime.ActorHandle
import dev.worldcombat.cobblemon.script.PokemonScriptApi

/** Script-authored loadout and decisions, invalidated with the script epoch. */
object CompanionContent {
    private var epoch = -1L
    private var decision: java.util.function.Consumer<TacticsContext>? = null
    private var loadout: java.util.function.Consumer<LoadoutContext>? = null
    private val slots = arrayOfNulls<String>(4)
    fun slot(expectedEpoch: Long, slot: Int, action: String) {
        require(slot in 0..3)
        loading(expectedEpoch)
        check(loadout == null) { "Choose a fixed or dynamic loadout" }
        check(slots[slot] == null) { "Duplicate skill slot" }
        slots[slot] = action
    }
    fun brain(expectedEpoch: Long, handler: java.util.function.Consumer<TacticsContext>) {
        loading(expectedEpoch)
        check(decision == null) { "Duplicate tactics handler" }
        decision = handler
    }
    fun loadout(expectedEpoch: Long, handler: java.util.function.Consumer<LoadoutContext>) {
        loading(expectedEpoch)
        check(loadout == null && slots.all { it == null }) { "Duplicate loadout handler" }
        loadout = handler
    }
    private fun loading(expectedEpoch: Long) {
        check(expectedEpoch == CombatServices.CONTENT.epoch() && !CombatServices.CONTENT.ready())
        if (epoch != expectedEpoch) { slots.fill(null); decision = null; loadout = null; epoch = expectedEpoch }
    }
    fun brain() = decision.takeIf { epoch == CombatServices.CONTENT.epoch() && CombatServices.CONTENT.ready() }
    fun disableBrain(error: RuntimeException) {
        decision = null
        dev.latvian.mods.kubejs.script.ConsoleJS.SERVER.error("WorldCombat tactics disabled", error)
    }
    fun resolve(actor: ActorHandle?, slot: Int): SkillBinding {
        if (actor == null || slot !in slots.indices || epoch != CombatServices.CONTENT.epoch() || !CombatServices.CONTENT.ready())
            return SkillBinding.empty()
        val handler = loadout
        if (handler != null) {
            val view = LoadoutContext(PokemonScriptApi().pokemon(actor), slot, actor)
            return try {
                handler.accept(view)
                view.close()
            } catch (error: RuntimeException) {
                view.close(); loadout = null
                dev.latvian.mods.kubejs.script.ConsoleJS.SERVER.error("WorldCombat loadout disabled", error)
                SkillBinding.empty()
            }
        }
        val id = slots[slot] ?: return SkillBinding.empty()
        val definition = CombatServices.CONTENT.get(id)
        return SkillBinding(id, definition, definition?.version() ?: "", "skill.${id.replace(':', '.')}",
            -1, -1, if (definition == null) "content-unavailable" else "", emptyMap())
    }
}
