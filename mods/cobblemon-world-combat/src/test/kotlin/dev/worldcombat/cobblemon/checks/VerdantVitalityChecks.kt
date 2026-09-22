package dev.worldcombat.cobblemon.checks

import com.cobblemon.mod.common.Cobblemon
import com.cobblemon.mod.common.api.moves.Moves
import com.cobblemon.mod.common.api.pokemon.PokemonProperties
import com.cobblemon.mod.common.entity.pokemon.PokemonEntity
import com.cobblemon.mod.common.pokemon.Pokemon
import com.google.gson.JsonParser
import com.mojang.authlib.GameProfile
import dev.worldcombat.cobblemon.script.PokemonView
import dev.worldcombat.core.checks.TestWorld
import dev.worldcombat.core.runtime.ActionRejectedException
import dev.worldcombat.core.runtime.ActionTarget
import dev.worldcombat.core.runtime.Point
import dev.worldcombat.core.runtime.WorldAccess
import dev.worldcombat.core.world.CombatServices
import net.minecraft.server.MinecraftServer
import net.minecraft.server.level.ClientInformation
import net.minecraft.server.level.ServerPlayer
import net.minecraft.world.phys.Vec3
import net.neoforged.neoforge.common.util.FakePlayerFactory
import java.util.UUID
import kotlin.math.abs
import kotlin.math.ceil

/** Ordinary world damage must agree with the native HP that the player sees. */
object VerdantVitalityChecks {
    private var age = 0
    private var done = false
    private lateinit var young: PokemonEntity
    private lateinit var trained: PokemonEntity
    private lateinit var healer: PokemonEntity
    private lateinit var owner: ServerPlayer
    private var lease: AutoCloseable? = null
    private var youngBefore = 0
    private var trainedBefore = 0
    private var whole = 0
    private var levelHealth = 0
    private var growthPp = 0
    private var healingPp = 0
    private var playerBefore = 0F

    private fun coherent(entity: PokemonEntity, exact: Double = entity.pokemon.currentHealth.toDouble()) {
        check(abs(entity.maxHealth - entity.pokemon.maxHealth) < .001) {
            "World capacity ${entity.maxHealth} differs from native ${entity.pokemon.maxHealth}"
        }
        check(abs(entity.health - exact) < .001 && entity.pokemon.currentHealth == ceil(exact).toInt()) {
            "HP precision mismatch: world=${entity.health}, native=${entity.pokemon.currentHealth}, expectedExact=$exact"
        }
    }
    private fun fixture(entity: PokemonEntity): PokemonEntity = entity.also {
        it.setNoAi(true); it.setNoGravity(true); it.setPersistenceRequired()
    }
    private fun hit(entity: PokemonEntity, amount: Float) {
        entity.invulnerableTime = 0
        check(entity.hurt(entity.damageSources().generic(), amount)) { "Native world damage rejected: $amount" }
    }
    private fun cast(server: MinecraftServer, slot: Int, input: ActionTarget) {
        val combat = CombatServices.get(server); val move = PokemonView.capture(healer).move(slot)!!
        combat.runtime().start("world_combat:${move.id()}", combat.bind(healer), input, owner.uuid,
            mapOf("native-slot" to slot.toString(), "native-move" to move.key(), "native-design" to move.id(), "native-selection" to "native"))
    }
    private fun finish() {
        if (::owner.isInitialized) owner.discard()
        lease?.close(); lease = null; done = true
    }

    @JvmStatic fun tick(server: MinecraftServer) {
        if (done || !CombatServices.CONTENT.ready()) return
        val combat = CombatServices.get(server)
        try {
            when (++age) {
                1 -> {
                    val level = TestWorld.prepare(server); level.dayTime = 6000
                    level.setWeatherParameters(12000, 0, false, false)
                    val profile = GameProfile(UUID.randomUUID(), "P5VitalityOwner")
                    owner = ServerPlayer(server, level, profile, ClientInformation.createDefault()).also {
                        it.connection = FakePlayerFactory.get(level, profile).connection
                        it.moveTo(4.0, 100.0, 4.0, 0F, 0F); it.foodData.foodLevel = 12
                    }
                    lease = TestWorld.mockOwner(server, owner)
                    // UUID lookup alone is insufficient for healing: the player must exist in the native world.
                    level.addNewPlayer(owner)
                    PokemonServerChecks.initializeTestData(owner.uuid)
                    young = fixture(PokemonProperties.parse("bulbasaur level=10").create().sendOut(level, Vec3(3.0, 100.0, 2.0), null)!!)
                    trained = fixture(PokemonProperties.parse("ivysaur level=60").create().sendOut(level, Vec3(8.0, 100.0, 2.0), null)!!)
                    val partner = PokemonProperties.parse("bulbasaur level=50").create()
                    partner.moveSet.setMove(0, Moves.getByName("growth")!!.create())
                    partner.moveSet.setMove(1, Moves.getByName("synthesis")!!.create())
                    check(Cobblemon.storage.getParty(owner).add(partner))
                    healer = fixture(partner.sendOut(level, Vec3(3.0, 100.0, 4.0), null)!!)
                }
                30 -> {
                    coherent(young); coherent(trained)
                    check(trained.maxHealth > young.maxHealth * 2) { "Native cultivation did not increase world durability" }
                    youngBefore = young.pokemon.currentHealth; trainedBefore = trained.pokemon.currentHealth
                    for (entity in listOf(young, trained)) hit(entity, 5F)
                }
                35 -> {
                    coherent(young); coherent(trained)
                    check(youngBefore - young.pokemon.currentHealth == 5 && trainedBefore - trained.pokemon.currentHealth == 5) {
                        "A five-point native world hit was scaled into hidden percentage damage"
                    }
                    trained.pokemon.level = 61; levelHealth = trained.pokemon.currentHealth
                }
                45 -> {
                    check(trained.pokemon.level == 61 && trained.pokemon.currentHealth == levelHealth) { "Capacity refresh rolled back native leveling or HP" }
                    coherent(trained)
                    trained.pokemon.currentHealth = trained.pokemon.maxHealth / 2
                    coherent(trained)
                    trained.pokemon.heal()
                }
                50 -> {
                    coherent(trained)
                    check(trained.health == trained.maxHealth)
                    whole = trained.pokemon.currentHealth
                    hit(trained, .5F); coherent(trained, whole - .5)
                    hit(trained, .5F); coherent(trained, whole - 1.0)
                    hit(trained, .5F); coherent(trained, whole - 1.5)
                    // This is the actual vanilla heal path used by regeneration/potions, with no manual bridge callback.
                    trained.heal(.25F); coherent(trained, whole - 1.25)
                }
                55 -> {
                    coherent(trained, whole - 1.25)
                    val handle = combat.bind(trained)
                    val access = WorldAccess(combat.runtime(), handle, null, Runnable {}, true, 0)
                    check(abs(access.health(handle, 1.25, "checks:vitality") - 1.25) < .001)
                    coherent(trained, whole.toDouble())
                    hit(trained, .5F); coherent(trained, whole - .5)
                    trained.pokemon.heal(); coherent(trained, whole.toDouble())
                    println("P5CHECK fractional HP: consecutive 0.5 hits, actual vanilla heal across ticks, world recovery and native recovery settle correctly")
                    hit(trained, .5F)
                    val pokemon = trained.pokemon; pokemon.recall()
                    trained = fixture(pokemon.sendOut(server.overworld(), Vec3(8.0, 100.0, 2.0), null)!!)
                }
                85 -> {
                    coherent(trained, whole - .5)
                    val original = trained.pokemon
                    val loaded = Pokemon().loadFromNBT(server.registryAccess(), original.saveToNBT(server.registryAccess()))
                    check(loaded.uuid == original.uuid && loaded.currentHealth == original.currentHealth && loaded.level == 61)
                    original.recall()
                    trained = fixture(loaded.sendOut(server.overworld(), Vec3(8.0, 100.0, 2.0), null)!!)
                }
                115 -> {
                    coherent(trained, whole - .5)
                    hit(trained, .5F); coherent(trained, whole - 1.0)
                    hit(trained, 3F); coherent(trained, whole - 4.0)
                    trained.pokemon.level = 62; levelHealth = trained.pokemon.currentHealth
                    println("P5CHECK fractional HP survives native recall/send-out and Pokemon NBT; subsequent fractional/integer damage keeps the saved value")
                }
                125 -> {
                    check(trained.pokemon.level == 62 && trained.pokemon.currentHealth == levelHealth) { "Native level/HP regressed after fractional save/re-entry" }
                    coherent(trained)
                }
                130 -> {
                    check(server.overworld().getEntity(owner.uuid) === owner && combat.valid(combat.bind(owner))) { "Support recipient is not an actual native player entity" }
                    growthPp = healer.pokemon.moveSet[0]!!.currentPp
                    cast(server, 0, ActionTarget.direction(Point(1.0, 0.0, 0.0)))
                    check(healer.pokemon.moveSet[0]!!.currentPp == growthPp)
                }
                200 -> {
                    check(combat.runtime().state(combat.bind(healer)).stage() == "finished") { "Self growth did not complete without selecting a point" }
                    val light = healer.pokemon.persistentData.getCompound("WorldCombat").getCompound("Content").getString("world_combat:state/growth")
                    check(JsonParser.parseString(light).asJsonObject.get("light").asInt == 1 && healer.pokemon.moveSet[0]!!.currentPp == growthPp - 1)
                    healingPp = healer.pokemon.moveSet[1]!!.currentPp
                    val enemy = combat.bind(trained)
                    val refusal = runCatching { cast(server, 1, ActionTarget.entity(enemy, combat.position(enemy), Point(1.0, 0.0, 0.0))) }.exceptionOrNull()
                    check(refusal is ActionRejectedException && refusal.reason() == "choose-friend") { "Enemy healing lacked a clear refusal: $refusal" }
                    check(healer.pokemon.moveSet[1]!!.currentPp == healingPp && !combat.runtime().busy(combat.bind(healer)))
                    owner.health = 10F; playerBefore = owner.health
                    val player = combat.bind(owner)
                    cast(server, 1, ActionTarget.entity(player, combat.position(player), Point(1.0, 0.0, 0.0)))
                }
                280 -> {
                    check(owner.health > playerBefore && owner.health <= owner.maxHealth) { "Synthesis did not heal the actual player: $playerBefore->${owner.health}" }
                    check(healer.pokemon.moveSet[1]!!.currentPp == healingPp - 1 && combat.runtime().state(combat.bind(healer)).stage() == "finished")
                    println("P5CHECK production target modes: direction-only self growth, rejected enemy support before PP, and actual friendly-player synthesis ${owner.health - playerBefore} HP")
                    finish()
                    println("P5CHECK PASS vitality: native capacity/cultivation, integer and fractional damage/healing, recall/NBT precision, self action and actual friendly-player support")
                }
            }
        } catch (error: Throwable) {
            finish()
            println("P5CHECK FAIL vitality at $age: ${error.message}")
            error.printStackTrace()
        }
    }
}
