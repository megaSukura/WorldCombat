package dev.worldcombat.cobblemon.script

import com.cobblemon.mod.common.api.moves.Moves
import com.cobblemon.mod.common.battles.runner.ShowdownService
import com.google.gson.JsonArray
import com.google.gson.JsonObject

/** Retains JSON catalogue facts that the native MoveTemplate projection omits. */
object NativeMoveMetadata {
    @Volatile private var entries: Map<String, NativeMoveData> = emptyMap()
    @Volatile var revision: Long = 0
        private set
    fun install() {
        Moves.observable.subscribe { replace(ShowdownService.service.getRegistryData("move")) }
    }
    internal fun replace(rows: JsonArray) {
        entries = rows.associate { row ->
            val data = row.asJsonObject
            data.get("id").asString to NativeMoveData(data)
        }
        revision++
    }
    fun of(id: String): NativeMoveData = entries[id] ?: NativeMoveData.EMPTY
}

/** Immutable JSON snapshot; executable native callbacks are not part of the catalogue serialization. */
class NativeMoveData(data: JsonObject) {
    private val json = data.toString()
    private val flags = data.get("flags")?.takeIf { it.isJsonObject }?.asJsonObject?.deepCopy() ?: JsonObject()
    fun metadata(): String = json
    fun flags(): String = flags.toString()
    fun flag(name: String): Boolean {
        val value = flags.get(name)?.takeIf { it.isJsonPrimitive }?.asJsonPrimitive ?: return false
        return if (value.isBoolean) value.asBoolean else value.isNumber && value.asDouble != 0.0
    }
    companion object { val EMPTY = NativeMoveData(JsonObject()) }
}
