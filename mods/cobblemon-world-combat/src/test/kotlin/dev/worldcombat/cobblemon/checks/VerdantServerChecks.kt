package dev.worldcombat.cobblemon.checks

import com.cobblemon.mod.common.Cobblemon
import com.cobblemon.mod.common.api.moves.Moves
import com.cobblemon.mod.common.api.pokemon.PokemonProperties
import com.cobblemon.mod.common.entity.pokemon.PokemonEntity
import com.mojang.authlib.GameProfile
import dev.worldcombat.cobblemon.script.PokemonView
import dev.worldcombat.core.checks.TestWorld
import dev.worldcombat.core.runtime.ActionTarget
import dev.worldcombat.core.runtime.Point
import dev.worldcombat.core.world.CombatServices
import net.minecraft.server.MinecraftServer
import net.minecraft.server.level.ClientInformation
import net.minecraft.server.level.ServerPlayer
import net.minecraft.core.BlockPos
import net.minecraft.world.level.block.Blocks
import net.minecraft.world.effect.MobEffectInstance
import net.minecraft.world.effect.MobEffects
import net.minecraft.world.entity.ai.attributes.Attributes
import net.minecraft.world.phys.Vec3
import net.neoforged.neoforge.common.util.FakePlayerFactory
import java.util.UUID

/** Exercises production recipes, native bindings and PP; this fixture never registers a skill. */
object VerdantServerChecks {
    private val moves = listOf("tackle", "growl", "vinewhip", "growth", "leechseed", "razorleaf",
        "poisonpowder", "sleeppowder", "seedbomb", "takedown", "sweetscent", "synthesis",
        "worryseed", "powerwhip", "solarbeam", "petaldance", "petalblizzard", "petaldance", "tackle", "tackle", "tackle")
    private val pointMoves = setOf("growl", "growth", "poisonpowder", "sleeppowder", "seedbomb", "sweetscent", "petaldance", "petalblizzard")
    private val damaging = setOf("tackle", "vinewhip", "razorleaf", "seedbomb", "takedown", "powerwhip", "solarbeam", "petaldance")
    private var age = 0
    private var index = 0
    private var start = -1
    private var done = false
    private lateinit var owner: ServerPlayer
    private lateinit var actor: PokemonEntity
    private lateinit var target: PokemonEntity
    private var ownerLease: AutoCloseable? = null
    private var pp = 0
    private var targetHealth = 0F
    private var selfHealth = 0
    private var sawPreparing = false
    private var sawRecovery = false
    private var targetReady = 0
    private var lastTargetHealth = 0F
    private val damagePulses = mutableListOf<Pair<Int, Float>>()
    private var stableTargetPosition = Vec3.ZERO
    private val physicalDamage = mutableListOf<Double>()
    private val danceDirections = mutableSetOf<Int>()

    @JvmStatic fun tick(server: MinecraftServer) {
        if (done || !CombatServices.CONTENT.ready()) return
        val combat = CombatServices.get(server)
        try {
            if (age++ == 0) {
                val level = TestWorld.prepare(server)
                level.setChunkForced(1, 0, true)
                for (x in 16..24) for (z in 0..5) {
                    level.setBlockAndUpdate(BlockPos(x, 99, z), Blocks.STONE.defaultBlockState())
                    for (y in 100..107) level.setBlockAndUpdate(BlockPos(x, y, z), Blocks.AIR.defaultBlockState())
                }
                level.dayTime = 6000
                level.setWeatherParameters(12000, 0, false, false)
                val profile = GameProfile(UUID.randomUUID(), "P5GardenRecipes")
                owner = ServerPlayer(server, level, profile, ClientInformation.createDefault()).also {
                    it.connection = FakePlayerFactory.get(level, profile).connection
                    it.moveTo(2.0, 100.0, 4.0, 0F, 0F)
                }
                ownerLease = TestWorld.mockOwner(server, owner)
                PokemonServerChecks.initializeTestData(owner.uuid)
                val pokemon = PokemonProperties.parse("bulbasaur level=40").create()
                check(Cobblemon.storage.getParty(owner).add(pokemon))
                actor = pokemon.sendOut(level, Vec3(3.0, 100.0, 2.5), null)!!
                target = PokemonProperties.parse("blissey level=100").create().sendOut(level, Vec3(6.0, 100.0, 2.5), null)!!
                actor.setNoAi(true); target.setNoAi(true)
                actor.setPersistenceRequired(); target.setPersistenceRequired()
                return
            }
            if (age < 25) return
            if (age < targetReady) return
            check(kotlin.math.abs(actor.maxHealth - actor.pokemon.maxHealth.toFloat()) < 0.1F) { "Formal HP projection did not preserve native maximum health" }
            val handle = combat.bind(actor)
            if (index >= moves.size) {
                check(actor.pokemon.persistentData.getCompound("WorldCombat").getCompound("Content").contains("world_combat:state/growth"))
                check(physicalDamage.size == 3 && physicalDamage[1] > physicalDamage[0] && physicalDamage[2] < physicalDamage[0]) {
                    "Native strength/weakness did not change actual production physical damage: baseline/strength/weakness=$physicalDamage"
                }
                println("P5CHECK actual physical world HP damage baseline/strength/weakness=$physicalDamage; vanilla attributes settled once")
                ownerLease?.close(); done = true
                println("P5CHECK PASS verdant 17 production recipes, actual preparation/recovery, native PP and garden state")
                return
            }
            val move = moves[index]
            val escapingDance = move == "petaldance" && index == moves.size - 4
            val physicalComparison = index - (moves.size - 3)
            if (start < 0) {
                check(actor.isAlive && !actor.isRemoved) { "Caster left between recipes: hp=${actor.pokemon.currentHealth}/${actor.health}" }
                if (!target.isAlive || target.isRemoved || target.pokemon.currentHealth <= 0) {
                    target.discard()
                    target = PokemonProperties.parse("blissey level=100").create().sendOut(server.overworld(), Vec3(6.0, 100.0, 2.5), null)!!
                    target.setNoAi(true)
                    target.setPersistenceRequired()
                    targetReady = age + 25
                    return
                }
                actor.moveTo(3.0, 100.0, 2.5, 0F, 0F)
                target.moveTo(when (move) { "tackle" -> 4.3; "seedbomb" -> 19.4; else -> 6.0 }, 100.0, 2.5, 0F, 0F)
                actor.deltaMovement = Vec3.ZERO; target.deltaMovement = Vec3.ZERO
                actor.pokemon.heal(); target.pokemon.heal()
                if (physicalComparison >= 0) {
                    target.pokemon.updateAbility(com.cobblemon.mod.common.api.abilities.Abilities.getOrException("battlearmor").create(true))
                    actor.removeAllEffects()
                    if (physicalComparison == 1) actor.addEffect(MobEffectInstance(MobEffects.DAMAGE_BOOST, 120, 0))
                    if (physicalComparison == 2) actor.addEffect(MobEffectInstance(MobEffects.WEAKNESS, 120, 0))
                    val attribute = actor.getAttribute(Attributes.ATTACK_DAMAGE)!!
                    check(when (physicalComparison) {
                        1 -> attribute.value > attribute.baseValue
                        2 -> attribute.value < attribute.baseValue
                        else -> kotlin.math.abs(attribute.value - attribute.baseValue) < 0.01
                    }) { "Physical comparison did not establish an actual native attribute change" }
                }
                if (move == "synthesis") actor.pokemon.currentHealth = actor.pokemon.maxHealth / 2
                actor.pokemon.moveSet.setMove(0, Moves.getByName(move)!!.create())
                val nativeMove = PokemonView.capture(actor).move(0)!!
                pp = nativeMove.pp(); targetHealth = target.health; selfHealth = actor.pokemon.currentHealth
                lastTargetHealth = target.health; damagePulses.clear(); danceDirections.clear(); stableTargetPosition = target.position()
                val targetHandle = if (move == "synthesis") handle else combat.bind(target)
                val point = if (move == "growth" || move == "growl" || move == "petaldance") combat.position(handle) else combat.position(targetHandle)
                val delta = point.minus(combat.position(handle))
                val direction = if (delta.length() < 0.01) Point(0.0, 0.0, 1.0) else delta.unit()
                val input = if (move in pointMoves) ActionTarget.point(point, direction) else ActionTarget.entity(targetHandle, point, direction)
                val arguments = mapOf("native-slot" to "0", "native-move" to nativeMove.key(), "native-design" to move, "native-selection" to "native")
                combat.runtime().start("world_combat:$move", handle, input, owner.uuid, arguments)
                check(actor.pokemon.moveSet[0]!!.currentPp == pp) { "$move spent PP before preparation" }
                start = age; sawPreparing = false; sawRecovery = false
            }
            val state = combat.runtime().state(handle)
            check(!target.isRemoved || target.pokemon.currentHealth <= 0) {
                "A living fixture left during $move: nativeHP=${target.pokemon.currentHealth}, persistent=${target.isPersistenceRequired}, reason=${target.removalReason}, ticks=${target.tickCount}"
            }
            if (move == "petaldance" && state.stage() == "executing") danceDirections += Math.floorMod(actor.yRot.toInt(), 360) / 15
            val currentTargetHealth = target.health
            if (currentTargetHealth < lastTargetHealth) damagePulses += (age - start) to (lastTargetHealth - currentTargetHealth)
            lastTargetHealth = currentTargetHealth
            if (escapingDance && damagePulses.size == 1 && target.position().distanceTo(actor.position()) < 5) {
                target.moveTo(12.0, 100.0, 2.5, 0F, 0F)
                target.deltaMovement = Vec3.ZERO
            }
            if (state.stage() == "preparing") sawPreparing = true
            if (state.stage() == "recovering") sawRecovery = true
            if (age - start > 590) error("$move did not terminate")
            if (age > start + 2 && !combat.runtime().busy(handle)) {
                check(state.stage() == "finished") { "$move ended ${state.stage()}: ${state.reason()}" }
                check(sawPreparing && sawRecovery) { "$move missed readable action stages" }
                check(actor.pokemon.moveSet[0]!!.currentPp == pp - 1) { "$move PP settled incorrectly" }
                // World damage can be fractional before the native integer HP display changes.
                if (move in damaging) check(target.health < targetHealth && damagePulses.isNotEmpty()) { "$move did not affect its unobstructed target in world HP" }
                if (move == "synthesis") check(actor.pokemon.currentHealth > selfHealth) { "synthesis did not restore native HP" }
                if (move == "petaldance") {
                    check(danceDirections.size >= 4) { "Petal dance did not turn the actual body through its sweep: $danceDirections" }
                    check(damagePulses.size == (if (escapingDance) 1 else 3) && damagePulses.all { it.second > 0F }) {
                        "Petal dance's actual world HP pulses did not respect its rhythm/range: $damagePulses; escaped=$escapingDance position=${target.position()}"
                    }
                    val interval = if (actor.pokemon.level >= 34) 10 else 12
                    check(damagePulses.zipWithNext().all { (before, after) -> after.first - before.first == interval }) {
                        "Petal dance's actual rhythm did not match this level's $interval-tick stage: $damagePulses"
                    }
                    if (!escapingDance) check(target.position().distanceTo(stableTargetPosition) < 0.2) { "Unrequested native knockback pushed the target out of petal dance" }
                }
                if (move == "solarbeam") check(damagePulses.size == 8) {
                    "Solar beam did not settle eight distinct world HP pulses: $damagePulses; position=${target.position()}"
                }
                if (physicalComparison >= 0) physicalDamage += (targetHealth - target.health).toDouble()
                println("P5CHECK production $move passed in ${age - start} ticks")
                index++; start = -1
                if (index == moves.size - 4) targetReady = age + 90
                else if (index >= moves.size - 3) targetReady = age + 40
            }
        } catch (error: Throwable) {
            done = true; ownerLease?.close()
            println("P5CHECK FAIL verdant ${moves.getOrNull(index)} ${error.message}; caster=${if (::actor.isInitialized) "${actor.isAlive}/${actor.isRemoved}/${actor.pokemon.currentHealth}" else "uninitialized"}; target=${if (::target.isInitialized) "${target.isAlive}/${target.isRemoved}/${target.pokemon.currentHealth}" else "uninitialized"}")
            error.printStackTrace()
        }
    }
}
