package dev.worldcombat.cobblemon.checks

import com.cobblemon.mod.common.Cobblemon
import com.cobblemon.mod.common.CobblemonItems
import com.cobblemon.mod.common.api.pokemon.PokemonProperties
import com.cobblemon.mod.common.api.pokemon.stats.Stats
import com.cobblemon.mod.common.api.pokeball.PokeBalls
import com.cobblemon.mod.common.entity.PoseType
import com.cobblemon.mod.common.entity.pokemon.PokemonEntity
import com.cobblemon.mod.common.pokemon.Pokemon
import com.cobblemon.mod.common.trade.*
import com.mojang.authlib.GameProfile
import dev.worldcombat.cobblemon.PokemonCombatDomain
import dev.worldcombat.cobblemon.control.CompanionControl
import dev.worldcombat.cobblemon.control.CompanionTactics
import dev.worldcombat.cobblemon.script.PokemonScriptApi
import dev.worldcombat.cobblemon.script.CaptureView
import dev.worldcombat.cobblemon.network.ControlCommand
import dev.worldcombat.core.checks.TestWorld
import dev.worldcombat.core.world.CombatServices
import net.minecraft.nbt.CompoundTag
import net.minecraft.server.MinecraftServer
import net.minecraft.server.level.ServerPlayer
import net.minecraft.world.item.ItemStack
import net.minecraft.world.phys.Vec3
import net.neoforged.neoforge.common.util.FakePlayerFactory
import java.util.UUID

object NativeOperationsChecks {
    private var age = 0
    private var done = false
    private lateinit var player: ServerPlayer
    private lateinit var other: ServerPlayer
    private lateinit var pokemon: Pokemon
    private lateinit var kadabra: Pokemon
    private lateinit var actor: PokemonEntity
    private lateinit var target: PokemonEntity
    private lateinit var session: CompanionControl.Session
    private var mock: AutoCloseable? = null
    private var mockOther: AutoCloseable? = null
    private var nativeBrainChecked = false

    @JvmStatic fun tick(server: MinecraftServer) {
        if (done || !CombatServices.CONTENT.ready()) return
        val combat = CombatServices.get(server)
        try {
            when (age++) {
                0 -> {
                    val level = TestWorld.prepare(server)
                    player = FakePlayerFactory.get(level, GameProfile(UUID.randomUUID(), "P3Operations"))
                    other = FakePlayerFactory.get(level, GameProfile(UUID.randomUUID(), "P3Trade"))
                    player.moveTo(0.0, 100.0, 5.0, 0F, 0F); other.moveTo(5.0, 100.0, 5.0, 0F, 0F)
                    mock = TestWorld.mockOwner(server, player); mockOther = TestWorld.mockOwner(server, other)
                    PokemonServerChecks.initializeTestData(player.uuid); PokemonServerChecks.initializeTestData(other.uuid)
                    pokemon = PokemonProperties.parse("charizard level=50 nature=hardy gender=male").create()
                    Stats.PERMANENT.forEach { pokemon.ivs[it] = 0; pokemon.evs[it] = 0 }
                    kadabra = PokemonProperties.parse("kadabra level=20").create()
                    check(Cobblemon.storage.getParty(player).add(pokemon)); check(Cobblemon.storage.getParty(other).add(kadabra))
                    actor = send(pokemon, server, 2.0)
                    target = send(PokemonProperties.parse("snorlax level=30").create(), server, 7.0)
                    session = CompanionControl.session(player)
                }
                15 -> {
                    CompanionControl.advance(session); session.permissions = 0
                    val handle = combat.bind(actor)
                    val initial = PokemonScriptApi().pokemon(handle)
                    val mint = ItemStack(CobblemonItems.ADAMANT_MINT)
                    check(CobblemonItems.ADAMANT_MINT.applyToPokemon(player, mint, pokemon).result.consumesAction() && mint.isEmpty)
                    check(pokemon.getStat(Stats.ATTACK) > initial.stat("atk") && pokemon.nature.name.toString() == initial.nature())
                    val candy = ItemStack(CobblemonItems.MIGHTY_CANDY, 31)
                    repeat(31) { check(CobblemonItems.MIGHTY_CANDY.applyToPokemon(player, candy, pokemon).result.consumesAction()) }
                    check(candy.isEmpty && pokemon.ivs.getOrDefault(Stats.ATTACK) == 0 && pokemon.ivs.getEffectiveBattleIV(Stats.ATTACK) == 31)
                    val protein = ItemStack(CobblemonItems.PROTEIN)
                    check(CobblemonItems.PROTEIN.applyToPokemon(player, protein, pokemon).result.consumesAction() && protein.isEmpty)
                    check(pokemon.evs.getOrDefault(Stats.ATTACK) == 10)
                    pokemon.currentHealth = pokemon.maxHealth - 10
                    val potion = ItemStack(CobblemonItems.POTION)
                    check(CobblemonItems.POTION.applyToPokemon(player, potion, pokemon)!!.result.consumesAction() && potion.isEmpty)
                    check(pokemon.isFullHealth() && kotlin.math.abs(actor.health - actor.maxHealth) < 0.001)
                    val rare = ItemStack(CobblemonItems.RARE_CANDY)
                    val oldFriendship = pokemon.friendship
                    check(CobblemonItems.RARE_CANDY.applyToPokemon(player, rare, pokemon)!!.result.consumesAction() && rare.isEmpty)
                    check(pokemon.level == 51 && pokemon.friendship > oldFriendship)
                    val patch = ItemStack(CobblemonItems.ABILITY_PATCH)
                    check(CobblemonItems.ABILITY_PATCH.processInteraction(player, actor, patch) && patch.isEmpty)
                    check(PokemonScriptApi().pokemon(handle).ability() == "solarpower")
                    val rotom = send(PokemonProperties.parse("rotom level=20").create(), server, 10.0)
                    val beforeForm = PokemonScriptApi().pokemon(combat.bind(rotom))
                    PokemonProperties.parse("form=wash").apply(rotom.pokemon)
                    val afterForm = PokemonScriptApi().pokemon(combat.bind(rotom))
                    check(afterForm.form() != beforeForm.form() && afterForm.stat("spa") > beforeForm.stat("spa"))
                    check((0 until afterForm.typeCount()).any { afterForm.type(it) == "water" })
                    rotom.pokemon.recall()
                    println("P3CHECK native mint, effective IV candy, EV vitamin, potion and rare candy handlers plus live stat/HP updates passed")
                    println("P3CHECK native ability patch and live form/type/stat changes are visible to scripts")
                }
                20 -> {
                    hold(server)
                    actor.entityData.set(PokemonEntity.EVOLUTION_STARTED, true)
                    combat.tick(); CompanionControl.advance(session)
                    check(session.actor == null && !combat.controls(actor) && !combat.runtime().busy(combat.bind(actor)))
                    actor.entityData.set(PokemonEntity.EVOLUTION_STARTED, false)
                    CompanionControl.advance(session); check(session.actor != null)
                    hold(server)
                    val previousPose = actor.getCurrentPoseType()
                    val heldActor = session.actor
                    val domain = PokemonCombatDomain()
                    for (pose in PoseType.entries) {
                        actor.entityData.set(PokemonEntity.POSE_TYPE, pose)
                        check(domain.mayControl(actor, player) && !domain.mayControl(actor, other))
                        CompanionControl.advance(session)
                        check(session.actor == heldActor && combat.controls(actor)) { "Native pose removed an authorized action: $pose" }
                    }
                    actor.entityData.set(PokemonEntity.POSE_TYPE, previousPose)
                    hold(server)
                    // NeoForge FakePlayer deliberately refuses riding; use the native player implementation with its no-op connection.
                    val rider = ServerPlayer(server, server.overworld(), player.gameProfile, net.minecraft.server.level.ClientInformation.createDefault())
                    rider.connection = player.connection
                    check(rider.startRiding(actor, true))
                    combat.tick(); CompanionControl.advance(session)
                    check(session.actor == null && !combat.controls(actor) && rider.vehicle === actor)
                    rider.stopRiding(); CompanionControl.advance(session); check(session.actor != null)
                    println("P3CHECK all native poses preserve owner policy access; evolution and native riding retain their control boundaries")
                }
                30 -> {
                    session.permissions = 1; session.tactics = "autonomous"
                    CompanionTactics.save(session, combat)
                    hold(server)
                    val old = combat.bind(actor)
                    val party = Cobblemon.storage.getParty(player)
                    val pc = Cobblemon.storage.getPC(player.uuid, server.registryAccess())
                    val pp = pokemon.moveSet.first().currentPp
                    check(party.remove(pokemon) && pc.add(pokemon))
                    combat.tick(); CompanionControl.advance(session)
                    check(!combat.valid(old) && pokemon.entity == null && session.actor == null)
                    check(pc.count { it.uuid == pokemon.uuid } == 1 && party.none { it.uuid == pokemon.uuid })
                    val stored = pc.saveToNBT(CompoundTag(), server.registryAccess())
                    check(!stored.isEmpty)
                    check(pc.remove(pokemon) && party.add(pokemon))
                    actor = send(pokemon, server, 2.0); CompanionControl.advance(session)
                    check(pokemon.moveSet.first().currentPp == pp && session.permissions == 1 && session.tactics == "autonomous")
                    check(combat.bind(actor) != old)
                    println("P3CHECK native PC transfer, one stored individual, PP/tactics preservation and old-handle invalidation passed")
                }
                24 -> NativePartyChecks.run(combat, actor, player)
                25 -> {
                    val quick = PokeBalls.QUICK_BALL.catchRateModifier
                    check(quick.value(player, target.pokemon) == 5F && quick.modifyCatchRate(10F, player, target.pokemon) == 50F)
                    check(PokeBalls.TIMER_BALL.catchRateModifier.value(player, target.pokemon) == 1F)
                    check(PokeBalls.LEVEL_BALL.catchRateModifier.value(player, target.pokemon) == 2F)
                    check(PokeBalls.SAFARI_BALL.catchRateModifier.value(player, target.pokemon) == 1.5F)
                    check(combat.damage(combat.bind(actor), combat.bind(target), player.uuid, 1.0))
                    check(PokeBalls.SAFARI_BALL.catchRateModifier.value(player, target.pokemon) == 1F)
                    val female = PokemonProperties.parse("charizard level=30 gender=female").create()
                    check(PokeBalls.LOVE_BALL.catchRateModifier.value(player, female) == 8F)
                    check(PokeBalls.LOVE_BALL.catchRateModifier.value(player, target.pokemon) == 1F)
                    check(PokeBalls.ULTRA_BALL.catchRateModifier.value(player, target.pokemon) == 2F)
                    check(PokeBalls.MASTER_BALL.catchRateModifier.isGuaranteed())
                    val state = linkedMapOf<String, Double>()
                    val event = CaptureView(player, target.pokemon, "fixture", "capture", state)
                    event.setNumber("first", 3.0); event.multiplier(2.0)
                    check(state.isEmpty() && event.number("first") == 3.0)
                    check(event.finish() == 2F && state["first"] == 3.0)
                    check(runCatching { event.setNumber("first", 4.0) }.exceptionOrNull() is IllegalStateException)
                    println("P3CHECK native ball getters and modifier application use script conditions; capture writes are staged and expire")
                }
                250 -> {
                    check(PokeBalls.QUICK_BALL.catchRateModifier.value(player, target.pokemon) == 1F)
                    val timer = PokeBalls.TIMER_BALL.catchRateModifier.value(player, target.pokemon)
                    check(timer > 1.5F && timer < 2F)
                    check(PokeBalls.SAFARI_BALL.catchRateModifier.value(other, target.pokemon) == 1.5F)
                    println("P3CHECK quick/timer elapsed world time and per-player encounter isolation passed")
                    hold(server)
                    val old = combat.bind(actor)
                    val first = PlayerTradeParticipant(player); val second = PlayerTradeParticipant(other)
                    val trade = ActiveTrade(first, second)
                    trade.updateOffer(first, pokemon); trade.updateOffer(second, kadabra)
                    TradeManager.performTrade(trade, first, pokemon, second, kadabra)
                    combat.tick(); CompanionControl.advance(session)
                    check(pokemon.getOwnerUUID() == other.uuid && kadabra.getOwnerUUID() == player.uuid)
                    check(!combat.valid(old) && pokemon.entity == null && kadabra.entity == null)
                    check(Cobblemon.storage.getParty(other).count { it.uuid == pokemon.uuid } == 1)
                    check(Cobblemon.storage.getParty(player).count { it.uuid == kadabra.uuid } == 1)
                    check(kadabra.evolutionProxy.server().any { it.result.species == "alakazam" })
                    kadabra.evolutionProxy.server().start(kadabra.evolutionProxy.server().first { it.result.species == "alakazam" })
                    check(kadabra.species.name == "Alakazam")
                    actor = send(pokemon, server, 2.0)
                    check(!PokemonCombatDomain().mayControl(actor, player) && PokemonCombatDomain().mayControl(actor, other))
                    val view = PokemonScriptApi().pokemon(combat.bind(actor))
                    check(view.owner() == other.uuid.toString() && view.originalTrainer() == player.uuid.toString())
                    pokemon.recall(); target.pokemon.recall()
                    actor = send(kadabra, server, 2.0)
                    session.partySlot = Cobblemon.storage.getParty(player).indexOf(kadabra)
                    CompanionControl.advance(session)
                    CompanionTactics.command(session, ControlCommand(session.id, 0, CombatServices.CONTENT.epoch(),
                        server.tickCount.toLong(), actor.uuid, combat.bind(actor).generation(), session.partySlot,
                        "intent", 4, ControlCommand.NONE, combat.position(combat.bind(actor)),
                        dev.worldcombat.core.runtime.Point(1.0, 0.0, 0.0), ""), combat)
                    check(session.intent == "roam" && !combat.controls(actor))
                    target = send(PokemonProperties.parse("snorlax level=30").create(), server, 7.0)
                    hold(server); check(combat.controls(actor))
                    combat.runtime().cancelActor(combat.bind(actor), "fixture")
                    check(!combat.controls(actor))
                    actor.moveTo(2.0, 100.0, 2.0, 0F, 0F)
                    player.moveTo(12.0, 100.0, 2.0, 0F, 0F)
                    actor.setNoAi(false); actor.setNoGravity(false)
                    println("P3CHECK native trade and trade evolution passed; free activity releases the native brain between manual actions")
                }
            }
            if (age > 250) {
                CompanionControl.advance(session)
                check(!combat.controls(actor)) { "Free activity reacquired movement control" }
                // Verify the native task moved toward its owner; its stopping distance includes body size.
                if (actor.position().distanceTo(player.position()) < 7.0) nativeBrainChecked = true
                if (nativeBrainChecked) {
                    kadabra.recall(); target.pokemon.recall()
                    TestWorld.clean(combat)
                    mockOther?.close(); mock?.close(); done = true
                    println("P3CHECK PASS operations: native items, control handover, PC, trade, ownership, ball conditions and native follow AI")
                }
                check(done || age < 500) { "Native free-activity brain did not follow its owner: ${actor.position()}" }
            }
        } catch (error: Throwable) {
            done = true; mockOther?.close(); mock?.close(); error.printStackTrace(); println("P3CHECK FAIL operations $error")
        }
    }
    private fun hold(server: MinecraftServer) {
        val combat = CombatServices.get(server)
        combat.runtime().cancelActor(combat.bind(actor), "fixture")
        combat.runtime().start("checks:hold", combat.bind(actor), combat.bind(target), player.uuid)
    }
    private fun send(pokemon: Pokemon, server: MinecraftServer, x: Double) = pokemon.sendOut(server.overworld(), Vec3(x, 100.0, 0.0), null)!!.also {
        it.beamMode = 0; it.setNoAi(true); it.setNoGravity(true); it.setPersistenceRequired()
    }
}
