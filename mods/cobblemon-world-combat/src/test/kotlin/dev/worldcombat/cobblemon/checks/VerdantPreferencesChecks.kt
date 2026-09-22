package dev.worldcombat.cobblemon.checks

import com.cobblemon.mod.common.Cobblemon
import com.cobblemon.mod.common.api.moves.Moves
import com.cobblemon.mod.common.api.moves.BenchedMove
import com.cobblemon.mod.common.api.pokemon.PokemonProperties
import com.cobblemon.mod.common.pokemon.Pokemon
import com.google.gson.JsonElement
import com.google.gson.JsonNull
import com.google.gson.JsonObject
import com.google.gson.JsonParser
import com.mojang.authlib.GameProfile
import dev.worldcombat.cobblemon.control.CompanionControl
import dev.worldcombat.cobblemon.network.ContentRequest
import dev.worldcombat.cobblemon.script.NativeContentChannels
import dev.worldcombat.cobblemon.script.NativeContentData
import dev.worldcombat.cobblemon.script.ContentRequestContext
import dev.worldcombat.core.checks.TestWorld
import dev.worldcombat.core.world.CombatServices
import net.minecraft.server.MinecraftServer
import net.minecraft.server.level.ServerPlayer
import net.neoforged.neoforge.common.util.FakePlayerFactory
import net.minecraft.world.phys.Vec3
import java.util.UUID

/** The actual formal catalogue, real Rhino handler, native owned-party RPC and Pokemon NBT. */
object VerdantPreferencesChecks {
    private var age = 0
    private var done = false
    private var sequence = 0L
    private lateinit var owner: ServerPlayer
    private lateinit var pokemon: Pokemon
    private lateinit var other: Pokemon
    private var lease: AutoCloseable? = null
    private var index = 0
    private var fieldCount = 0
    private var detailIndex = 0
    private var maximumReply = 0
    private val moves = listOf("tackle", "growl", "vinewhip", "growth", "leechseed", "razorleaf", "poisonpowder", "sleeppowder", "seedbomb", "takedown", "sweetscent", "synthesis", "worryseed", "powerwhip", "solarbeam", "petaldance", "petalblizzard", "protect", "endure", "substitute", "helpinghand", "ingrain", "amnesia", "gigadrain", "venoshock", "grassyterrain")
    private fun call(server: MinecraftServer, input: JsonObject): JsonObject {
        val session = CompanionControl.session(owner)
        val reply = NativeContentChannels.process(owner, ContentRequest(session.id, ++sequence, CombatServices.CONTENT.epoch(),
            server.tickCount.toLong(), "world_combat:skills", pokemon.uuid, input.toString()))
        check(reply.code() == "ok") { "Request failed: ${reply.code()} ${reply.data()}" }
        check(reply.data().length <= 16384)
        maximumReply = maxOf(maximumReply, reply.data().length)
        return JsonParser.parseString(reply.data()).asJsonObject
    }
    private fun request(op: String, move: String, expected: JsonElement? = null) = JsonObject().also {
        it.addProperty("op", op); it.addProperty("move", move)
        if (op != "inspect") it.add("expected", expected ?: JsonNull.INSTANCE)
    }
    private fun patch(path: List<String>, value: JsonElement): JsonObject = JsonObject().also { root ->
        var current = root
        path.forEachIndexed { at, name ->
            if (at == path.lastIndex) current.add(name, value)
            else current = JsonObject().also { current.add(name, it) }
        }
    }
    @JvmStatic fun tick(server: MinecraftServer) {
        if (done || !CombatServices.CONTENT.ready()) return
        try {
            age++
            if (age == 1) {
                val level = TestWorld.prepare(server)
                owner = FakePlayerFactory.get(level, GameProfile(UUID.randomUUID(), "P5Preferences"))
                lease = TestWorld.mockOwner(server, owner); PokemonServerChecks.initializeTestData(owner.uuid)
                pokemon = PokemonProperties.parse("venusaur level=60").create()
                moves.forEach { pokemon.benchedMoves.add(BenchedMove(Moves.getByName(it)!!, 0)) }
                other = PokemonProperties.parse("venusaur level=60").create()
                check(Cobblemon.storage.getParty(owner).add(pokemon)); check(Cobblemon.storage.getParty(owner).add(other))
                NativeSubscriptionChecks.verify(server, owner, pokemon)
                val recalled = ContentRequestContext(owner, CombatServices.CONTENT.epoch(), pokemon, "{}")
                check(recalled.actor() == null && recalled.world() == null)
                recalled.close()
                return
            }
            if (age < 15 || age % 20 != 0) return
            if (index == moves.size) {
                if (detailIndex < moves.size) {
                    val id = moves[detailIndex++]
                    val companions = moves.filter { it != id }.takeLast(4)
                    pokemon.moveSet.clear()
                    (listOf(id) + companions.take(3)).forEach { pokemon.moveSet.add(Moves.getByName(it)!!.create()) }
                    val equipped = call(server, request("inspect", id))
                    check(equipped["requested"]?.isJsonNull != false) { "$id equipped detail duplicated in requested" }
                    val equippedSkills = equipped.getAsJsonArray("skills").map { it.asJsonObject }
                    check(equippedSkills.size == 4 && equippedSkills.count { it["detailsComplete"].asBoolean } == 1)
                    val full = equippedSkills.single { it["id"].asString == id }
                    checkNumbers(full)
                    val switched = call(server, request("inspect", companions[0]))
                    val switchedSkills = switched.getAsJsonArray("skills").map { it.asJsonObject }
                    check(switchedSkills.single { it["detailsComplete"].asBoolean }["id"].asString == companions[0])
                    checkNumbers(switchedSkills.single { it["detailsComplete"].asBoolean })
                    pokemon.moveSet.clear()
                    companions.forEach { pokemon.moveSet.add(Moves.getByName(it)!!.create()) }
                    val candidate = call(server, request("inspect", id))
                    check(candidate.getAsJsonArray("skills").size() == 4)
                    check(candidate.getAsJsonArray("skills").none { it.asJsonObject["detailsComplete"].asBoolean })
                    check(candidate.has("requested")) { "$id learned candidate did not return full details: $candidate" }
                    val requested = candidate.getAsJsonObject("requested")
                    check(requested["id"].asString == id && requested["slot"].asInt == -1)
                    checkNumbers(requested)
                    check(requested.getAsJsonObject("description") == full.getAsJsonObject("description")) { "$id candidate descriptions differ" }
                    println("P5CHECK formal $id authored prose and four-slot/candidate RPC passed")
                    return
                }
                pokemon.moveSet.clear()
                listOf("grassyterrain", "solarbeam", "substitute", "sleeppowder").forEach { pokemon.moveSet.add(Moves.getByName(it)!!.create()) }
                val complete = call(server, request("inspect", "grassyterrain"))
                check(!complete.has("error") && complete.getAsJsonArray("skills").size() == 4)
                check(complete.getAsJsonArray("menu").any { it.asJsonObject["command"]?.asString == "work" })
                verifyLiveDamage(server)
                val saved = Pokemon.loadFromNBT(server.registryAccess(), pokemon.saveToNBT(server.registryAccess()))
                moves.forEach { check(NativeContentData.read(saved, "world_combat:preferences/$it") == null) }
                done = true; lease?.close()
                println("P5CHECK PASS actual formal preference RPC: ${moves.size} moves, $fieldCount fields, first-write/existing CAS/reset, recalled/sent-out, native persistence, full quantitative details and four-slot/candidate replies; maximum=$maximumReply characters")
                return
            }
            val id = moves[index++]
            pokemon.moveSet.clear(); pokemon.moveSet.add(Moves.getByName(id)!!.create())
            if (index == 14) {
                pokemon.sendOut(owner.serverLevel(), Vec3(2.0, 100.0, 2.0), null)!!.setNoAi(true)
                verifyObservation()
            }
            var result = call(server, request("inspect", id))
            check(!result.has("error")) { result.toString() }
            var skill = result.getAsJsonArray("skills")[0].asJsonObject
            val original = skill.getAsJsonObject("values").deepCopy()
            val fields = skill.getAsJsonArray("fields")
            // One combined patch crosses every declared field kind without flooding the request gate.
            val changes = JsonObject()
            fields.forEach { element ->
                val field = element.asJsonObject
                val path = field.getAsJsonArray("path").map { it.asString }
                var current: JsonElement = original
                path.forEach { current = current.asJsonObject[it] }
                val value = when (field["kind"].asString) {
                    "boolean" -> com.google.gson.JsonPrimitive(!current.asBoolean)
                    "number" -> if (current.asDouble == field["min"].asDouble) field["max"] else field["min"]
                    else -> field.getAsJsonArray("options").first { it.asJsonObject["value"] != current }.asJsonObject["value"]
                }
                fun overlay(target: JsonObject, source: JsonObject) {
                    source.entrySet().forEach { (key, value) ->
                        if (target.has(key) && target[key].isJsonObject && value.isJsonObject) overlay(target.getAsJsonObject(key), value.asJsonObject)
                        else target.add(key, value)
                    }
                }
                overlay(changes, patch(path, value)); fieldCount++
            }
            val firstRevision = skill.get("revision")
            result = call(server, request("configure", id, firstRevision).also { it.add("patch", changes) })
            check(!result.has("error")) { "$id initial edit: $result" }
            skill = result.getAsJsonArray("skills")[0].asJsonObject
            if (fields.size() > 0) {
                check(skill.getAsJsonObject("values") != original)
                val stale = call(server, request("configure", id, firstRevision).also { it.add("patch", changes) })
                check(stale["error"].asString == "settings-changed") { "$id stale write accepted" }
                result = call(server, request("configure", id, skill.get("revision")).also { it.add("patch", changes) })
                check(!result.has("error")) { "$id existing native-string revision: $result" }
                skill = result.getAsJsonArray("skills")[0].asJsonObject
            }
            result = call(server, request("reset", id, skill.get("revision")))
            check(!result.has("error") && result.getAsJsonArray("skills")[0].asJsonObject.getAsJsonObject("values") == original)
            check(NativeContentData.read(other, "world_combat:preferences/$id") == null)
            val menu = result.getAsJsonArray("menu")
            check(menu.any { it.asJsonObject["id"].asString == "moves/$id" })
            if (id == "grassyterrain") check(menu.any { it.asJsonObject["command"]?.asString == "work" })
            println("P5CHECK formal $id preference fields=${fields.size()} passed")
        } catch (error: Throwable) {
            done = true; lease?.close(); println("P5CHECK FAIL formal preference RPC age=$age move=${moves.getOrNull(index-1)} ${error.message}"); error.printStackTrace()
        }
    }
    private fun checkNumbers(detail: JsonObject) {
        check(detail["detailsComplete"].asBoolean && detail["ppCost"].asDouble == 1.0)
        check(!detail.has("numbers") && !detail.has("summary"))
        val prose = detail.getAsJsonObject("description")
        val bindings = prose.getAsJsonObject("bindings")
        check(bindings.size() > 0)
        prose.getAsJsonArray("paragraphs").forEach { paragraph ->
            check(paragraph.asJsonObject["key"].asString.isNotBlank())
            paragraph.asJsonObject.getAsJsonArray("args").forEach { argument ->
                check(bindings.has(argument.asJsonObject["binding"].asString))
            }
        }
        bindings.entrySet().forEach { (_, entry) -> check(entry.asJsonObject.has("value") && entry.asJsonObject.has("label")) }
    }
    private fun verifyObservation() {
        val request = ContentRequestContext(owner, CombatServices.CONTENT.epoch(), pokemon, "{}")
        val body = checkNotNull(request.actor())
        val world = checkNotNull(request.world())
        check(world.source() == body && world.observe(body) != null)
        val health = pokemon.currentHealth
        check(runCatching { world.health(body, -1.0, "checks:readonly") }.exceptionOrNull() is IllegalStateException)
        check(pokemon.currentHealth == health)
        request.close()
        check(runCatching { world.tick() }.exceptionOrNull() is dev.worldcombat.core.runtime.ActionInactiveException)
        println("P5CHECK live content inspection is read-only and retained world handles expire with the request")
    }
    private fun verifyLiveDamage(server: MinecraftServer) {
        val entity = checkNotNull(pokemon.entity)
        fun displayed(id: String): Double {
            val result = call(server, request("inspect", id))
            val skill = result.getAsJsonArray("skills").map { it.asJsonObject }.find { it["id"].asString == id }
                ?: result.getAsJsonObject("requested")
            return skill.getAsJsonObject("description").getAsJsonObject("bindings").getAsJsonObject("power")["value"].asDouble
        }
        val physical = displayed("tackle"); val special = displayed("solarbeam")
        entity.addEffect(net.minecraft.world.effect.MobEffectInstance(net.minecraft.world.effect.MobEffects.DAMAGE_BOOST, 100, 0))
        val boosted = displayed("tackle")
        check(boosted > physical) { "Live strength did not enter the visible damage value: $physical -> $boosted" }
        check(kotlin.math.abs(displayed("solarbeam") - special) < .001) { "Strength incorrectly altered the special preview" }
        entity.removeEffect(net.minecraft.world.effect.MobEffects.DAMAGE_BOOST)
        check(kotlin.math.abs(displayed("tackle") - physical) < .001) { "Expired strength remained in the preview" }
        println("P5CHECK actual live damage readouts: physical=$physical strength=$boosted special=$special; native buff removal restored the value")
    }
}
