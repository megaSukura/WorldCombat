package dev.worldcombat.cobblemon.checks

import com.cobblemon.mod.common.Cobblemon
import com.cobblemon.mod.common.api.moves.Moves
import com.cobblemon.mod.common.api.pokemon.PokemonProperties
import com.cobblemon.mod.common.entity.pokemon.PokemonEntity
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
import dev.worldcombat.cobblemon.script.PokemonView
import dev.worldcombat.core.checks.TestWorld
import dev.worldcombat.core.runtime.ActionTarget
import dev.worldcombat.core.runtime.Point
import dev.worldcombat.core.world.CombatServices
import net.minecraft.server.MinecraftServer
import net.minecraft.server.level.ServerPlayer
import net.minecraft.world.phys.Vec3
import net.neoforged.neoforge.common.util.FakePlayerFactory
import java.util.UUID
import kotlin.math.abs

/** Independent native consumers exercise reusable content services through real world state and RPC. */
object SharedLibrariesChecks {
    private var age = 0
    private var done = false
    private lateinit var owner: ServerPlayer
    private lateinit var first: PokemonEntity
    private lateinit var second: PokemonEntity
    private var lease: AutoCloseable? = null
    private var sequence = 0L
    private var trial = 0
    private var start = -1
    private var next = 30
    private var before = 0
    private var pp = 0
    private var preparing = false
    private var recovering = false
    private val modes = listOf("native", "suppressed", "replaced", "configured", "other-individual", "new-rule")
    private val restored = listOf(14, 8, 16, 20, 14, 36)
    private const val PREF = "reuse:preferences/recover"
    private const val STATE = "reuse:state/recover"

    private fun rpc(server: MinecraftServer, pokemon: Pokemon, input: JsonObject): JsonObject {
        val session = CompanionControl.session(owner)
        val response = NativeContentChannels.process(owner, ContentRequest(session.id, ++sequence, CombatServices.CONTENT.epoch(),
            server.tickCount.toLong(), "reuse:skills", pokemon.uuid, input.toString()))
        check(response.code() == "ok") { "Shared catalogue RPC failed: ${response.code()} ${response.data()}" }
        return JsonParser.parseString(response.data()).asJsonObject
    }
    private fun input(op: String, expected: JsonElement? = null): JsonObject = JsonObject().also {
        it.addProperty("op", op); it.addProperty("move", "recover")
        if (op == "configure") {
            it.add("expected", expected ?: JsonNull.INSTANCE)
            it.add("patch", JsonObject().also { patch -> patch.addProperty("amount", 12) })
        }
    }
    private fun finish() { done = true; lease?.close(); lease = null }

    @JvmStatic fun tick(server: MinecraftServer) {
        if (done || !CombatServices.CONTENT.ready()) return
        val combat = CombatServices.get(server)
        try {
            age++
            check(age < 500) { "Shared consumer timed out" }
            if (age == 1) {
                val level = TestWorld.prepare(server)
                owner = FakePlayerFactory.get(level, GameProfile(UUID.randomUUID(), "SharedLibraryOwner"))
                lease = TestWorld.mockOwner(server, owner); PokemonServerChecks.initializeTestData(owner.uuid)
                fun companion(x: Double): PokemonEntity {
                    val pokemon = PokemonProperties.parse("porygon level=40 ability=analytic").create()
                    pokemon.moveSet.clear(); pokemon.moveSet.setMove(0, Moves.getByName("recover")!!.create())
                    check(Cobblemon.storage.getParty(owner).add(pokemon))
                    return pokemon.sendOut(level, Vec3(x, 100.0, 2.0), null)!!.also {
                        it.setNoAi(true); it.setNoGravity(true); it.setPersistenceRequired()
                    }
                }
                first = companion(2.0); second = companion(5.0)
                return
            }
            if (age < next) return
            if (trial == modes.size) {
                val native = first.pokemon
                val saved = Pokemon().loadFromNBT(server.registryAccess(), native.saveToNBT(server.registryAccess()))
                check(NativeContentData.read(saved, PREF) == NativeContentData.read(native, PREF))
                check(NativeContentData.read(saved, STATE) == NativeContentData.read(native, STATE))
                check(saved.moveSet[0]!!.currentPp == native.moveSet[0]!!.currentPp)
                check(JsonParser.parseString(NativeContentData.read(saved, STATE)).asJsonObject["repairs"].asInt == 5)
                check(NativeContentData.read(second.pokemon, PREF) == null)
                check(PokemonView.capture(first).ability() == "analytic") { "Temporary ability replacement changed native identity" }
                finish()
                println("P5CHECK PASS shared libraries: independent Porygon repair content, custom/extended/replaced trait hooks, temporary suppression/ability change, individual catalogue CAS, native HP+one PP, shared timing and NBT")
                return
            }
            val actor = if (modes[trial] == "other-individual") second else first
            val handle = combat.bind(actor)
            if (start < 0) {
                check(PokemonView.capture(actor).species() == "cobblemon:porygon")
                check(PokemonView.capture(actor).ability() == "analytic")
                check(abs(actor.maxHealth - actor.pokemon.maxHealth) < .001)
                if (modes[trial] == "configured") {
                    val original = rpc(server, actor.pokemon, input("inspect"))
                    val revision = original.getAsJsonArray("skills")[0].asJsonObject.get("revision")
                    val changed = rpc(server, actor.pokemon, input("configure", revision))
                    check(!changed.has("error") && changed.getAsJsonArray("skills")[0].asJsonObject.getAsJsonObject("values")["amount"].asInt == 12)
                    val stale = rpc(server, actor.pokemon, input("configure", revision))
                    check(stale["error"].asString == "settings-changed")
                    val other = rpc(server, second.pokemon, input("inspect"))
                    check(other.getAsJsonArray("skills")[0].asJsonObject.getAsJsonObject("values")["amount"].asInt == 8)
                }
                if (modes[trial] == "new-rule") check(rpc(server, actor.pokemon, input("replace-repair-rule"))["replaced"].asBoolean)
                actor.pokemon.currentHealth = actor.pokemon.maxHealth / 4
                before = actor.pokemon.currentHealth; pp = actor.pokemon.moveSet[0]!!.currentPp
                check(pp > 0)
                val move = PokemonView.capture(actor).move(0)!!
                start = age; preparing = false; recovering = false
                combat.runtime().start("reuse:recover", handle, ActionTarget.direction(Point(0.0, 0.0, 1.0)), owner.uuid,
                    mapOf("native-slot" to "0", "native-move" to move.key(), "native-design" to "recover", "native-selection" to "native", "reuse-mode" to modes[trial]))
                check(actor.pokemon.moveSet[0]!!.currentPp == pp) { "Preparation spent native PP before commitment" }
            }
            val state = combat.runtime().state(handle)
            preparing = preparing || state.stage() == "preparing"
            recovering = recovering || state.stage() == "recovering"
            if (age > start && !combat.runtime().busy(handle)) {
                check(state.stage() == "finished") { "Repair ended ${state.stage()}: ${state.reason()}" }
                check(preparing && recovering && age - start >= 18) { "Shared preparation/execution/recovery timing was skipped" }
                check(actor.pokemon.currentHealth - before == restored[trial]) { "${modes[trial]} restored ${actor.pokemon.currentHealth - before}, expected ${restored[trial]}" }
                check(abs(actor.health - actor.pokemon.currentHealth) < .001)
                check(actor.pokemon.moveSet[0]!!.currentPp == pp - 1) { "Repair did not spend exactly one native PP" }
                val stored = JsonParser.parseString(NativeContentData.read(actor.pokemon, STATE)).asJsonObject
                check(abs(stored["last"].asDouble - restored[trial]) < .001)
                println("P5CHECK independent repair ${modes[trial]}: +${restored[trial]} HP, one PP, ${age-start} ticks")
                trial++; start = -1; next = age + 25
            }
        } catch (error: Throwable) {
            finish(); println("P5CHECK FAIL shared libraries age=$age mode=${modes.getOrNull(trial)} ${error.message}"); error.printStackTrace()
        }
    }
}
