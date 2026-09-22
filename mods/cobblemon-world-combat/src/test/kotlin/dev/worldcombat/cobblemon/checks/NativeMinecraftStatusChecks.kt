package dev.worldcombat.cobblemon.checks

import com.cobblemon.mod.common.Cobblemon
import com.cobblemon.mod.common.api.abilities.Abilities
import com.cobblemon.mod.common.api.pokemon.PokemonProperties
import com.cobblemon.mod.common.entity.pokemon.PokemonEntity
import com.cobblemon.mod.common.pokemon.Pokemon
import com.google.gson.JsonObject
import com.google.gson.JsonParser
import com.mojang.authlib.GameProfile
import dev.worldcombat.cobblemon.script.NativeContentData
import dev.worldcombat.cobblemon.script.NativeMechanics
import dev.worldcombat.core.checks.TestWorld
import dev.worldcombat.core.runtime.WorldAccess
import dev.worldcombat.core.world.CombatServices
import net.minecraft.server.MinecraftServer
import net.minecraft.server.level.ClientInformation
import net.minecraft.server.level.ServerPlayer
import net.minecraft.world.effect.MobEffectInstance
import net.minecraft.world.effect.MobEffects
import net.minecraft.world.entity.EntityType
import net.minecraft.world.entity.ai.attributes.Attributes
import net.minecraft.world.entity.animal.Cow
import net.minecraft.world.level.storage.LevelResource
import net.minecraft.world.phys.Vec3
import net.neoforged.neoforge.common.util.FakePlayerFactory
import java.nio.file.Files
import java.util.UUID
import kotlin.math.abs

/** Uses the production bundle and real vanilla poison as its timing reference. */
object NativeMinecraftStatusChecks {
    private const val KEY = "world_combat:native-minecraft-status"
    private var age = 0
    private var done = false
    private lateinit var owner: ServerPlayer
    private lateinit var entity: PokemonEntity
    private lateinit var cow: Cow
    private lateinit var saved: Pokemon
    private var lease: AutoCloseable? = null
    private var before = 0F
    private var reference = 0F
    private var stale = ""

    private fun scope(server: MinecraftServer): WorldAccess {
        val combat = CombatServices.get(server)
        return WorldAccess(combat.runtime(), combat.bind(entity), owner.uuid, Runnable {}, true, 0)
    }
    private fun poison(server: MinecraftServer) {
        val world = scope(server)
        check(NativeMechanics.status(world, world.source(), "cobblemon:poison", 40, NativeMechanics.statusKey(entity.pokemon)))
    }
    private fun createOwner(server: MinecraftServer, id: UUID): ServerPlayer {
        val level = server.overworld(); val profile = GameProfile(id, "P5StatusChecks")
        return ServerPlayer(server, level, profile, ClientInformation.createDefault()).also {
            it.connection = FakePlayerFactory.get(level, profile).connection
            it.moveTo(2.0, 100.0, 2.0, 0F, 0F)
        }
    }
    @JvmStatic fun tick(server: MinecraftServer) {
        if (done || !CombatServices.CONTENT.ready()) return
        try {
            when (++age) {
                1 -> {
                    val level = TestWorld.prepare(server)
                    owner = createOwner(server, UUID.randomUUID()); lease = TestWorld.mockOwner(server, owner)
                    PokemonServerChecks.initializeTestData(owner.uuid)
                    val pokemon = PokemonProperties.parse("rattata level=100 ability=runaway").create()
                    check(Cobblemon.storage.getParty(owner).add(pokemon))
                    entity = pokemon.sendOut(level, Vec3(3.0, 100.0, 2.0), null)!!; entity.setNoAi(true)
                    cow = EntityType.COW.create(level)!!; cow.moveTo(5.0, 100.0, 2.0); cow.setNoAi(true); level.addFreshEntity(cow)
                }
                30 -> {
                    // Equal health capacity keeps both above vanilla poison's one-heart stopping floor.
                    entity.getAttribute(Attributes.MAX_HEALTH)!!.baseValue = 40.0; entity.pokemon.heal(); entity.health = 40F
                    entity.pokemon.healTimer = 100000
                    cow.getAttribute(Attributes.MAX_HEALTH)!!.baseValue = 40.0; cow.health = 40F
                    poison(server)
                }
                32 -> {
                    val effect = entity.getEffect(MobEffects.POISON) ?: error("Native poison did not acquire its Minecraft effect")
                    check(effect.amplifier == 0 && effect.duration in 760..800)
                    cow.addEffect(MobEffectInstance(MobEffects.POISON, effect.duration, 0))
                    before = entity.health; reference = cow.health
                    val world = scope(server)
                    check(!NativeMechanics.status(world, world.source(), "cobblemon:poison", 80, "stale-native-token"))
                    check(entity.getEffect(MobEffects.POISON)!!.duration == effect.duration)
                }
                182 -> {
                    val loss = before - entity.health; val vanilla = reference - cow.health
                    // Native HP is integral. The existing accepted-damage bridge rounds surviving HP up once.
                    val expected = vanilla * kotlin.math.floor(entity.pokemon.maxHealth.toDouble() / entity.maxHealth) * entity.maxHealth / entity.pokemon.maxHealth
                    check(vanilla == 6F && abs(loss - expected) < 0.001) { "Poison settled twice or rebounded: Pokemon=$loss expectedNativeQuantized=$expected vanilla=$vanilla" }
                    println("P5CHECK native poison matches 150 ticks of vanilla poison: loss=$loss nativeQuantized=$expected reference=$vanilla")
                    entity.pokemon.status = null
                }
                184 -> {
                    check(!entity.hasEffect(MobEffects.POISON)) { "Native medicine left its Minecraft effect" }
                    entity.addEffect(MobEffectInstance(MobEffects.POISON, 160, 0))
                }
                186 -> {
                    check(entity.pokemon.status?.status?.name.toString() == "cobblemon:poison") { "Vanilla poison was not imported" }
                    entity.pokemon.status = null
                }
                188 -> {
                    check(!entity.hasEffect(MobEffects.POISON)) { "Native medicine failed on a vanilla-origin exposure" }
                    entity.addEffect(MobEffectInstance(MobEffects.POISON, 160, 0))
                }
                190 -> {
                    check(entity.pokemon.status != null)
                    entity.removeEffect(MobEffects.POISON)
                }
                192 -> {
                    check(entity.pokemon.status == null) { "Vanilla cure left the native poison" }
                    poison(server)
                }
                194 -> {
                    val world = scope(server); stale = world.mobEffect(world.source(), "minecraft:poison")!!.key()
                    entity.addEffect(MobEffectInstance(MobEffects.POISON, 1200, 2))
                    check(!world.removeMobEffect(world.source(), "minecraft:poison", stale)) { "Stale token removed a stronger external effect" }
                    entity.pokemon.status = null
                }
                196 -> {
                    val effect = entity.getEffect(MobEffects.POISON) ?: error("Native medicine removed the external upgrade")
                    check(effect.amplifier == 2 && effect.duration >= 1197)
                    check(entity.pokemon.status == null)
                    entity.removeEffect(MobEffects.POISON); cow.discard()
                    println("P5CHECK native and Minecraft cures, native CAS rejection and foreign stronger/longer effect preservation")
                }
                200 -> { entity.pokemon.heal(); poison(server) }
                202 -> {
                    check(NativeContentData.read(entity.pokemon, KEY) != null)
                    entity.pokemon.recall()
                    saved = Pokemon.loadFromNBT(server.registryAccess(), entity.pokemon.saveToNBT(server.registryAccess()))
                    check(NativeContentData.read(saved, KEY) == NativeContentData.read(entity.pokemon, KEY))
                    check(Cobblemon.storage.getParty(owner).remove(entity.pokemon))
                    check(Cobblemon.storage.getParty(owner).add(saved))
                }
                225 -> { entity = saved.sendOut(server.overworld(), Vec3(3.0, 100.0, 2.0), null)!!; entity.setNoAi(true) }
                251 -> {
                    check(entity.hasEffect(MobEffects.POISON)) { "Native NBT/recall/send-out lost the association" }
                    entity.pokemon.status = null
                }
                253 -> {
                    check(!entity.hasEffect(MobEffects.POISON)) { "Restored association could not propagate native medicine" }
                    entity.pokemon.updateAbility(Abilities.getOrException("poisonheal").create(true))
                    entity.pokemon.currentHealth = entity.pokemon.maxHealth / 3
                    entity.getAttribute(Attributes.MAX_HEALTH)!!.baseValue = 40.0; entity.pokemon.healTimer = 100000
                    poison(server)
                }
                255 -> before = entity.health
                405 -> {
                    val gain = entity.health - before
                    check(gain in 5.0F..7.5F) { "Poison Heal did not convert exactly the vanilla poison clock: $gain" }
                    println("P5CHECK native NBT/recall/send-out and Poison Heal native tick conversion: gain=$gain")
                    entity.pokemon.status = null
                    entity.pokemon.updateAbility(Abilities.getOrException("runaway").create(true))
                }
                408 -> poison(server)
                410 -> {
                    check(entity.hasEffect(MobEffects.POISON)); entity.pokemon.recall()
                    val expected = JsonObject().also {
                        it.addProperty("owner", owner.uuid.toString()); it.addProperty("pokemon", entity.pokemon.uuid.toString())
                    }
                    Files.writeString(server.getWorldPath(LevelResource.ROOT).resolve("worldcombat-status-save.json"), expected.toString())
                    lease?.close(); done = true
                    println("P5CHECK PASS native Minecraft poison settlement, bidirectional cures, external effects and persistent association; restart seeded")
                }
            }
        } catch (error: Throwable) {
            done = true; lease?.close(); println("P5CHECK FAIL native Minecraft status age=$age ${error.message}"); error.printStackTrace()
        }
    }
    @JvmStatic fun restart(server: MinecraftServer) {
        if (done || !CombatServices.CONTENT.ready()) return
        try {
            when (++age) {
                1 -> {
                    val expected = JsonParser.parseString(Files.readString(server.getWorldPath(LevelResource.ROOT).resolve("worldcombat-status-save.json"))).asJsonObject
                    owner = createOwner(server, UUID.fromString(expected["owner"].asString)); lease = TestWorld.mockOwner(server, owner)
                    val pokemon = Cobblemon.storage.getParty(owner).first { it.uuid.toString() == expected["pokemon"].asString }
                    check(pokemon.status?.status?.name.toString() == "cobblemon:poison" && NativeContentData.read(pokemon, KEY) != null)
                    entity = pokemon.sendOut(server.overworld(), Vec3(3.0, 100.0, 2.0), null)!!; entity.setNoAi(true)
                }
                30 -> { check(entity.hasEffect(MobEffects.POISON)); entity.removeEffect(MobEffects.POISON) }
                32 -> {
                    check(entity.pokemon.status == null) { "Restarted association lost Minecraft cure propagation" }
                    entity.pokemon.recall(); lease?.close(); done = true
                    println("P5CHECK PASS native Minecraft status restart restores saved party association and bidirectional cure")
                }
            }
        } catch (error: Throwable) { done = true; lease?.close(); println("P5CHECK FAIL native Minecraft status restart $error"); error.printStackTrace() }
    }
}
