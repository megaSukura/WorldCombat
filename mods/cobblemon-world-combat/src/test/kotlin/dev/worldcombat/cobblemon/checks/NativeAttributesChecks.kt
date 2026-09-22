package dev.worldcombat.cobblemon.checks

import com.cobblemon.mod.common.Cobblemon
import com.cobblemon.mod.common.api.moves.Moves
import com.cobblemon.mod.common.api.pokemon.Natures
import com.cobblemon.mod.common.api.pokemon.PokemonProperties
import com.cobblemon.mod.common.api.pokemon.stats.Stat
import com.cobblemon.mod.common.api.pokemon.stats.StatProvider
import com.cobblemon.mod.common.api.pokemon.stats.Stats
import com.cobblemon.mod.common.battles.BattleRegistry
import com.cobblemon.mod.common.entity.pokemon.PokemonEntity
import com.cobblemon.mod.common.pokemon.Pokemon
import com.mojang.authlib.GameProfile
import dev.worldcombat.cobblemon.script.PokemonScriptApi
import dev.worldcombat.cobblemon.script.PokemonView
import dev.worldcombat.core.checks.TestWorld
import dev.worldcombat.core.world.CombatServices
import dev.worldcombat.core.runtime.WorldAccess
import net.minecraft.server.MinecraftServer
import net.minecraft.server.level.ServerPlayer
import net.minecraft.world.item.ItemStack
import net.minecraft.world.item.Items
import net.minecraft.world.phys.Vec3
import net.minecraft.world.entity.EntityType
import net.minecraft.world.entity.animal.Cow
import net.minecraft.world.entity.ai.attributes.Attributes
import net.neoforged.neoforge.common.util.FakePlayerFactory
import java.util.UUID
import kotlin.math.abs

/** Runs the shipped damage script against native individuals in an isolated dedicated world. */
object NativeAttributesChecks {
    private var age = 0
    private var done = false
    private lateinit var actor: PokemonEntity
    private lateinit var target: PokemonEntity
    private lateinit var dualTarget: PokemonEntity
    private lateinit var player: ServerPlayer
    private lateinit var baseline: PokemonView
    private var mock: AutoCloseable? = null
    private var hits = 0
    private var scriptedDamage = 0.0
    private var firstDamage = 0.0
    private lateinit var ordinary: Cow
    private var largeDamage = 0.0
    private var sleepPhase = 0
    private var phaseStarted = -1L
    private val sleepStarts = mutableMapOf<net.minecraft.world.entity.LivingEntity, Long>()
    private val sleepDeadlines = mutableSetOf<net.minecraft.world.entity.LivingEntity>()
    private lateinit var recalledSleeper: Pokemon
    private var replacementStatus: com.cobblemon.mod.common.pokemon.status.PersistentStatusContainer? = null
    private const val ACTION = "checks:native-attributes"

    @JvmStatic fun tick(server: MinecraftServer) {
        if (done || !CombatServices.CONTENT.ready()) return
        try {
            val combat = CombatServices.get(server)
            if (age >= 40) { age++; verifySharedSleep(server); return }
            when (age++) {
                0 -> {
                    val level = TestWorld.prepare(server)
                    player = FakePlayerFactory.get(level, GameProfile(UUID.randomUUID(), "P3NativeCheck"))
                    player.moveTo(2.0, 100.0, 5.0, 0F, 0F)
                    mock = TestWorld.mockOwner(server, player)
                    PokemonServerChecks.initializeTestData(player.uuid)
                    val pokemon = individual("machop", 50)
                    check(Cobblemon.storage.getParty(player).add(pokemon))
                    pokemon.moveSet.clear()
                    pokemon.moveSet.setMove(0, requireNotNull(Moves.getByName("tackle")).create())
                    actor = send(pokemon, server, 2.0)
                    target = send(individual("snorlax", 70), server, 5.0)
                    dualTarget = send(individual("bulbasaur", 50), server, 12.0)
                }
                20 -> {
                    verifySnapshots()
                    check(target.pokemon.currentHealth == target.pokemon.maxHealth && abs(target.health - target.maxHealth) < .001F) {
                        "Native send-out started with divergent HP: native=${target.pokemon.currentHealth}/${target.pokemon.maxHealth}, world=${target.health}/${target.maxHealth}"
                    }
                    firstDamage = cast(server, 5.0)
                    println("P3CHECK native baseline hit=$firstDamage world HP; script checked physical/special, STAB, weakness, dual resistance and immunity")
                }
                25 -> {
                    val pokemon = actor.pokemon
                    pokemon.ivs[Stats.ATTACK] = 11
                    check(view(actor).stat("atk") > baseline.stat("atk"))
                    pokemon.hyperTrainIV(Stats.ATTACK, 31)
                    pokemon.evs[Stats.ATTACK] = 252
                    pokemon.mintedNature = requireNotNull(Natures.getNature("adamant"))
                    val trained = view(actor)
                    check(trained.iv("atk") == 11 && trained.effectiveIv("atk") == 31 && trained.ev("atk") == 252)
                    check(trained.nature() == "cobblemon:hardy" && trained.effectiveNature() == "cobblemon:adamant")
                    check(trained.stat("atk") == 145 && trained.stat("atk") == pokemon.getStat(Stats.ATTACK))
                    check(baseline.iv("atk") == 0 && baseline.ev("atk") == 0 && baseline.stat("atk") == 85)
                    target.pokemon.heal()
                    target.invulnerableTime = 0
                    val trainedDamage = cast(server, 9.8 / 1.48)
                    check(trainedDamage > firstDamage)
                    println("P3CHECK native IV/EV, hyper training and mint changed actual damage $firstDamage -> $trainedDamage world HP")
                }
                30 -> {
                    verifyHealthBoundary(server)
                    ordinary = cow(server, 5.0, 1024.0)
                    val before = ordinary.health
                    combat.runtime().start("checks:unified-hurt", combat.bind(actor), combat.bind(ordinary), player.uuid)
                    check(largeDamage > 1000 && before == 1024F && ordinary.health == 0F) {
                        "Shared calculation/execution clipped ordinary damage: requested=$largeDamage health=$before->${ordinary.health}"
                    }
                    println("P3CHECK actual ordinary entity lost 1024 HP from uncapped shared damage request=$largeDamage")
                    ordinary.discard(); ordinary = cow(server, 8.0, 80.0)
                }

            }
        } catch (error: Throwable) {
            done = true; mock?.close(); mock = null
            error.printStackTrace()
            println("P3CHECK FAIL native attributes tick=$age $error")
        }
    }

    private fun verifySharedSleep(server: MinecraftServer) {
        val combat = CombatServices.get(server)
        val now = world(server).tick()
        check(age < 500) { "Shared sleep checks did not advance after real cooldowns" }
        for ((entity, started) in sleepStarts) {
            if (entity in sleepDeadlines) continue
            val elapsed = now - started
            check(elapsed <= 45) { "Missed a shared sleep deadline" }
            if (elapsed < 45) check(sleeping(server, entity)) { "${entity.type} woke at $elapsed instead of 45 ticks" }
            else {
                check(!sleeping(server, entity)) { "${entity.type} remained asleep after 45 ticks" }
                check(entity.getAttributeValue(Attributes.MOVEMENT_SPEED) > 0)
                sleepDeadlines += entity
            }
        }
        fun ready() = !combat.runtime().busy(combat.bind(actor)) && world(server).cooldown("checks:unified-sleep") == 0L
        fun castSleep(entity: net.minecraft.world.entity.LivingEntity) {
            check(ready())
            combat.runtime().start("checks:unified-sleep", combat.bind(actor), combat.bind(entity), player.uuid)
            check(sleeping(server, entity))
            check(entity.getAttributeValue(Attributes.MOVEMENT_SPEED) == 0.0)
        }
        fun blockedAttack(entity: net.minecraft.world.entity.LivingEntity) {
            val before = actor.health
            actor.invulnerableTime = 0
            actor.hurt(actor.damageSources().mobAttack(entity), 5F)
            check(abs(actor.health - before) < .001F) { "Sleeping ${entity.type} dealt a real melee hit" }
        }
        when (sleepPhase) {
            0 -> if (ready()) {
                actor.pokemon.heal(); dualTarget.pokemon.heal()
                castSleep(dualTarget); sleepStarts[dualTarget] = now; blockedAttack(dualTarget)
                check(dualTarget.pokemon.status?.status?.name.toString() == "cobblemon:sleep")
                sleepPhase++
            }
            1 -> if (ready()) {
                castSleep(ordinary); sleepStarts[ordinary] = now; blockedAttack(ordinary); sleepPhase++
            }
            2 -> if (sleepDeadlines.size == 2) {
                check(dualTarget.pokemon.status == null)
                println("P3CHECK actual Pokemon and ordinary cow each sleep exactly 45 ticks; both block native melee; distinct casts respect actual cooldown")
                sleepPhase++
            }
            3, 4 -> if (ready()) {
                val entity = if (sleepPhase == 3) dualTarget else ordinary
                castSleep(entity); entity.invulnerableTime = 0
                check(entity.hurt(entity.damageSources().mobAttack(actor), .5F))
                sleepPhase++
            }
            5 -> if (ready()) {
                check(!sleeping(server, dualTarget) && !sleeping(server, ordinary)) { "Actual fractional damage did not wake both targets" }
                check(dualTarget.pokemon.status == null)
                println("P3CHECK actual 0.5 world damage wakes both targets and clears the native sleep mirror")
                castSleep(dualTarget); recalledSleeper = dualTarget.pokemon
                check(recalledSleeper.status != null); recalledSleeper.recall()
                phaseStarted = now; sleepPhase++
            }
            6 -> if (now - phaseStarted >= 2) {
                // The native slot mirrors the Minecraft effect and, like poison, keeps counting in the party after recall.
                check(recalledSleeper.status != null) { "Native sleep mirror was dropped by recall" }
                dualTarget = send(recalledSleeper, server, 12.0); phaseStarted = now; sleepPhase++
            }
            7 -> if (now - phaseStarted >= 20 && ready()) {
                castSleep(dualTarget); val original = dualTarget.pokemon.status
                check(original != null)
                check(PokemonScriptApi().status(world(server, true), combat.bind(dualTarget), "cobblemon:sleep", 12, view(dualTarget).statusKey()))
                replacementStatus = dualTarget.pokemon.status; check(replacementStatus !== original)
                recalledSleeper = dualTarget.pokemon; recalledSleeper.recall(); phaseStarted = now; sleepPhase++
            }
            8 -> if (now - phaseStarted >= 2) {
                check(recalledSleeper.status === replacementStatus) { "Mirror cleanup erased a later same-type container" }
                var cleanups = 0
                combat.lease(Long.MIN_VALUE, Runnable { cleanups++ })
                combat.release(Long.MIN_VALUE, "lease-check"); combat.release(Long.MIN_VALUE, "lease-check-repeated")
                check(cleanups == 1)
                println("P3CHECK actual recall releases native status mirrors; later same-type containers survive and owner cleanup is once-only")
                val old = combat.bind(actor)
                check(BattleRegistry.getBattleByParticipatingPlayer(player) == null)
                check(actor.battleId == null && target.battleId == null)
                actor.pokemon.recall(); check(!combat.valid(old))
                check(runCatching { PokemonScriptApi().pokemon(old) }.isFailure)
                target.pokemon.recall(); ordinary.discard(); TestWorld.clean(combat)
                mock?.close(); mock = null; done = true
                println("P3CHECK PASS native snapshots, provider extension, cultivation, world damage units, uncapped ordinary damage, common sleep/wake and recall")
            }
        }
    }

    private fun verifySnapshots() {
        val pokemon = actor.pokemon
        baseline = view(actor)
        for (stat in Cobblemon.statProvider.ofType(Stat.Type.PERMANENT)) {
            check(baseline.stat(stat.identifier.toString()) == pokemon.getStat(stat))
            check(baseline.stat(stat.showdownId) == pokemon.getStat(stat))
            check(baseline.iv(stat.showdownId) == 0 && baseline.ev(stat.showdownId) == 0)
        }
        check(baseline.stat("atk") == 85 && baseline.stat("spa") == 40)
        check(baseline.typeCount() == 1 && baseline.type(0) == "fighting")
        check(baseline.id() == pokemon.uuid.toString() && baseline.species() == "cobblemon:machop")
        check(baseline.ability() == pokemon.ability.name)
        check(baseline.moveSlots() == 4 && baseline.move(1) == null && baseline.move(3) == null)
        val oldMove = requireNotNull(baseline.move(0))
        check(oldMove.id() == "tackle" && oldMove.type() == "normal" && oldMove.category() == "physical")
        check(oldMove.power() == 40.0 && oldMove.accuracy() == 100.0 && oldMove.pp() == oldMove.maxPp())
        val liveMove = requireNotNull(pokemon.moveSet[0])
        liveMove.currentPp = 2
        liveMove.raisedPpStages = 1
        pokemon.moveSet.setMove(3, requireNotNull(Moves.getByName("leer")).create())
        pokemon.swapHeldItem(ItemStack(Items.DIAMOND), decrement = false)
        val changed = view(actor)
        check(changed.move(0)?.pp() == 2 && changed.move(0)?.maxPp() == liveMove.maxPp)
        check(changed.move(3)?.id() == "leer" && changed.heldItem() == "minecraft:diamond")
        check(changed.heldDescriptionId() == ItemStack(Items.DIAMOND).descriptionId && baseline.heldDescriptionId().isEmpty())
        check(oldMove.pp() == 35 && oldMove.maxPp() == 35 && baseline.move(3) == null && baseline.heldItem() == "")
        pokemon.moveSet.setMove(3, null); liveMove.raisedPpStages = 0; liveMove.currentPp = liveMove.maxPp
        pokemon.removeHeldItem()
        check(runCatching { baseline.stat("missing:stat") }.exceptionOrNull() is IllegalArgumentException)
        check(runCatching { PokemonScriptApi().typeEffectiveness("missing-type", "normal") }.isFailure)

        val provider = Cobblemon.statProvider
        try {
            Cobblemon.statProvider = object : StatProvider by provider {
                override fun getStatForPokemon(pokemon: Pokemon, stat: Stat) =
                    provider.getStatForPokemon(pokemon, stat) + if (stat == Stats.ATTACK) 7 else 0
            }
            check(view(actor).stat("atk") == 92) { "SDK ignored the installed native stat provider" }
        } finally {
            Cobblemon.statProvider = provider
        }
        check(view(actor).stat("atk") == 85 && baseline.stat("atk") == 85)
        println("P3CHECK immutable stats, types, moves/PP, item identity and installed stat provider passed")
    }

    private fun cast(server: MinecraftServer, expected: Double): Double {
        val combat = CombatServices.get(server)
        val before = target.pokemon.currentHealth
        val beforeWorld = target.health
        val scale = view(target).healthScale()
        val pp = requireNotNull(actor.pokemon.moveSet[0]).currentPp
        val previousHits = hits
        combat.runtime().start(ACTION, combat.bind(actor), combat.bind(target), player.uuid)
        check(hits == previousHits + 1 && abs(scriptedDamage - expected) < 1e-8) { "Native script did not complete with $expected damage" }
        val actual = beforeWorld - target.health
        check(abs(actual - expected) < .001F) { "Script requested $expected world HP but settled $actual" }
        val expectedNative = kotlin.math.ceil(before - expected / scale - 1e-5).toInt()
        check(target.pokemon.currentHealth == expectedNative) { "World damage did not project accurately to native HP: $before -> ${target.pokemon.currentHealth}; scale=$scale" }
        check(requireNotNull(actor.pokemon.moveSet[0]).currentPp == pp) { "Read-only move snapshot mutated PP" }
        TestWorld.clean(combat)
        return actual.toDouble()
    }

    private fun verifyHealthBoundary(server: MinecraftServer) {
        val combat = CombatServices.get(server)
        target.pokemon.heal()
        val before = target.pokemon.currentHealth
        repeat(5) {
            target.invulnerableTime = 0
            check(combat.damage(combat.bind(actor), combat.bind(target), player.uuid, view(target).healthScale()))
            check(target.pokemon.currentHealth == before - it - 1) { "One-HP hit lost precision" }
        }
        // Preserve the existing upward rounding for genuinely fractional remaining HP.
        target.invulnerableTime = 0
        check(combat.damage(combat.bind(actor), combat.bind(target), player.uuid, 1.25 * view(target).healthScale()))
        check(target.pokemon.currentHealth == before - 6)
        println("P3CHECK one-HP hits and fractional HP rounding passed")
    }

    @JvmStatic fun dualDefender() = view(dualTarget)
    @JvmStatic fun recordUnified(amount: Double, applied: Boolean) { check(applied); largeDamage = amount }
    @JvmStatic fun record(damage: Double, applied: Boolean, duplicate: Boolean) {
        check(applied && !duplicate) { "Native hit was rejected or settled twice" }
        hits++; scriptedDamage = damage
    }

    private fun view(entity: PokemonEntity): PokemonView =
        PokemonScriptApi().pokemon(CombatServices.get(entity.server!!).bind(entity))

    private fun world(server: MinecraftServer, writable: Boolean = false): WorldAccess {
        val combat = CombatServices.get(server)
        return WorldAccess(combat.runtime(), combat.bind(actor), player.uuid, Runnable {}, writable, 0)
    }
    private fun sleeping(server: MinecraftServer, entity: net.minecraft.world.entity.LivingEntity): Boolean =
        world(server).mobEffects(CombatServices.get(server).bind(entity)).any { it.tagged("world_combat:status/sleep") }
    private fun cow(server: MinecraftServer, x: Double, capacity: Double): Cow = Cow(EntityType.COW, server.overworld()).also {
        it.moveTo(x, 100.0, 2.0, 0F, 0F); it.setNoAi(true); it.setNoGravity(true); it.setPersistenceRequired()
        it.getAttribute(Attributes.MAX_HEALTH)!!.baseValue = capacity; it.health = it.maxHealth
        check(server.overworld().addFreshEntity(it)); check(it.maxHealth.toDouble() == capacity)
    }

    private fun individual(species: String, level: Int) = PokemonProperties.parse("$species level=$level nature=hardy").create().also {
        for (stat in Cobblemon.statProvider.ofType(Stat.Type.PERMANENT)) {
            it.ivs[stat] = 0; it.evs[stat] = 0
        }
        it.heal()
    }

    private fun send(pokemon: Pokemon, server: MinecraftServer, x: Double) =
        pokemon.sendOut(server.overworld(), Vec3(x, 100.0, 2.0), null) {
            it.setNoAi(true); it.setNoGravity(true); it.setPersistenceRequired()
        } ?: error("Send-out failed")
}
