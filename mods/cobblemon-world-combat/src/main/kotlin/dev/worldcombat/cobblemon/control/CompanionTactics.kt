package dev.worldcombat.cobblemon.control

import com.cobblemon.mod.common.entity.pokemon.PokemonEntity
import dev.worldcombat.core.runtime.ActionRejectedException
import dev.worldcombat.core.runtime.effect.EffectData
import dev.worldcombat.core.world.MinecraftCombat
import dev.worldcombat.cobblemon.network.ControlCommand

/** Native storage and callback lifetime bridge. Gameplay decisions are authored in TypeScript. */
object CompanionTactics {
    private const val KEY = "WorldCombat"
    fun load(s: CompanionControl.Session, entity: PokemonEntity?) {
        val data = entity?.pokemon?.persistentData?.getCompound(KEY) ?: return
        s.body.preferences = if (data.contains("Preferences")) {
            try { EffectData.copy(data.getString("Preferences")) } catch (_: IllegalArgumentException) { "{}" }
        } else if (data.contains("Tactics")) com.google.gson.JsonObject().also {
            it.addProperty("tactics", data.getString("Tactics")); it.addProperty("permissions", data.getInt("Permissions")); it.addProperty("range", data.getInt("ChaseRange"))
        }.toString() else "{}"
    }
    fun save(s: CompanionControl.Session, combat: MinecraftCombat) {
        val pokemon = (s.actor?.let(combat::resolve) as? PokemonEntity)?.pokemon ?: return
        val preferences = com.google.gson.JsonParser.parseString(s.body.preferences).asJsonObject
        preferences.addProperty("tactics", s.tactics); preferences.addProperty("permissions", s.permissions); preferences.addProperty("range", s.chaseRange)
        s.body.preferences = preferences.toString()
        val data = pokemon.persistentData.getCompound(KEY).copy()
        data.putInt("Schema", 2); data.putString("Preferences", s.body.preferences)
        // Preserve readers of the existing UI protocol while storing extensible script preferences.
        data.putString("Tactics", s.tactics); data.putInt("Permissions", s.permissions); data.putInt("ChaseRange", s.chaseRange)
        pokemon.persistentData.put(KEY, data); pokemon.onChange()
    }
    fun command(s: CompanionControl.Session, command: ControlCommand, combat: MinecraftCombat) = invoke(s, combat, command.operation(), command)
    fun tick(s: CompanionControl.Session, combat: MinecraftCombat) {
        val entity = s.actor?.let(combat::resolve)
        if (entity != null && dev.worldcombat.cobblemon.review.ReviewTool.hold(entity)) return
        invoke(s, combat, "tick")
    }
    fun notice(s: CompanionControl.Session, combat: MinecraftCombat, operation: String, json: String) {
        val data = EffectData.copy(json); val selected = s.body
        try { for (body in s.members.values.toList()) { s.body = body; invoke(s, combat, operation, null, data) } }
        finally { s.body = selected }
    }
    private fun invoke(s: CompanionControl.Session, combat: MinecraftCombat, operation: String, command: ControlCommand? = null, notice: String = "{}") {
        val actor = s.actor ?: return
        if (!combat.valid(actor) || !combat.mayAct(actor, s.player.uuid)) return
        val handler = CompanionContent.brain()
        if (handler == null) { combat.controlled(actor, false); return }
        val context = TacticsContext(combat, s, operation, command, notice)
        val started = dev.worldcombat.core.runtime.ScriptProfile.start()
        try { handler.accept(context) }
        catch (error: ActionRejectedException) { if (operation != "tick") throw error else s.reason = error.reason() }
        catch (error: RuntimeException) {
            val refusal = generateSequence(error as Throwable) { it.cause }.take(8).firstOrNull {
                it is ActionRejectedException || it is dev.worldcombat.core.runtime.ActionInactiveException
            }
            when (refusal) {
                is ActionRejectedException -> if (operation != "tick") throw refusal else s.reason = refusal.reason()
                is dev.worldcombat.core.runtime.ActionInactiveException -> { combat.controlled(actor, false); s.reason = "actor-left" }
                else -> { CompanionContent.disableBrain(error); combat.controlled(actor, false); s.reason = "script-error" }
            }
        }
        finally { context.close(); dev.worldcombat.core.runtime.ScriptProfile.end("tactics $operation", started) }
    }
}
