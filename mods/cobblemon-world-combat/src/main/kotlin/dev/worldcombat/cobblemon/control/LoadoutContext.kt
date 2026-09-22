package dev.worldcombat.cobblemon.control

import dev.worldcombat.cobblemon.script.PokemonView
import dev.worldcombat.core.runtime.ActionDefinition
import dev.worldcombat.core.world.CombatServices

/** One read-only individual and one script-authored slot result. */
class LoadoutContext(private val pokemon: PokemonView, private val slot: Int, private val actor: dev.worldcombat.core.runtime.ActorHandle? = null) {
    private var open = true
    private var action = ""
    private var key = ""
    private var label = ""
    private var reason = "empty-slot"
    private var remaining = -1
    private var maximum = -1
    private var reach: Double? = null
    private val arguments = linkedMapOf<String, String>()
    private val observation by lazy {
        val source = checkNotNull(actor) { "No loaded actor for this loadout" }
        val server = net.neoforged.neoforge.server.ServerLifecycleHooks.getCurrentServer() ?: error("Server stopped")
        dev.worldcombat.core.runtime.WorldAccess(CombatServices.get(server).runtime(), source, null,
            { check(open) { "Loadout callback returned" } }, false, 0)
    }
    fun pokemon() = pokemon
    fun slot() = slot
    fun world(): dev.worldcombat.core.runtime.WorldAccess { check(open); return observation }
    fun bind(action: String, key: String, label: String) {
        check(open)
        require(action.length <= 128 && key.length <= 128 && label.length <= 128)
        this.action = action; this.key = key; this.label = label; reason = ""
    }
    fun unavailable(reason: String) {
        check(open); require(reason.matches(Regex("[a-z0-9-]{1,64}"))); this.reason = reason
    }
    fun resource(remaining: Int, maximum: Int) {
        check(open); require(remaining in 0..1_000_000 && maximum in 0..1_000_000)
        this.remaining = remaining; this.maximum = maximum
    }
    /** Current script-resolved reach, shared by preview, manual approach and AI callers. */
    fun range(value:Double) { check(open);require(value.isFinite()&&value>=0);reach=value }
    fun argument(key: String, value: String) {
        check(open); require(key.matches(Regex("[a-zA-Z0-9_:.-]{1,64}")) && value.length <= 256)
        require(arguments.size < 16 || key in arguments)
        arguments[key] = value
    }
    internal fun close(): SkillBinding {
        open = false
        val definition = CombatServices.CONTENT.get(action)
        val version = if (definition == null) "" else "${definition.version()}/$action/$key"
        return SkillBinding(action, definition, version, label, remaining, maximum,
            reason.ifEmpty { if (definition == null) "content-unavailable" else "" }, arguments.toMap(),
            minOf(reach?:definition?.range()?:0.0,definition?.range()?:0.0))
    }
}

data class SkillBinding(val id: String, val definition: ActionDefinition?, val version: String,
                        val label: String, val remaining: Int, val maximum: Int, val reason: String,
                        val arguments: Map<String, String>, val range:Double=definition?.range()?:0.0) {
    fun available() = definition != null && reason.isEmpty()
    companion object {
        fun empty() = SkillBinding("", null, "", "", -1, -1, "content-unavailable", emptyMap())
    }
}
