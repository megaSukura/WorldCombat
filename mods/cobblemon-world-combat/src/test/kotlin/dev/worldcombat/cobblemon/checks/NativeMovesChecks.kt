package dev.worldcombat.cobblemon.checks

import com.cobblemon.mod.common.Cobblemon
import com.cobblemon.mod.common.api.moves.Moves
import com.cobblemon.mod.common.api.pokemon.PokemonProperties
import com.cobblemon.mod.common.api.pokemon.stats.Stats
import com.cobblemon.mod.common.entity.pokemon.PokemonEntity
import com.cobblemon.mod.common.item.interactive.EtherItem
import com.cobblemon.mod.common.item.interactive.ElixirItem
import com.cobblemon.mod.common.pokemon.Pokemon
import com.google.gson.JsonArray
import com.google.gson.JsonObject
import com.mojang.authlib.GameProfile
import dev.worldcombat.cobblemon.control.*
import dev.worldcombat.cobblemon.network.*
import dev.worldcombat.cobblemon.script.NativePpCost
import dev.worldcombat.cobblemon.script.PokemonScriptApi
import dev.worldcombat.core.checks.TestWorld
import dev.worldcombat.core.runtime.*
import dev.worldcombat.core.world.*
import io.netty.buffer.Unpooled
import net.minecraft.core.registries.BuiltInRegistries
import net.minecraft.network.RegistryFriendlyByteBuf
import net.minecraft.resources.ResourceLocation
import net.minecraft.server.MinecraftServer
import net.minecraft.server.level.ServerPlayer
import net.minecraft.world.item.ItemStack
import net.minecraft.world.level.storage.LevelResource
import net.minecraft.world.phys.Vec3
import net.neoforged.neoforge.common.util.FakePlayerFactory
import java.nio.file.Files
import java.util.UUID

object NativeMovesChecks {
    private var age = 0
    private var done = false
    private lateinit var actor: PokemonEntity
    private lateinit var target: PokemonEntity
    private lateinit var other: PokemonEntity
    private lateinit var player: ServerPlayer
    private lateinit var session: CompanionControl.Session
    private var mock: AutoCloseable? = null
    private var beforeHp = 0
    private var ppBefore = 0
    private var queuedPp = 0
    private var reloadEpoch = 0L
    @Volatile private var reloadDone = false
    private var retained: ActionContext? = null
    private const val TACKLE = "cobblemon_world_combat:native_tackle"
    private const val EMBER = "cobblemon_world_combat:native_ember"

    @JvmStatic fun tick(server: MinecraftServer) {
        if (done || !CombatServices.CONTENT.ready()) return
        val combat = CombatServices.get(server)
        try {
            when (age++) {
                0 -> {
                    val level = TestWorld.prepare(server)
                    player = FakePlayerFactory.get(level, GameProfile(UUID.randomUUID(), "P3MoveCheck"))
                    player.moveTo(2.0, 100.0, 5.0, 0F, 0F)
                    mock = TestWorld.mockOwner(server, player)
                    PokemonServerChecks.initializeTestData(player.uuid)
                    val pokemon = individual("machop", 50)
                    pokemon.moveSet.clear()
                    listOf("tackle", "ember", "scratch", "leer").forEachIndexed { slot, id -> pokemon.moveSet.setMove(slot, move(id).create()) }
                    pokemon.moveSet[0]!!.currentPp = 5; pokemon.moveSet[1]!!.currentPp = 4; pokemon.moveSet[2]!!.currentPp = 5
                    check(Cobblemon.storage.getParty(player).add(pokemon))
                    actor = send(pokemon, server, 2.0)
                    target = send(individual("snorlax", 70), server, 5.0)
                    val second = individual("charmander", 30)
                    second.moveSet.clear(); second.moveSet.setMove(0, move("ember").create())
                    check(Cobblemon.storage.getParty(player).add(second)); other = send(second, server, 12.0)
                    session = CompanionControl.session(player)
                }
                20 -> {
                    CompanionControl.advance(session); session.permissions = 0
                    val state = CompanionControl.snapshot(session)
                    check(state.skills()[0].id() == TACKLE && state.skills()[0].remaining() == 5)
                    check(state.skills()[1].id() == EMBER && state.skills()[1].remaining() == 4)
                    check(state.skills()[3].label() == "cobblemon.move.leer" && state.skills()[3].reason() == "move-unimplemented")
                    check(!state.skills()[3].available())
                    check(CompanionContent.resolve(combat.bind(other), 0).id == EMBER)
                    val buffer = RegistryFriendlyByteBuf(Unpooled.buffer(), server.registryAccess())
                    try {
                        ControlState.CODEC.encode(buffer, state)
                        check(ControlState.CODEC.decode(buffer) == state)
                        val packet = packet(0)
                        ControlCommand.CODEC.encode(buffer, packet)
                        check(ControlCommand.CODEC.decode(buffer) == packet)
                    } finally { buffer.release() }
                    request(0); check(session.reason == "accepted" && pp(0) == 5)
                    check(combat.runtime().interruptPreparation(combat.bind(actor)))
                    check(pp(0) == 5 && combat.runtime().cooldown(combat.bind(actor), TACKLE) == 0L)
                    TestWorld.clean(combat)
                    println("P3CHECK individual loadouts, move labels/resources, packet roundtrip and cancellation before commit passed")
                }
                22 -> {
                    val stale = packet(0)
                    check(actor.pokemon.exchangeMove(move("tackle"), move("watergun")))
                    CompanionControl.request(player, stale)
                    check(session.reason == "content-mismatch")
                    check(CompanionControl.snapshot(session).skills()[0].id() == "cobblemon_world_combat:native_watergun")
                    check(actor.pokemon.exchangeMove(move("watergun"), move("tackle")))
                    actor.pokemon.moveSet[0]!!.currentPp = 5
                }
                24 -> { request(0); check(session.reason == "accepted"); actor.pokemon.moveSet[0]!!.currentPp = 0 }
                32 -> {
                    check(combat.runtime().state(combat.bind(actor)).reason() == "no-pp")
                    check(pp(0) == 0 && combat.runtime().cooldown(combat.bind(actor), TACKLE) == 0L)
                    request(0); check(session.reason == "no-pp")
                    actor.pokemon.moveSet[0]!!.currentPp = 5
                }
                34 -> { request(0); actor.pokemon.moveSet.setMove(0, actor.pokemon.moveSet[0]!!.copy()) }
                42 -> {
                    check(combat.runtime().state(combat.bind(actor)).reason() == "loadout-changed")
                    check(pp(0) == 5 && combat.runtime().cooldown(combat.bind(actor), TACKLE) == 0L)
                    println("P3CHECK stale requests, insufficient PP and same-ID replacement during preparation spend nothing")
                }
                44 -> { beforeHp = target.pokemon.currentHealth; request(0) }
                52 -> {
                    check(pp(0) == 4 && beforeHp - target.pokemon.currentHealth == 17)
                    check(combat.runtime().cooldown(combat.bind(actor), TACKLE) > 0)
                    val repeated = packet(0)
                    CompanionControl.request(player, repeated); CompanionControl.request(player, repeated)
                    check(session.reason == "cooldown" && pp(0) == 4)
                    TestWorld.clean(combat)
                }
                54 -> {
                    target.pokemon.heal(); target.invulnerableTime = 0; target.moveTo(11.0, 100.0, 2.0, 0F, 0F)
                    request(1); check(session.reason == "accepted")
                }
                62 -> {
                    check(pp(1) == 3 && combat.runtime().busy(combat.bind(actor)))
                    val pokemon = actor.pokemon
                    pokemon.recall(); actor = send(pokemon, server, 2.0)
                    TestWorld.clean(combat)
                }
                82 -> {
                    CompanionControl.advance(session); session.permissions = 0
                    check(pp(1) == 3 && target.pokemon.currentHealth == target.pokemon.maxHealth)
                    request(1); check(session.reason == "cooldown")
                    println("P3CHECK manual native damage, one PP per commitment, replay/cooldown and committed recall passed")
                }
                84 -> { request(2); check(session.reason == "accepted") }
                92 -> {
                    check(pp(2) == 3)
                    check(CompanionControl.snapshot(session).skills()[2].remaining() == 3)
                    println("P3CHECK an added script-only move binding charges two PP through the same host adapter")
                }
                94 -> {
                    val binding = CompanionContent.resolve(combat.bind(actor), 2)
                    val result = runCatching { combat.runtime().start("checks:rollback", combat.bind(actor), input(combat), player.uuid, binding.arguments) }
                    check(result.isFailure && pp(2) == 3 && combat.runtime().cooldown(combat.bind(actor), "checks:rollback") == 0L)
                    check(CombatServices.CONTENT.get("checks:double-pp") != null)
                    TestWorld.clean(combat)
                }
                96 -> {
                    val old = pp(0); useEther("ether", 0)
                    check(pp(0) == minOf(old + 10, actor.pokemon.moveSet[0]!!.maxPp))
                    val elixir = BuiltInRegistries.ITEM.get(ResourceLocation.parse("cobblemon:elixir")) as ElixirItem
                    val stack = ItemStack(elixir)
                    val before = pp(1)
                    elixir.applyToPokemon(player, stack, actor.pokemon)
                    check(stack.isEmpty && pp(1) == minOf(before + 10, actor.pokemon.moveSet[1]!!.maxPp))
                    actor.pokemon.moveSet[2]!!.raiseMaxPP(1)
                    actor.pokemon.heal()
                    check(actor.pokemon.moveSet.all { it.currentPp == it.maxPp })
                    println("P3CHECK failed payment rollback, native Ether/Elixir and native healing/PP increase passed")
                }
                98 -> {
                    check(actor.pokemon.exchangeMove(move("leer"), null))
                    check(CompanionControl.snapshot(session).skills()[3].reason() == "empty-slot")
                    check(actor.pokemon.exchangeMove(null, move("watergun")))
                    check(pp(3) == 0 && CompanionControl.snapshot(session).skills()[3].reason() == "no-pp")
                    useEther("ether", 3)
                    check(pp(3) == 10 && CompanionControl.snapshot(session).skills()[3].available())
                }
                100 -> {
                    target.moveTo(5.0, 100.0, 2.0, 0F, 0F); target.invulnerableTime = 0
                    val stale = packet(0)
                    actor.pokemon.moveSet.swapMove(0, 1)
                    CompanionControl.request(player, stale); check(session.reason == "content-mismatch")
                    check(CompanionControl.snapshot(session).skills()[1].id() == TACKLE)
                    ppBefore = pp(1)
                    session.permissions = 2; session.tactics = "autonomous"; session.lastManual = 0
                    session.body.memory = "{\"initialized\":true,\"next\":0}"
                    val view = TacticsContext(combat, session, "tick")
                    check(view.canUse(1))
                    CompanionContent.brain()!!.accept(view)
                    view.close()
                    check(combat.runtime().busy(combat.bind(actor)))
                    check(runCatching { view.world() }.isFailure)
                }
                110 -> {
                    check(pp(1) == ppBefore - 1)
                    println("P3CHECK native forgetting/remembering, slot reorder and script AI share the live loadout and PP path")
                }
                112 -> { combat.runtime().start("checks:committed-hold", combat.bind(actor), combat.bind(target), player.uuid) }
                114 -> {
                    request(0); check(session.reason == "queued")
                    check(actor.pokemon.exchangeMove(move("ember"), move("vinewhip")))
                    queuedPp = pp(0)
                }
                120 -> {
                    CompanionControl.advance(session); session.permissions = 0
                    check(session.pending == null && session.reason == "content-mismatch" && pp(0) == queuedPp) {
                        "Queued replacement: pending=${session.pending} reason=${session.reason} pp=${pp(0)} expected=$queuedPp"
                    }
                    val binding = CompanionContent.resolve(combat.bind(actor), 2)
                    combat.runtime().start("checks:slow-cost", combat.bind(actor), input(combat), player.uuid, binding.arguments)
                    val held = retained!!
                    val moveKey = PokemonScriptApi().pokemon(combat.bind(actor)).move(2)!!.key()
                    val escaped = NativePpCost(held, 2, moveKey, 1.0)
                    check(runCatching { escaped.prepare(held) }.isFailure)
                    check(runCatching { escaped.apply() }.isFailure && runCatching { escaped.rollback() }.isFailure)
                    ppBefore = pp(2); reloadEpoch = CombatServices.CONTENT.epoch()
                    server.reloadResources(server.packRepository.selectedIds).thenRun { reloadDone = true }
                }
            }
            if (age > 125 && reloadDone && CombatServices.CONTENT.epoch() > reloadEpoch) {
                check(pp(2) == ppBefore)
                TestWorld.clean(combat)
                check(runCatching { retained!!.commit(20) }.isFailure)
                val pokemon = actor.pokemon
                val expected = JsonObject().also {
                    it.addProperty("owner", player.uuid.toString()); it.addProperty("pokemon", pokemon.uuid.toString())
                    it.add("moves", JsonArray().also { moves -> pokemon.moveSet.forEach { move ->
                        moves.add(JsonObject().also { row -> row.addProperty("id", move.name); row.addProperty("pp", move.currentPp)
                            row.addProperty("max", move.maxPp); row.addProperty("raised", move.raisedPpStages) })
                    } })
                }
                Files.writeString(server.getWorldPath(LevelResource.ROOT).resolve("worldcombat-moves-save.json"), expected.toString())
                pokemon.recall(); target.pokemon.recall(); other.pokemon.recall()
                mock?.close(); mock = null; done = true
                println("P3CHECK PASS moves: native loadouts, costs, cancellation, replacement, recovery, AI, queue, reload and save")
            }
            check(age < 240) { "Move checks timed out" }
        } catch (error: Throwable) {
            done = true; mock?.close(); mock = null; error.printStackTrace()
            println("P3CHECK FAIL native moves tick=$age $error")
        }
    }
    @JvmStatic fun retain(action: ActionContext) { retained = action }
    @JvmStatic fun failingCost(): CommitCost = object : CommitCost {
        override fun key() = "checks:failure"
        override fun prepare(action: ActionContext) {}
        override fun apply() { throw IllegalStateException("P3_EXPECTED_PAYMENT_FAILURE") }
        override fun rollback() {}
    }
    private fun packet(slot: Int): ControlCommand {
        val combat = CombatServices.get(player.server)
        val handle = combat.bind(actor)
        return ControlCommand(session.id, session.gate.lastSequence() + 1, CombatServices.CONTENT.epoch(), player.server.tickCount.toLong(),
            handle.entity(), handle.generation(), 0, "cast", slot, target.uuid, combat.position(combat.bind(target)), Point(1.0, 0.0, 0.0),
            CompanionContent.resolve(handle, slot).version)
    }
    private fun request(slot: Int) = CompanionControl.request(player, packet(slot))
    private fun pp(slot: Int) = actor.pokemon.moveSet[slot]!!.currentPp
    private fun input(combat: MinecraftCombat) = ActionTarget.entity(combat.bind(target), combat.position(combat.bind(target)), Point(1.0, 0.0, 0.0))
    private fun move(id: String) = requireNotNull(Moves.getByName(id))
    private fun useEther(id: String, slot: Int) {
        val item = BuiltInRegistries.ITEM.get(ResourceLocation.parse("cobblemon:$id")) as EtherItem
        val stack = ItemStack(item)
        item.applyToPokemon(player, stack, actor.pokemon, actor.pokemon.moveSet[slot]!!)
        check(stack.isEmpty)
    }
    private fun individual(species: String, level: Int) = PokemonProperties.parse("$species level=$level nature=hardy").create().also {
        for (stat in Stats.PERMANENT) { it.ivs[stat] = 0; it.evs[stat] = 0 }; it.heal()
    }
    private fun send(pokemon: Pokemon, server: MinecraftServer, x: Double) =
        pokemon.sendOut(server.overworld(), Vec3(x, 100.0, 2.0), null) { it.setNoAi(true); it.setNoGravity(true); it.setPersistenceRequired() }
            ?: error("Native send-out failed")
}
