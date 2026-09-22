package dev.worldcombat.cobblemon.checks

import com.cobblemon.mod.common.Cobblemon
import com.cobblemon.mod.common.api.pokemon.PokemonProperties
import com.cobblemon.mod.common.entity.pokemon.PokemonEntity
import com.mojang.authlib.GameProfile
import dev.worldcombat.cobblemon.control.CompanionControl
import dev.worldcombat.cobblemon.network.ControlCommand
import dev.worldcombat.core.checks.TestWorld
import dev.worldcombat.core.runtime.Point
import dev.worldcombat.core.world.CombatServices
import net.minecraft.core.BlockPos
import net.minecraft.core.Direction
import net.minecraft.core.registries.BuiltInRegistries
import net.minecraft.resources.ResourceLocation
import net.minecraft.server.MinecraftServer
import net.minecraft.server.level.ServerPlayer
import net.minecraft.world.level.block.Blocks
import net.minecraft.world.level.block.state.properties.BlockStateProperties
import net.neoforged.neoforge.capabilities.Capabilities
import net.neoforged.neoforge.capabilities.RegisterCapabilitiesEvent
import net.neoforged.neoforge.common.util.FakePlayerFactory
import net.neoforged.neoforge.energy.EnergyStorage
import java.util.UUID

/** Actual native command/work pipeline using an empty move set and an external FE capability. */
object FunctionalWorkChecks {
    private var age = 0
    private var phase = 0
    private var since = 0
    private var stoppedEnergy = 0
    private var done = false
    private lateinit var player: ServerPlayer
    private lateinit var subject: PokemonEntity
    private lateinit var session: CompanionControl.Session
    private var ownerLease: AutoCloseable? = null
    private val storage = EnergyStorage(100000, 500, 0)
    private val energyPos = BlockPos(11, 100, 2)
    private val crankPos = BlockPos(9, 100, 4)
    private fun point(pos: BlockPos) = Point(pos.x + .5, pos.y + .5, pos.z + .5)
    private fun next(value: Int) { phase = value; since = age }
    private fun request(operation: String, pos: BlockPos) {
        val body = checkNotNull(session.actor)
        CompanionControl.request(player, ControlCommand(session.id, session.gate.lastSequence() + 1,
            session.epoch, player.server.tickCount.toLong(), body.entity(), body.generation(), session.partySlot,
            operation, 0, ControlCommand.NONE, point(pos), Point(1.0, 0.0, 0.0), "", "{}"))
    }
    private fun jobs(server: MinecraftServer) = CombatServices.get(server).runtime().effects().query(session.actor, "world_combat:machine_work")
    private fun crankSpeed(): Float {
        val entity = checkNotNull(player.serverLevel().getBlockEntity(crankPos))
        return (entity.javaClass.getMethod("getGeneratedSpeed").invoke(entity) as Number).toFloat()
    }
    private fun close() { if (::subject.isInitialized) subject.discard(); ownerLease?.close(); ownerLease = null }
    @JvmStatic fun tick(server: MinecraftServer) {
        if (done || !CombatServices.CONTENT.ready()) return
        try {
            check(++age < 800) { "Functional work stalled: phase=$phase reason=${if (::session.isInitialized) session.reason else "init"}" }
            if (phase == 0) {
                val level = TestWorld.prepare(server)
                player = FakePlayerFactory.get(level, GameProfile(UUID.randomUUID(), "FunctionalWork"))
                player.moveTo(2.0, 100.0, 4.0, 0f, 0f)
                ownerLease = TestWorld.mockOwner(server, player)
                PokemonServerChecks.initializeTestData(player.uuid)
                val pokemon = PokemonProperties.parse("pikachu level=30").create()
                pokemon.moveSet.clear()
                check(Cobblemon.storage.getParty(player).add(pokemon))
                subject = checkNotNull(pokemon.sendOut(level, net.minecraft.world.phys.Vec3(2.0, 100.0, 2.0), null))
                session = CompanionControl.session(player)
                val constructor = RegisterCapabilitiesEvent::class.java.getDeclaredConstructor()
                constructor.isAccessible = true
                constructor.newInstance().registerBlock(Capabilities.EnergyStorage.BLOCK,
                    { _, pos, _, _, side -> if (pos == energyPos && side == Direction.EAST) storage else null }, Blocks.GOLD_BLOCK)
                level.setBlockAndUpdate(energyPos, Blocks.GOLD_BLOCK.defaultBlockState())
                val crank = BuiltInRegistries.BLOCK.getOptional(ResourceLocation.parse("create:hand_crank")).orElseThrow()
                level.setBlockAndUpdate(crankPos, crank.defaultBlockState().setValue(BlockStateProperties.FACING, Direction.UP))
                next(1)
            }
            CompanionControl.advance(session)
            when (phase) {
                1 -> if (age - since >= 45) {
                    check(subject.pokemon.moveSet.get(0) == null) { "Native moves were added to an independent worker" }
                    request("electric-supply", energyPos)
                    check(jobs(server).size == 1 && session.intent == "work") { "Empty-move electric worker could not accept supply: ${session.reason}" }
                    val id = jobs(server)[0].id()
                    request("electric-supply", energyPos)
                    check(jobs(server).single().id() == id) { "Duplicate work command replaced its job" }
                    next(2)
                }
                2 -> if (storage.energyStored > 0) {
                    check(subject.x > 6) { "FE was delivered without actually approaching the block" }
                    check(subject.pokemon.moveSet.get(0) == null)
                    request("follow", energyPos)
                    check(jobs(server).isEmpty()) { "Changing to follow retained the old machine job" }
                    stoppedEnergy = storage.energyStored
                    next(3)
                }
                3 -> if (age - since >= 20) {
                    check(storage.energyStored == stoppedEnergy) { "Cancelled supply kept delivering FE" }
                    request("hand-crank-forward", crankPos)
                    check(jobs(server).size == 1) { "Crank command rejected: ${session.reason}" }
                    next(4)
                }
                4 -> if (crankSpeed() == 32f) {
                    request("hand-crank-reverse", crankPos)
                    next(5)
                }
                5 -> if (crankSpeed() == -32f) {
                    request("hand-crank-stop", crankPos)
                    check(jobs(server).isEmpty())
                    next(6)
                }
                6 -> if (age - since >= 20) {
                    check(crankSpeed() == 0f) { "Native crank continued after work stopped" }
                    check(subject.pokemon.moveSet.get(0) == null)
                    println("P5CHECK PASS functional work: empty moves, owned electric eligibility, actual approach/FE, idempotent command, change-order stop, native Create forward/reverse/stop, no native move or PP dependency")
                    done = true; close(); server.halt(false)
                }
            }
        } catch (error: Throwable) {
            done = true
            println("P5CHECK FAIL functional work phase=$phase age=$age: $error")
            error.printStackTrace(); runCatching { close() }; server.halt(false)
        }
    }
}
