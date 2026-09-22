package dev.worldcombat.cobblemon.checks

import com.cobblemon.mod.common.Cobblemon
import com.cobblemon.mod.common.CobblemonItems
import com.cobblemon.mod.common.api.events.CobblemonEvents
import com.cobblemon.mod.common.api.moves.Moves
import com.cobblemon.mod.common.api.pokemon.PokemonProperties
import com.cobblemon.mod.common.api.pokemon.stats.Stats
import com.cobblemon.mod.common.entity.pokemon.PokemonEntity
import com.cobblemon.mod.common.pokemon.Pokemon
import com.cobblemon.mod.common.pokemon.evolution.progress.*
import com.cobblemon.mod.common.pokemon.requirements.DefeatRequirement
import com.google.gson.JsonArray
import com.google.gson.JsonObject
import com.mojang.authlib.GameProfile
import dev.worldcombat.cobblemon.script.GrowthEvent
import dev.worldcombat.cobblemon.script.PokemonScriptApi
import dev.worldcombat.core.checks.TestWorld
import dev.worldcombat.core.runtime.ActionTarget
import dev.worldcombat.core.runtime.Point
import dev.worldcombat.core.world.CombatServices
import net.minecraft.server.MinecraftServer
import net.minecraft.server.level.ServerPlayer
import net.minecraft.world.item.ItemStack
import net.minecraft.world.level.storage.LevelResource
import net.minecraft.world.phys.Vec3
import net.neoforged.neoforge.common.util.FakePlayerFactory
import java.nio.file.Files
import java.util.UUID

object NativeGrowthChecks {
    private var age = 0
    private var done = false
    private lateinit var player: ServerPlayer
    private var mock: AutoCloseable? = null
    private lateinit var bulbasaur: Pokemon
    private lateinit var learner: Pokemon
    private lateinit var primeape: Pokemon
    private lateinit var yamask: Pokemon
    private lateinit var bisharp: Pokemon
    private lateinit var actor: PokemonEntity
    private lateinit var target: PokemonEntity
    private lateinit var monkey: PokemonEntity
    private lateinit var mask: PokemonEntity
    private lateinit var blade: PokemonEntity
    private var beforeXp = 0
    private var learnerXp = 0
    private var learnedAt = 0
    private var friendship = 0
    private var beforePp = 0
    private var epoch = 0L
    private lateinit var retained: GrowthEvent
    @Volatile private var reloaded = false
    private const val USE = "checks:growth-use"

    @JvmStatic fun tick(server: MinecraftServer) {
        if (done || !CombatServices.CONTENT.ready()) return
        val combat = CombatServices.get(server)
        try {
            when (age++) {
                0 -> {
                    val level = TestWorld.prepare(server)
                    player = FakePlayerFactory.get(level, GameProfile(UUID.randomUUID(), "P3Growth"))
                    player.moveTo(0.0, 100.0, 5.0, 0F, 0F)
                    mock = TestWorld.mockOwner(server, player)
                    PokemonServerChecks.initializeTestData(player.uuid)
                    bulbasaur = individual("bulbasaur level=15")
                    learner = individual("charmander level=2")
                    learnedAt = (3..15).first { level ->
                        (learner.form.moves.getLevelUpMovesUpTo(level) - learner.form.moves.getLevelUpMovesUpTo(level - 1).toSet()).isNotEmpty() }
                    learner.level = learnedAt - 1
                    learner.moveSet.clear()
                    learner.moveSet.add(Moves.getByName("scratch")!!.create())
                    learner.swapHeldItem(ItemStack(CobblemonItems.EXP_SHARE))
                    primeape = individual("primeape level=35 moves=ragefist")
                    primeape.moveSet.clear(); primeape.moveSet.add(Moves.getByName("ragefist")!!.create())
                    yamask = individual("yamask galarian level=30")
                    bisharp = individual("bisharp level=60")
                    val party = Cobblemon.storage.getParty(player)
                    listOf(bulbasaur, learner, primeape, yamask, bisharp).forEach { check(party.add(it)) }
                    bulbasaur.setExperienceAndUpdateLevel(bulbasaur.experienceGroup.getExperience(16) - 1)
                    learner.setExperienceAndUpdateLevel(learner.experienceGroup.getExperience(learnedAt) - 1)
                    beforeXp = bulbasaur.experience; learnerXp = learner.experience; friendship = bulbasaur.friendship
                    actor = send(bulbasaur, server, 2.0)
                    target = send(individual("rattata level=4"), server, 4.0)
                    monkey = send(primeape, server, 8.0); mask = send(yamask, server, 14.0); blade = send(bisharp, server, 20.0)
                }
                15 -> {
                    val evBefore = bulbasaur.evs.getOrDefault(Stats.SPEED)
                    target.pokemon.currentHealth = 1
                    check(combat.damage(combat.bind(actor), combat.bind(target), player.uuid, 10.0))
                    check(bulbasaur.experience > beforeXp && bulbasaur.level >= 16 && bulbasaur.friendship > friendship)
                    check(bulbasaur.evs.getOrDefault(Stats.SPEED) > evBefore)
                    check(learner.experience > learnerXp && learner.level >= learnedAt)
                    val unlocked = learner.form.moves.getLevelUpMovesUpTo(learnedAt) - learner.form.moves.getLevelUpMovesUpTo(learnedAt - 1).toSet()
                    check(unlocked.any { learned -> learner.moveSet.any { it.template == learned } })
                    check(primeape.experience == primeape.experienceGroup.getExperience(primeape.level))
                    val after = bulbasaur.experience
                    check(!combat.damage(combat.bind(actor), combat.bind(target), player.uuid, 10.0) && bulbasaur.experience == after)
                    Cobblemon.storage.getParty(player).onSecondPassed(player)
                    check(bulbasaur.evolutionProxy.server().any { it.result.species == "ivysaur" })
                    val id = bulbasaur.uuid
                    bulbasaur.recall()
                    bulbasaur.evolutionProxy.server().start(bulbasaur.evolutionProxy.server().first { it.result.species == "ivysaur" })
                    check(bulbasaur.species.name == "Ivysaur" && bulbasaur.uuid == id && bulbasaur.experience == after)
                    actor = send(bulbasaur, server, 2.0)
                    println("P3CHECK native XP/EV, Exp Share, level friendship, learned move, optional evolution and one defeat settlement passed")
                }
                25 -> {
                    check(UseMoveEvolutionProgress.supports(primeape, Moves.getByName("ragefist")!!))
                    beforePp = primeape.moveSet[0]!!.currentPp
                    use(server); combat.runtime().interruptPreparation(combat.bind(monkey))
                    check(uses() == 0 && primeape.moveSet[0]!!.currentPp == beforePp)
                    use(server)
                }
                30 -> {
                    check(uses() == 1 && primeape.moveSet[0]!!.currentPp == beforePp - 1)
                    check(DamageTakenEvolutionProgress.supports(yamask)) { "Galarian Yamask form did not load" }
                    val before = yamask.currentHealth
                    mask.invulnerableTime = 0
                    check(mask.hurt(mask.damageSources().generic(), 2F))
                    val taken = yamask.evolutionProxy.server().progress().filterIsInstance<DamageTakenEvolutionProgress>().single().currentProgress().amount
                    check(taken == before - yamask.currentHealth && taken > 0)
                    val friendship = yamask.friendship
                    mask.invulnerableTime = 0; check(mask.hurt(mask.damageSources().generic(), 10000F))
                    check(yamask.isFainted() && yamask.friendship == friendship - 1)
                    check(yamask.evolutionProxy.server().progress().filterIsInstance<DamageTakenEvolutionProgress>().all { it.currentProgress().amount == 0 })
                    yamask.heal()
                    println("P3CHECK paid move counts once, cancellation is free, accepted native damage counts, faint resets counters and friendship passed")
                }
                40 -> {
                    val requirement = bisharp.lockedEvolutions.flatMap { it.requirements.filterIsInstance<DefeatRequirement>() }.first()
                    target = send(requirement.target.create(), server, 22.0)
                    check(requirement.target.matches(target.pokemon))
                    target.pokemon.currentHealth = 1
                    check(combat.damage(combat.bind(blade), combat.bind(target), player.uuid, 10.0))
                    check(bisharp.evolutionProxy.server().progress().filterIsInstance<DefeatEvolutionProgress>().single().currentProgress().amount == 1)
                    val stored = bisharp.saveToNBT(server.registryAccess())
                    val restored = Pokemon().loadFromNBT(server.registryAccess(), stored)
                    val restoredRecord = restored.evolutionProxy.server().progress().filterIsInstance<DefeatEvolutionProgress>().single()
                    check(restoredRecord.currentProgress().amount == 1)
                    check(restoredRecord.currentProgress().target.originalString == requirement.target.originalString)
                    println("P3CHECK native defeat requirement spelling restored after codec round trip: ${requirement.target.originalString} -> ${requirement.target.asString()}")
                    println("P3CHECK species and held-item-qualified defeat evolution counter passed")
                }
                45 -> {
                    bulbasaur.swapHeldItem(ItemStack(CobblemonItems.POWER_BRACER))
                    bulbasaur.evs[Stats.ATTACK] = 251; bulbasaur.evs[Stats.SPEED] = 252; bulbasaur.evs[Stats.HP] = 6
                    target = send(individual("machop level=2"), server, 4.0); target.pokemon.currentHealth = 1
                    check(combat.damage(combat.bind(actor), combat.bind(target), player.uuid, 10.0))
                    check(bulbasaur.evs.getOrDefault(Stats.ATTACK) == 252 && bulbasaur.evs.sumOf { it.value } == 510)
                    val stale = GrowthEvent("defeat", actor, target, null, 0, "")
                    stale.recipient(0).experience(2.0)
                    val old = bulbasaur.experience
                    rejects { stale.recipient(0).experience(2.0) }
                    check(bulbasaur.experience == old)
                    stale.close()
                    rejects { stale.recipient(0).ev("atk", 1.0) }
                    println("P3CHECK native EV caps, staged reward writes and expired mutation handles passed")
                }
                50 -> {
                    // Exercise the actual script error boundary using an invalid native configuration value.
                    val multiplier = Cobblemon.config.experienceMultiplier
                    val old = bulbasaur.experience
                    target = send(individual("rattata level=2"), server, 4.0); target.pokemon.currentHealth = 1
                    try {
                        Cobblemon.config.experienceMultiplier = Float.NaN
                        check(combat.damage(combat.bind(actor), combat.bind(target), player.uuid, 10.0))
                    } finally { Cobblemon.config.experienceMultiplier = multiplier }
                    check(bulbasaur.experience == old && CombatServices.CONTENT.get(USE) != null)
                    retained = GrowthEvent("defeat", actor, target, null, 0, "")
                    epoch = CombatServices.CONTENT.epoch()
                    server.reloadResources(server.packRepository.selectedIds).thenRun { reloaded = true }
                }
            }
            if (age > 55 && reloaded && CombatServices.CONTENT.epoch() > epoch) {
                rejects { retained.recipient(0).experience(1.0) }
                val old = bulbasaur.experience
                target = send(individual("rattata level=2"), server, 4.0); target.pokemon.currentHealth = 1
                check(combat.damage(combat.bind(actor), combat.bind(target), player.uuid, 10.0))
                check(bulbasaur.experience > old)
                val expected = JsonObject().also { it.addProperty("owner", player.uuid.toString()) }
                val rows = JsonArray()
                Cobblemon.storage.getParty(player).forEach { pokemon ->
                    pokemon.recall()
                    rows.add(JsonObject().also { row ->
                        row.addProperty("id", pokemon.uuid.toString()); row.addProperty("species", pokemon.species.name)
                        row.addProperty("experience", pokemon.experience); row.addProperty("friendship", pokemon.friendship)
                        row.addProperty("atk", pokemon.evs.getOrDefault(Stats.ATTACK)); row.addProperty("spe", pokemon.evs.getOrDefault(Stats.SPEED))
                        row.addProperty("uses", pokemon.evolutionProxy.server().progress().filterIsInstance<UseMoveEvolutionProgress>().sumOf { it.currentProgress().amount })
                        row.addProperty("defeats", pokemon.evolutionProxy.server().progress().filterIsInstance<DefeatEvolutionProgress>().sumOf { it.currentProgress().amount })
                    })
                }
                expected.add("pokemon", rows)
                Files.writeString(server.getWorldPath(LevelResource.ROOT).resolve("worldcombat-growth-save.json"), expected.toString())
                TestWorld.clean(combat)
                mock?.close(); done = true
                println("P3CHECK PASS growth: native rewards, sharing, EV caps, learning, evolution records, isolation, reload and save")
            }
        } catch (error: Throwable) {
            done = true; mock?.close(); error.printStackTrace(); println("P3CHECK FAIL growth $error")
        }
    }
    private fun individual(properties: String) = PokemonProperties.parse(properties).create().also { p ->
        Stats.PERMANENT.forEach { p.evs[it] = 0 }; p.heal()
    }
    private fun send(pokemon: Pokemon, server: MinecraftServer, x: Double): PokemonEntity =
        pokemon.sendOut(server.overworld(), Vec3(x, 100.0, 0.0), null)!!.also {
            it.beamMode = 0; it.setNoAi(true); it.setNoGravity(true); it.setPersistenceRequired()
        }
    private fun uses() = primeape.evolutionProxy.server().progress().filterIsInstance<UseMoveEvolutionProgress>().sumOf { it.currentProgress().amount }
    private fun rejects(operation: () -> Unit) { check(runCatching(operation).exceptionOrNull() is IllegalStateException) { "Expired or repeated mutation accepted" } }
    private fun use(server: MinecraftServer) {
        val combat = CombatServices.get(server)
        val view = PokemonScriptApi().pokemon(combat.bind(monkey)).move(0)!!
        combat.runtime().start(USE, combat.bind(monkey), ActionTarget.direction(Point(1.0, 0.0, 0.0)), player.uuid,
            mapOf("native-slot" to "0", "native-move" to view.key()))
    }
}
