package dev.worldcombat.cobblemon.checks

import com.cobblemon.mod.common.Cobblemon
import com.cobblemon.mod.common.api.moves.Moves
import com.cobblemon.mod.common.api.moves.BenchedMove
import com.cobblemon.mod.common.api.pokeball.PokeBalls
import com.cobblemon.mod.common.api.pokemon.PokemonProperties
import com.cobblemon.mod.common.api.pokemon.stats.Stats
import com.cobblemon.mod.common.entity.pokeball.EmptyPokeBallEntity
import com.cobblemon.mod.common.entity.pokemon.PokemonEntity
import com.cobblemon.mod.common.pokemon.Pokemon
import com.mojang.authlib.GameProfile
import dev.worldcombat.cobblemon.script.NativeContentData
import dev.worldcombat.cobblemon.script.PokemonView
import dev.worldcombat.core.checks.TestWorld
import dev.worldcombat.core.runtime.ActionTarget
import dev.worldcombat.core.runtime.ActorHandle
import dev.worldcombat.core.runtime.WorldAccess
import dev.worldcombat.core.world.CombatServices
import net.minecraft.server.MinecraftServer
import net.minecraft.server.level.ClientInformation
import net.minecraft.server.level.ServerPlayer
import net.minecraft.world.InteractionHand
import net.minecraft.world.item.ItemStack
import net.minecraft.world.phys.Vec3
import net.neoforged.neoforge.common.util.FakePlayerFactory
import java.util.UUID

/** The production repertoire participates in one native journey: defeat, cultivation, evolution and capture. */
object VerdantJourneyChecks {
    private var age = 0
    private var done = false
    private lateinit var owner: ServerPlayer
    private lateinit var actor: PokemonEntity
    private lateinit var foe: PokemonEntity
    private lateinit var wild: PokemonEntity
    private lateinit var oldHandle: ActorHandle
    private lateinit var ball: EmptyPokeBallEntity
    private var lease: AutoCloseable? = null
    private var xp = 0
    private var speedEv = 0
    private var friendship = 0
    private var pp = 0
    private var recoilHealth = 0
    private var tackleRecovery = false
    private var takedownRecovery = false
    private const val PREF = "world_combat:preferences/tackle"
    private const val LIGHT = "world_combat:state/growth"

    @JvmStatic fun tick(server: MinecraftServer) {
        if (done || !CombatServices.CONTENT.ready()) return
        val combat = CombatServices.get(server)
        try {
            if (::actor.isInitialized && actor.isAlive) {
                val state = combat.runtime().state(combat.bind(actor))
                if (state?.stage() == "recovering") when (state.action()) {
                    "world_combat:tackle" -> tackleRecovery = true
                    "world_combat:takedown" -> takedownRecovery = true
                }
            }
            when (++age) {
                1 -> {
                    val level = TestWorld.prepare(server); level.dayTime = 6000
                    val profile = GameProfile(UUID.randomUUID(), "P5Journey")
                    owner = ServerPlayer(server, level, profile, ClientInformation.createDefault()).also {
                        it.connection = FakePlayerFactory.get(level, profile).connection; it.moveTo(2.0, 100.0, 4.0, 0F, 0F)
                    }
                    lease = TestWorld.mockOwner(server, owner); PokemonServerChecks.initializeTestData(owner.uuid)
                    val pokemon = PokemonProperties.parse("bulbasaur level=15").create()
                    pokemon.setExperienceAndUpdateLevel(pokemon.experienceGroup.getExperience(16) - 1)
                    pokemon.moveSet.clear(); pokemon.moveSet.add(Moves.getByName("tackle")!!.create())
                    check(Cobblemon.storage.getParty(owner).add(pokemon))
                    actor = pokemon.sendOut(level, Vec3(3.0, 100.0, 2.0), null)!!; actor.setNoAi(true)
                    foe = PokemonProperties.parse("rattata level=4").create().sendOut(level, Vec3(4.4, 100.0, 2.0), null)!!; foe.setNoAi(true)
                    xp = pokemon.experience; speedEv = pokemon.evs.getOrDefault(Stats.SPEED); friendship = pokemon.friendship
                }
                30 -> {
                    val handle = combat.bind(actor); val world = WorldAccess(combat.runtime(), handle, owner.uuid, Runnable {}, true, 0)
                    check(NativeContentData.compareData(world, handle, PREF, null, """{"version":1,"patch":{"finishDistance":3}}"""))
                    check(NativeContentData.compareData(world, handle, LIGHT, null, """{"light":2}"""))
                    foe.pokemon.currentHealth = 1; val target = combat.bind(foe); val move = PokemonView.capture(actor).move(0)!!; pp = move.pp()
                    combat.runtime().start("world_combat:tackle", handle, ActionTarget.entity(target, combat.position(target), combat.position(target).minus(combat.position(handle)).unit()),
                        owner.uuid, mapOf("native-slot" to "0", "native-move" to move.key(), "native-design" to "tackle", "native-selection" to "native"))
                }
                70 -> {
                    val pokemon = actor.pokemon
                    check(foe.pokemon.isFainted() && pokemon.experience > xp && pokemon.level >= 16) { "Formal tackle did not award native defeat growth" }
                    check(pokemon.evs.getOrDefault(Stats.SPEED) > speedEv && pokemon.friendship > friendship)
                    check(pokemon.moveSet.first { it.name == "tackle" }.currentPp == pp - 1)
                    check(tackleRecovery && combat.runtime().state(combat.bind(actor)).stage() == "finished") { "Lethal tackle skipped its own recovery" }
                    val granted = pokemon.experience
                    check(!combat.damage(combat.bind(actor), combat.bind(foe), owner.uuid, 5.0) && pokemon.experience == granted) { "Fainted target yielded a duplicate reward" }
                    Cobblemon.storage.getParty(owner).onSecondPassed(owner)
                    val evolution = pokemon.evolutionProxy.server().firstOrNull { it.result.species == "ivysaur" } ?: error("Native level evolution was not offered")
                    val id = pokemon.uuid; pokemon.recall(); pokemon.evolutionProxy.server().start(evolution)
                    check(pokemon.uuid == id && pokemon.species.name == "Ivysaur")
                    actor = pokemon.sendOut(server.overworld(), Vec3(3.0, 100.0, 2.0), null)!!; actor.setNoAi(true)
                    val saved = Pokemon().loadFromNBT(server.registryAccess(), pokemon.saveToNBT(server.registryAccess()))
                    check(saved.uuid == id && saved.experience == granted)
                    for (key in listOf(PREF, LIGHT)) check(saved.persistentData.getCompound("WorldCombat").getCompound("Content").getString(key) == pokemon.persistentData.getCompound("WorldCombat").getCompound("Content").getString(key))
                    check(PokemonView.capture(actor).canAccessMove("razorleaf")) { "Evolution lost native legal learning choices" }
                    wild = PokemonProperties.parse("bulbasaur level=8").create().sendOut(server.overworld(), Vec3(8.0, 100.0, 2.0), null)!!; wild.setNoAi(true)
                    foe = PokemonProperties.parse("rattata level=4").create().sendOut(server.overworld(), Vec3(4.8, 100.0, 2.0), null)!!; foe.setNoAi(true)
                    println("P5CHECK formal defeat -> native XP/EV/friendship -> optional evolution, legal learning and preserved individual settings/light passed")
                }
                100 -> {
                    actor.pokemon.heal(); foe.pokemon.currentHealth = 1
                    val template = Moves.getByName("takedown")!!
                    check(template in actor.pokemon.form.moves.getAllLegalMoves())
                    actor.pokemon.benchedMoves.add(BenchedMove(template, 0))
                    actor.pokemon.moveSet.setMove(0, template.create())
                    val handle = combat.bind(actor); val target = combat.bind(foe); val move = PokemonView.capture(actor).move(0)!!
                    pp = move.pp(); recoilHealth = actor.pokemon.currentHealth
                    combat.runtime().start("world_combat:takedown", handle, ActionTarget.entity(target, combat.position(target), combat.position(target).minus(combat.position(handle)).unit()),
                        owner.uuid, mapOf("native-slot" to "0", "native-move" to move.key(), "native-design" to "takedown", "native-selection" to "native"))
                }
                145 -> {
                    check(foe.pokemon.isFainted()) { "Formal takedown did not defeat its low-health target" }
                    check(actor.pokemon.currentHealth < recoilHealth) { "Lethal takedown skipped its native recoil payment" }
                    check(takedownRecovery && combat.runtime().state(combat.bind(actor)).stage() == "finished") { "Lethal takedown skipped recovery" }
                    check(actor.pokemon.moveSet[0]!!.currentPp == pp - 1) { "Lethal takedown did not spend exactly one native PP" }
                    println("P5CHECK lethal tackle/takedown preserve native recoil, readable recovery and once-only PP")
                }
                170 -> {
                    oldHandle = combat.bind(wild)
                    val item = PokeBalls.MASTER_BALL.item(); owner.setItemInHand(InteractionHand.MAIN_HAND, ItemStack(item, 2))
                    item.use(owner.level(), owner, InteractionHand.MAIN_HAND)
                    check(owner.mainHandItem.count == 1)
                    ball = owner.serverLevel().getEntitiesOfClass(EmptyPokeBallEntity::class.java, owner.boundingBox.inflate(32.0)).filter { it.owner === owner }.maxBy { it.id }
                    // Fix only test aim; collision, capture progression and party insertion are fully native.
                    ball.setPos(wild.boundingBox.center.add(-1.0, 0.0, 0.0)); ball.deltaMovement = Vec3(.9, 0.0, 0.0)
                }
                182 -> {
                    check(ball.capturingPokemon === wild && wild.isBusy && !combat.valid(oldHandle))
                    check(!combat.damage(combat.bind(actor), oldHandle, owner.uuid, 99.0)) { "Combat touched a target inside its native capture" }
                }
            }
            if (age > 182 && ball.captureFuture.isDone) {
                check(ball.captureFuture.getNow(false)) { "Native Master Ball capture failed" }
                val caught = Cobblemon.storage.getParty(owner).filter { it.uuid == wild.pokemon.uuid }
                check(caught.size == 1 && !caught.single().isWild())
                val sent = caught.single().sendOut(server.overworld(), Vec3(8.0, 100.0, 2.0), null)!!; sent.setNoAi(true)
                check(combat.bind(sent) != oldHandle && PokemonView.capture(sent).canAccessMove("vinewhip"))
                check(caught.single().moveSet.all { it.currentPp >= 0 })
                lease?.close(); done = true
                println("P5CHECK PASS production journey: real skill defeat/recoil/recovery/growth/evolution, state preservation, actual item capture and new party companion")
            }
            check(age < 600) { "Native journey timed out" }
        } catch (error: Throwable) {
            lease?.close(); done = true; println("P5CHECK FAIL journey at $age: ${error.message}"); error.printStackTrace()
        }
    }
}
