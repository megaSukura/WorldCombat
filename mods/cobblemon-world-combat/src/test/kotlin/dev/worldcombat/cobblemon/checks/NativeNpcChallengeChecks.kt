package dev.worldcombat.cobblemon.checks

import com.bedrockk.molang.runtime.MoLangRuntime
import com.bedrockk.molang.runtime.MoParams
import com.bedrockk.molang.runtime.value.DoubleValue
import com.bedrockk.molang.runtime.value.MoValue
import com.bedrockk.molang.runtime.value.StringValue
import com.cobblemon.mod.common.Cobblemon
import com.cobblemon.mod.common.api.battles.model.PokemonBattle
import com.cobblemon.mod.common.api.events.CobblemonEvents
import com.cobblemon.mod.common.api.events.battles.BattleVictoryEvent
import com.cobblemon.mod.common.api.moves.Moves
import com.cobblemon.mod.common.api.molang.function.PlayerMoLangFunctions
import com.cobblemon.mod.common.api.npc.NPCClasses
import com.cobblemon.mod.common.api.pokemon.PokemonProperties
import com.cobblemon.mod.common.api.pokemon.stats.Stats
import com.cobblemon.mod.common.api.reactive.ObservableSubscription
import com.cobblemon.mod.common.api.storage.party.NPCPartyStore
import com.cobblemon.mod.common.battles.BattleBuilder
import com.cobblemon.mod.common.battles.BattleFormat
import com.cobblemon.mod.common.battles.BattleRegistry
import com.cobblemon.mod.common.battles.ErroredBattleStart
import com.cobblemon.mod.common.battles.SuccessfulBattleStart
import com.cobblemon.mod.common.entity.npc.NPCBattleActor
import com.cobblemon.mod.common.entity.npc.NPCEntity
import com.cobblemon.mod.common.pokemon.Pokemon
import com.cobblemon.mod.common.util.getBattleState
import com.cobblemon.mod.common.util.isInBattle
import com.google.gson.JsonObject
import com.mojang.authlib.GameProfile
import dev.worldcombat.cobblemon.NativeNpcChallenges
import dev.worldcombat.cobblemon.PokemonCombatDomain
import dev.worldcombat.core.checks.TestWorld
import dev.worldcombat.core.runtime.WorldEvent
import dev.worldcombat.core.world.CombatServices
import net.minecraft.core.BlockPos
import net.minecraft.server.MinecraftServer
import net.minecraft.server.level.ClientInformation
import net.minecraft.server.level.ServerPlayer
import net.minecraft.world.entity.EntityType
import net.minecraft.world.entity.Mob
import net.minecraft.world.entity.ai.attributes.Attributes
import net.minecraft.world.level.block.Blocks
import net.minecraft.world.phys.Vec3
import net.neoforged.neoforge.common.util.FakePlayerFactory
import net.neoforged.bus.api.EventPriority
import net.neoforged.neoforge.common.NeoForge
import net.neoforged.neoforge.event.entity.living.LivingDeathEvent
import java.util.UUID
import java.util.function.Consumer

/** Neutral native integration; the supplied play profile owns deployment, targeting and move AI. */
object NativeNpcChallengeChecks {
    private var age = 0
    private var phase = 0
    private var since = 0
    private var done = false
    private var cancelCase = 0
    private var reloadEpoch = -1L
    @Volatile private var reloadDone = false
    private var reloadFailure: Throwable? = null
    private lateinit var player: ServerPlayer
    private lateinit var npc: NPCEntity
    private lateinit var bystander: Mob
    private lateinit var battle: PokemonBattle
    private var ownerLease: AutoCloseable? = null
    private var victorySubscription: ObservableSubscription<BattleVictoryEvent>? = null
    private val playerParty = mutableListOf<Pokemon>()
    private val npcParty = mutableListOf<Pokemon>()
    private val victories = mutableMapOf<UUID, Int>()
    private val endings = mutableMapOf<UUID, Int>()
    private val npcWon = mutableMapOf<UUID, Boolean>()
    private val npcEntities = mutableSetOf<UUID>()
    private var initialPp = emptyList<List<Int>>()
    private var damaged = 0
    private var unrelatedDamage = 0
    private var cancelPlayerDeath = false
    private var deathRequests = 0
    private var revivedDeaths = 0
    private val lateDeathListener = Consumer<LivingDeathEvent> { event ->
        if (::player.isInitialized && event.entity === player) {
            deathRequests++
            if (cancelPlayerDeath) {
                event.isCanceled = true
                player.health = player.maxHealth
                revivedDeaths++
            }
        }
    }
    private var firstRetired: UUID? = null
    private var replacement: UUID? = null
    private val cancellationNames = listOf("native end", "registry close", "disconnect", "stop twice", "NPC leaves", "content reload")

    @JvmStatic fun applied(event: WorldEvent) {
        if (done || event.actor()?.entity() !in npcEntities) return
        damaged++
        if (::bystander.isInitialized && event.target()?.entity() == bystander.uuid) unrelatedDamage++
    }

    private fun next(value: Int) { phase = value; since = age }
    private fun active() = npcParty.mapNotNull { it.entity }.filter { it.isAlive && !it.isRemoved && !it.pokemon.isFainted() }
    private fun mark(message: String) = println("NPCCHECK $message")
    private fun pp() = npcParty.map { pokemon -> pokemon.moveSet.map { it.currentPp } }
    private fun command(server: MinecraftServer, command: String) = server.commands.dispatcher.execute(command, server.createCommandSourceStack().withSuppressedOutput())
    private fun callbackValue(key: String) = npc.data.map[key]?.asDouble()?.toInt() ?: 0

    private fun createNpc(server: MinecraftServer) {
        npc = NPCEntity(server.overworld())
        npc.npc = checkNotNull(NPCClasses.getByName("standard"))
        npc.moveTo(14.0, 100.0, 8.0, 90F, 0F)
        npc.initialize(10)
        npc.setNoAi(true)
        npc.setPersistenceRequired()
        npcParty.clear()
        repeat(3) {
            npcParty += PokemonProperties.parse("bulbasaur level=10").create().also { pokemon ->
                pokemon.moveSet.clear()
                pokemon.moveSet.setMove(0, checkNotNull(Moves.getByName("seedbomb")).create())
                pokemon.moveSet.setMove(1, checkNotNull(Moves.getByName("tackle")).create())
            }
        }
        npc.party = NPCPartyStore(npc).also { party -> npcParty.forEach { check(party.add(it)) } }
        check(server.overworld().addFreshEntity(npc))
    }

    private fun callbacks() {
        npc.config.setDirectly("on_defeat", StringValue("q.npc.data.fixture_defeats = (q.npc.data.fixture_defeats ?? 0) + 1;"))
        npc.config.setDirectly("on_victory", StringValue("q.npc.data.fixture_victories = (q.npc.data.fixture_victories ?? 0) + 1;"))
        npc.config.setDirectly("on_player_wins", StringValue("q.npc.data.fixture_player_wins = (q.npc.data.fixture_player_wins ?? 0) + 1;"))
        npc.config.setDirectly("on_player_loses", StringValue("q.npc.data.fixture_player_losses = (q.npc.data.fixture_player_losses ?? 0) + 1;"))
        npc.config.setDirectly("player_win_command", StringValue("scoreboard players add player_wins npc_checks 1"))
        npc.config.setDirectly("player_lose_command", StringValue("scoreboard players add player_losses npc_checks 1"))
        npc.config.setDirectly("challenge_cooldown", DoubleValue(5.0))
    }

    private fun begin(server: MinecraftServer) {
        player.health = player.maxHealth
        playerParty.forEach { it.heal() }
        npcParty.forEach { it.heal() }
        if (playerParty.first().entity == null) checkNotNull(playerParty.first().sendOut(server.overworld(), Vec3(5.0, 100.0, 8.0), null))
        callbacks()
        val result = BattleBuilder.pvn(player, npc, battleFormat = BattleFormat.GEN_9_DOUBLES)
        check(result is SuccessfulBattleStart) { "Native double pvn failed: $result" }
        battle = result.battle
        victories[battle.battleId] = 0
        endings[battle.battleId] = 0
        battle.onEndHandlers += { ended -> endings[ended.battleId] = endings.getValue(ended.battleId) + 1 }
        check(BattleRegistry.getBattle(battle.battleId) === battle)
        check(BattleRegistry.getBattleByParticipatingPlayer(player) === battle)
        check(BattleRegistry.getBattleByParticipatingPlayerId(player.uuid) === battle)
        check(!player.isInBattle() && player.getBattleState() == null && NativeNpcChallenges.operationBattle(player) == null) {
            "Managed challenge retained the legacy item/party operation lock"
        }
        val functions = PlayerMoLangFunctions.attach(player)
        val params = MoParams(MoLangRuntime().environment, emptyList())
        check((functions.getValue("in_battle")(params) as MoValue).asDouble() == 1.0)
        check(functions.getValue("battle")(params) === battle.struct) { "MoLang lost the managed native battle identity" }
        check(npc.battleIds.contains(battle.battleId)) { "pvn did not retain the native NPC battle identity" }
        check(BattleBuilder.pvn(player, npc, battleFormat = BattleFormat.GEN_9_DOUBLES) is ErroredBattleStart) { "Repeated start created a second challenge" }
        initialPp = pp()
    }

    private fun unchangedPreflight() {
        val originals = (playerParty + npcParty).map { Triple(it.uuid, it.level, it.currentHealth) }
        check(BattleBuilder.pvn(player, npc, battleFormat = BattleFormat.GEN_9_DOUBLES, cloneParties = true) is ErroredBattleStart)
        check(BattleBuilder.pvn(player, npc, battleFormat = BattleFormat.GEN_9_DOUBLES.copy(adjustLevel = 50)) is ErroredBattleStart)
        check(BattleBuilder.pvn(player, npc, battleFormat = BattleFormat.GEN_9_DOUBLES.copy(adjustLevel = 50), cloneParties = true) is ErroredBattleStart)
        check((playerParty + npcParty).map { Triple(it.uuid, it.level, it.currentHealth) } == originals) { "Rejected clone/adjust request mutated original native party" }
        check(BattleRegistry.getBattleByParticipatingPlayer(player) == null && npcParty.all { it.entity == null })
        mark("clone/adjust requests rejected before mutating original party levels, HP or deployment")
    }

    private fun worldOnly() {
        check(battle.showdownMessages.isEmpty() && battle.turn == 0) { "World challenge entered the Showdown turn engine" }
        for (entity in active()) {
            npcEntities += entity.uuid
            check(entity.battleId == null && !entity.isBusy) { "Native turn battle locked the NPC world body" }
            check(!entity.pokemon.isWild()) { "NPC individual was classified as wild" }
            check(!PokemonCombatDomain().mayControl(entity, player)) { "Challenger gained control over the NPC party" }
            val facts = JsonObject()
            PokemonCombatDomain().facts(entity, facts)
            check(!facts.get("wild").asBoolean)
        }
        for (pokemon in playerParty) check(pokemon.entity?.battleId == null)
    }

    private fun retired(server: MinecraftServer, expectedVictories: Int) {
        check(battle.ended)
        check(victories.getValue(battle.battleId) == expectedVictories) { "Wrong native victory count: $victories" }
        check(endings.getValue(battle.battleId) == 1) { "Native end callbacks were missing or repeated: $endings" }
        check(BattleRegistry.getBattle(battle.battleId) == null && BattleRegistry.getBattleByParticipatingPlayer(player) == null)
        check(battle.battleId !in npc.battleIds)
        check(npcParty.all { it.entity == null || it.entity!!.isRemoved }) { "NPC party remained sent out after retirement" }
        check(battle.showdownMessages.isEmpty() && battle.turn == 0)
        check(command(server, "scoreboard players get player_wins npc_checks") == 1)
        check(command(server, "scoreboard players get player_losses npc_checks") == if (phase >= 8) 1 else 0)
    }

    @JvmStatic fun tick(server: MinecraftServer) {
        if (done || !CombatServices.CONTENT.ready()) return
        try {
            check(++age < 1700) { "Timed out at phase=$phase cancellation=$cancelCase" }
            reloadFailure?.let { throw it }
            if (::battle.isInitialized && !battle.ended) worldOnly()
            when (phase) {
                0 -> {
                    val level = TestWorld.prepare(server)
                    for (cx in 0..1) for (cz in 0..1) level.setChunkForced(cx, cz, true)
                    for (x in 0..31) for (z in 0..20) {
                        level.setBlockAndUpdate(BlockPos(x, 99, z), Blocks.STONE.defaultBlockState())
                        for (y in 100..107) level.setBlockAndUpdate(BlockPos(x, y, z), Blocks.AIR.defaultBlockState())
                    }
                    val profile = GameProfile(UUID.randomUUID(), "NpcChallenge")
                    player = ServerPlayer(server, level, profile, ClientInformation.createDefault()).also {
                        it.connection = FakePlayerFactory.get(level, profile).connection
                    }
                    player.moveTo(4.0, 100.0, 8.0, 0F, 0F)
                    player.getAttribute(Attributes.MAX_HEALTH)!!.baseValue = 10000.0
                    player.health = player.maxHealth
                    ownerLease = TestWorld.mockOwner(server, player)
                    level.addNewPlayer(player)
                    NeoForge.EVENT_BUS.addListener(EventPriority.LOWEST, false, LivingDeathEvent::class.java, lateDeathListener)
                    PokemonServerChecks.initializeTestData(player.uuid)
                    repeat(2) {
                        val pokemon = PokemonProperties.parse("blissey level=50").create()
                        Stats.PERMANENT.forEach { pokemon.evs[it] = 0 }
                        pokemon.moveSet.clear()
                        check(Cobblemon.storage.getParty(player).add(pokemon))
                        playerParty += pokemon
                    }
                    checkNotNull(playerParty.first().sendOut(level, Vec3(5.0, 100.0, 8.0), null))
                    NativePartyChecks.runNPC(CombatServices.get(server), player)
                    mark("native NPC party scope passed: dynamic store identity, revive, deployment, switching and player selection isolation")
                    bystander = TestWorld.mob(EntityType.COW, level, 12.0)
                    bystander.moveTo(12.0, 100.0, 13.0, 0F, 0F)
                    bystander.getAttribute(Attributes.MAX_HEALTH)!!.baseValue = 1000.0
                    bystander.health = bystander.maxHealth
                    createNpc(server)
                    command(server, "scoreboard objectives add npc_checks dummy")
                    command(server, "scoreboard players set player_wins npc_checks 0")
                    command(server, "scoreboard players set player_losses npc_checks 0")
                    victorySubscription = CobblemonEvents.BATTLE_VICTORY.subscribe { event ->
                        if (event.battle.battleId in victories) {
                            victories[event.battle.battleId] = victories.getValue(event.battle.battleId) + 1
                            npcWon[event.battle.battleId] = event.winners.any { it is NPCBattleActor }
                        }
                    }
                    next(1)
                }
                1 -> if (age - since >= 10) { unchangedPreflight(); begin(server); next(2) }
                2 -> if (active().size == 2) {
                    check(playerParty[1].entity == null) { "NPC challenge forced the player's second party member into the world" }
                    check(npcParty[2].entity == null)
                    check(active().map { it.pokemon.uuid }.toSet().size == 2)
                    firstRetired = active().first().pokemon.uuid
                    replacement = npcParty[2].uuid
                    mark("real double pvn success, registry/MoLang identity, unlocked native item operations, duplicate rejection and two independent NPC bodies")
                    next(3)
                }
                3 -> {
                    check(age - since < 400) { "Production NPC AI did not cast and apply damage; PP=${pp()} applied=$damaged" }
                    if (pp() != initialPp && damaged > 0) {
                        check(unrelatedDamage == 0 && bystander.health == bystander.maxHealth) { "NPC attacked an unrelated bystander" }
                        check(npcParty.any { pokemon -> pokemon.moveSet.any { it.currentPp < it.maxPp } })
                        val participant = playerParty.first()
                        val source = checkNotNull(participant.entity)
                        val defeated = npcParty.first { it.uuid == firstRetired }
                        val victim = checkNotNull(defeated.entity)
                        check(!defeated.isWild() && defeated.getOwnerNPC() === npc)
                        val oldExperience = participant.experience
                        val oldEv = participant.evs.getOrDefault(Stats.SPECIAL_ATTACK)
                        val combat = CombatServices.get(server)
                        victim.invulnerableTime = 0
                        check(combat.damage(combat.bind(source), combat.bind(victim), player.uuid, 10000.0)) { "Real player-owned attack did not damage the NPC opponent" }
                        check(defeated.isFainted()) { "Real lethal damage did not faint the NPC party member" }
                        check(participant.experience > oldExperience && participant.evs.getOrDefault(Stats.SPECIAL_ATTACK) > oldEv) {
                            "NPC defeat did not award native growth: XP ${participant.experience - oldExperience}, special-attack EV ${participant.evs.getOrDefault(Stats.SPECIAL_ATTACK) - oldEv}"
                        }
                        mark("real player-owned defeat of non-wild NPC member awarded native XP +${participant.experience - oldExperience} and special-attack EV +${participant.evs.getOrDefault(Stats.SPECIAL_ATTACK) - oldEv}")
                        mark("production shared move AI committed native PP and applied real world damage")
                        next(4)
                    }
                }
                4 -> if (active().size == 2 && active().any { it.pokemon.uuid == replacement }) {
                    check(active().none { it.pokemon.uuid == firstRetired })
                    npcParty.forEach { it.currentHealth = 0 }
                    mark("fainted front-line member replaced by the third native party member")
                    next(5)
                }
                5 -> if (battle.ended && age - since >= 15) {
                    retired(server, 1)
                    check(npcWon[battle.battleId] == false)
                    check(callbackValue("fixture_defeats") == 1 && callbackValue("fixture_player_wins") == 1)
                    battle.end(); BattleRegistry.closeBattle(battle)
                    check(victories.getValue(battle.battleId) == 1 && endings.getValue(battle.battleId) == 1)
                    mark("player victory ran native event, MoLang and command reward exactly once, including repeated end")
                    begin(server); next(6)
                }
                6 -> if (active().size == 2) { playerParty.forEach { it.currentHealth = 0 }; next(7) }
                7 -> if (age - since >= 20) {
                    check(!battle.ended) { "Fainted companion party defeated the living challenger" }
                    check(victories.getValue(battle.battleId) == 0)
                    cancelPlayerDeath = true
                    player.invulnerableTime = 0
                    player.hurt(player.damageSources().genericKill(), Float.MAX_VALUE)
                    check(deathRequests == 1 && revivedDeaths == 1 && player.isAlive) { "Late native death cancellation fixture did not restore the challenger" }
                    next(9)
                }
                9 -> if (age - since >= 20) {
                    check(player.isAlive && !battle.ended && BattleRegistry.getBattle(battle.battleId) === battle) { "Cancelled native death retired the surviving player's challenge" }
                    check(victories.getValue(battle.battleId) == 0 && endings.getValue(battle.battleId) == 0)
                    check(command(server, "scoreboard players get player_losses npc_checks") == 0)
                    check(callbackValue("fixture_victories") == 0 && callbackValue("fixture_player_losses") == 0)
                    mark("real lethal hurt cancelled by LOWEST native listener restored HP; challenge and rewards stayed unchanged")
                    cancelPlayerDeath = false
                    player.invulnerableTime = 0
                    player.hurt(player.damageSources().genericKill(), Float.MAX_VALUE)
                    check(deathRequests == 2 && revivedDeaths == 1 && player.isDeadOrDying) { "Uncancelled native lethal hurt did not establish player death" }
                    next(8)
                }
                8 -> if (battle.ended && age - since >= 15) {
                    retired(server, 1)
                    check(npcWon[battle.battleId] == true)
                    check(callbackValue("fixture_victories") == 1 && callbackValue("fixture_player_losses") == 1)
                    mark("living challenger continued after party faint; actual challenger death ran NPC victory callbacks once")
                    begin(server); next(10)
                }
                10 -> if (active().size == 2) {
                    when (cancelCase) {
                        0 -> battle.end()
                        1 -> BattleRegistry.closeBattle(battle)
                        2 -> { ownerLease?.close(); ownerLease = null }
                        3 -> { NativeNpcChallenges.stop(server, "fixture-stop"); NativeNpcChallenges.stop(server, "fixture-stop-again") }
                        4 -> npc.discard()
                        5 -> {
                            reloadEpoch = CombatServices.CONTENT.epoch()
                            server.reloadResources(server.packRepository.selectedIds).thenRun { reloadDone = true }.exceptionally {
                                reloadFailure = it; null
                            }
                        }
                    }
                    next(11)
                }
                11 -> if (battle.ended && age - since >= 20 && (cancelCase != 5 || reloadDone && CombatServices.CONTENT.epoch() > reloadEpoch)) {
                    retired(server, 0)
                    mark("${cancellationNames[cancelCase]} cancelled without rewards and recalled the entire NPC party")
                    if (cancelCase == 2) ownerLease = TestWorld.mockOwner(server, player)
                    if (cancelCase == 4) createNpc(server)
                    cancelCase++
                    if (cancelCase < cancellationNames.size) { begin(server); next(10) } else next(12)
                }
                12 -> if (age - since >= 60) {
                    check(victories.values.sum() == 2 && endings.values.all { it == 1 })
                    check(unrelatedDamage == 0)
                    TestWorld.clean(CombatServices.get(server))
                    finish(server)
                    mark("PASS native NPC challenges: double deployment, replacement, shared AI and PP, control isolation, native reward callbacks, cancellation and reload cleanup")
                }
            }
        } catch (error: Throwable) {
            mark("FAIL native NPC challenges phase=$phase age=$age cancellation=$cancelCase: $error")
            error.printStackTrace()
            finish(server)
        }
    }

    private fun finish(server: MinecraftServer) {
        done = true
        runCatching { NativeNpcChallenges.stop(server, "fixture-cleanup") }
        victorySubscription?.unsubscribe()
        NeoForge.EVENT_BUS.unregister(lateDeathListener)
        playerParty.forEach { runCatching { it.recall() } }
        npcParty.forEach { runCatching { it.recall() } }
        if (::npc.isInitialized) npc.discard()
        if (::bystander.isInitialized) bystander.discard()
        ownerLease?.close(); ownerLease = null
        if (::player.isInitialized) player.discard()
        server.halt(false)
    }
}
