package dev.worldcombat.cobblemon.checks

import com.cobblemon.mod.common.Cobblemon
import com.cobblemon.mod.common.CobblemonBlocks
import com.cobblemon.mod.common.api.moves.Moves
import com.cobblemon.mod.common.api.pokemon.PokemonProperties
import com.cobblemon.mod.common.block.entity.PokemonPastureBlockEntity
import com.cobblemon.mod.common.entity.pokemon.PokemonEntity
import com.mojang.authlib.GameProfile
import dev.worldcombat.cobblemon.control.CompanionControl
import dev.worldcombat.cobblemon.control.PastureControl
import dev.worldcombat.cobblemon.network.ControlCommand
import dev.worldcombat.cobblemon.script.NativePasture
import dev.worldcombat.core.checks.TestWorld
import dev.worldcombat.core.runtime.ActorHandle
import dev.worldcombat.core.runtime.Point
import dev.worldcombat.core.world.CombatServices
import net.minecraft.core.BlockPos
import net.minecraft.core.Direction
import net.minecraft.server.MinecraftServer
import net.minecraft.server.level.ServerPlayer
import net.minecraft.world.level.GameRules
import net.minecraft.world.level.block.Blocks
import net.neoforged.neoforge.common.util.FakePlayerFactory
import java.util.UUID

/** Actual PC, native tether, chunk save/unload/load and script companion control. */
object PastureLifecycleChecks {
    private var age = 0; private var phase = 0; private var since = 0; private var done = false
    private var ownerLease: AutoCloseable? = null
    private var online = true
    private lateinit var owner: ServerPlayer
    private lateinit var session: CompanionControl.Session
    private lateinit var resident: PokemonEntity
    private lateinit var oldHandle: ActorHandle
    private lateinit var individual: UUID
    private lateinit var independentBody: CompanionControl.Body
    private var workId = 0L
    private var energyBefore = 0
    private var ppBefore = 0
    private val storage = net.neoforged.neoforge.energy.EnergyStorage(100000, 500, 0)
    private val machine = BlockPos(524, 100, 4)
    private val home = BlockPos(520, 100, 8)
    private val station = Point(516.5, 101.0, 11.5)
    private fun next(value: Int) { phase = value; since = age }
    private fun request(operation: String, target: UUID = ControlCommand.NONE, point: Point = station) {
        val actor = session.actor
        CompanionControl.request(owner, ControlCommand(session.id, session.gate.lastSequence() + 1, session.epoch,
            owner.server.tickCount.toLong(), actor?.entity() ?: ControlCommand.NONE, actor?.generation() ?: 0,
            session.partySlot, operation, 0, target, point, Point(1.0, 0.0, 0.0), "", "{}"))
    }
    private fun select() { request("select-individual", individual); check(session.actor?.identity() == individual) }
    private fun jobs(server: MinecraftServer) = CombatServices.get(server).runtime().effects().query(independentBody.actor, "world_combat:machine_work")
    private fun join(server: MinecraftServer, level: net.minecraft.server.level.ServerLevel, x: Double) {
        ownerLease?.close()
        owner = FakePlayerFactory.get(level, owner.gameProfile)
        owner.moveTo(x, 100.0, 5.0, 0f, 0f)
        ownerLease = TestWorld.mockOwner(server, owner); online = true; session = CompanionControl.session(owner)
    }

    @JvmStatic fun tick(server: MinecraftServer) {
        if (done || !CombatServices.CONTENT.ready()) return
        try {
            check(++age < 1800) { "Pasture check timed out: phase=$phase" }
            val level = server.overworld(); val combat = CombatServices.get(server)
            if (phase == 0) {
                server.gameRules.getRule(GameRules.RULE_DOMOBSPAWNING).set(false, server)
                level.setChunkForced(32, 0, true)
                for (x in 512..527) for (z in 0..15) {
                    level.setBlockAndUpdate(BlockPos(x, 99, z), Blocks.STONE.defaultBlockState())
                    for (y in 100..105) level.setBlockAndUpdate(BlockPos(x, y, z), Blocks.AIR.defaultBlockState())
                }
                owner = FakePlayerFactory.get(level, GameProfile(UUID.randomUUID(), "PastureLifecycle"))
                owner.moveTo(517.0, 100.0, 5.0, 0f, 0f); ownerLease = TestWorld.mockOwner(server, owner)
                PokemonServerChecks.initializeTestData(owner.uuid)
                val pokemon = PokemonProperties.parse("pikachu level=30").create()
                pokemon.moveSet.clear(); pokemon.moveSet.setMove(0, checkNotNull(Moves.getByName("tackle")).create())
                individual = pokemon.uuid
                check(Cobblemon.storage.getPC(owner).add(pokemon))
                val capabilities = net.neoforged.neoforge.capabilities.RegisterCapabilitiesEvent::class.java.getDeclaredConstructor()
                capabilities.isAccessible = true
                capabilities.newInstance().registerBlock(net.neoforged.neoforge.capabilities.Capabilities.EnergyStorage.BLOCK,
                    { _, pos, _, _, side -> if (pos == machine && side == Direction.EAST) storage else null }, Blocks.GOLD_BLOCK)
                level.setBlockAndUpdate(machine, Blocks.GOLD_BLOCK.defaultBlockState())
                level.setBlockAndUpdate(home, CobblemonBlocks.PASTURE.defaultBlockState())
                val pasture = level.getBlockEntity(home) as PokemonPastureBlockEntity
                pasture.ownerId = owner.uuid; pasture.ownerName = owner.gameProfile.name
                pasture.minRoamPos = BlockPos(513, 99, 1); pasture.maxRoamPos = BlockPos(527, 105, 15)
                check(pasture.tether(owner, pokemon, Direction.EAST)) { "Native pasture rejected its PC resident" }
                session = CompanionControl.session(owner); next(1)
            }
            if (online) CompanionControl.advance(session)
            when (phase) {
                1 -> if (age - since >= 65) {
                    resident = level.allEntities.filterIsInstance<PokemonEntity>().single { it.pokemon.uuid == individual }
                    check(NativePasture.active(resident)) { "New native tether never became active" }
                    select(); check(combat.controls(resident) && session.intent == "autonomous")
                    request("stay"); check(session.intent == "stay")
                    oldHandle = checkNotNull(session.actor); next(2)
                }
                2 -> if (age - since >= 70) {
                    check(resident.position().distanceTo(net.minecraft.world.phys.Vec3(station.x(), resident.y, station.z())) < 3.5) {
                        "Pasture AI did not move to its station: ${session.reason} ${resident.position()}"
                    }
                    val target = TestWorld.mob(net.minecraft.world.entity.EntityType.IRON_GOLEM, level, 525.0)
                    target.moveTo(525.0, 100.0, 11.5, 0f, 0f)
                    target.getAttribute(net.minecraft.world.entity.ai.attributes.Attributes.MAX_HEALTH)!!.baseValue = 100000.0
                    target.health = 100000f
                    request("focus", target.uuid, Point(target.x, target.y + 1, target.z))
                    check(session.intent == "focus") { "Native pasture pursuit was not accepted: ${session.reason}" }
                    // The observer leaves too: a player standing here would legitimately
                    // keep seeing/interacting with this chunk while its force ticket is removed.
                    owner.moveTo(0.5, 100.0, 0.5, 0f, 0f)
                    level.setChunkForced(32, 0, false); next(3)
                }
                3 -> {
                    if ((age - since) % 100 == 0) println("PASTURECHECK unloading: removed=${resident.isRemoved} loaded=${level.hasChunkAt(home)} ticking=${level.isPositionEntityTicking(home)} members=${session.members.size}")
                    if (age - since > 10 && !level.isPositionEntityTicking(resident.blockPosition())) {
                        check(!combat.controls(resident) && session.members.keys.none { it.identity() == individual }) {
                            "Pasture AI kept running outside native entity simulation"
                        }
                    }
                    if (resident.isRemoved && !level.hasChunkAt(home)) {
                        check(resident.removalReason == net.minecraft.world.entity.Entity.RemovalReason.UNLOADED_TO_CHUNK)
                        check(!combat.valid(oldHandle) && !combat.controls(resident)) { "Unloaded resident kept combat control" }
                        check(NativePasture.owned(owner).isEmpty() && session.members.keys.none { it.identity() == individual })
                        println("PASTURECHECK actual chunk unload cleared roster, handles and AI control")
                        level.setChunkForced(32, 0, true); next(4)
                    }
                }
                4 -> {
                    val body = level.allEntities.filterIsInstance<PokemonEntity>().firstOrNull { it.pokemon.uuid == individual }
                    if (body != null && NativePasture.active(body) && age - since > 30) {
                        check(body !== resident) { "Scenario did not recreate the entity from disk" }
                        resident = body; owner.moveTo(517.0, 100.0, 5.0, 0f, 0f); select()
                        next(8)
                    }
                }
                8 -> if (age - since >= 8) {
                        check(session.actor != oldHandle && session.intent == "stay" && session.intentPoint == station) {
                            "Reload did not restore station: ${session.intent}, ${session.intentPoint}, ${session.reason}"
                        }
                        check(combat.controls(resident)) { "Reloaded resident has no script AI" }
                        check(level.allEntities.filterIsInstance<PokemonEntity>().count { it.pokemon.uuid == individual } == 1)
                        check(resident.pokemon === Cobblemon.storage.getPC(owner)[individual])
                        check(session.intentTarget == null && session.pending == null) { "Reload retained a stale pursuit or pending cast" }
                        println("PASTURECHECK actual reload restored one PC resident, new handle and pre-pursuit station; no stale target")
                        independentBody = PastureControl.body(combat, resident)
                        check(session.body === independentBody) { "Player and server have separate resident brains" }
                        request("electric-supply", point = Point(machine.x + .5, machine.y + .5, machine.z + .5))
                        workId = jobs(server).single().id()
                        energyBefore = storage.energyStored
                        ownerLease?.close(); ownerLease = null; online = false
                        Cobblemon.storage.onPlayerDisconnect(owner)
                        val replacement = checkNotNull(Cobblemon.storage.getPC(owner)[individual]) { "Saved PC lost its resident" }
                        check(replacement !== resident.pokemon && replacement.tetheringId == resident.tethering!!.tetheringId) {
                            "Fixture did not replace the same native PC individual"
                        }
                        check(!NativePasture.active(resident)) { "Fixture did not expose the stale PC reference" }
                        next(5)
                }
                5 -> {
                    check(age - since < 200) { "Offline resident did not supply FE: ${independentBody.reason}" }
                    if (age - since >= 50 && storage.energyStored > energyBefore) {
                    check(!resident.isRemoved && resident.pokemon.uuid == individual)
                    val current = resident.tethering!!.getPokemon()
                    check(resident.pokemon === current) { "Offline loaded pasture kept an obsolete PC object: " +
                        "tether=${resident.tethering!!.tetheringId} old=${resident.pokemon.tetheringId} current=${current?.tetheringId} " +
                        "currentId=${current?.uuid} representation=${current?.entity?.uuid} resident=${resident.uuid} " +
                        "ticking=${level.isPositionEntityTicking(resident.blockPosition())} age=${resident.tickCount}" }
                    check(NativePasture.active(resident)) { "PC cache eviction permanently invalidated the loaded resident" }
                    check(combat.controls(resident) && jobs(server).single().id() == workId) { "Owner logout ended resident AI or work" }
                    println("PASTURECHECK offline owner: same brain and job, actual FE delivered")
                    energyBefore = storage.energyStored
                    join(server, checkNotNull(server.getLevel(net.minecraft.world.level.Level.NETHER)), 0.5); next(9)
                    }
                }
                9 -> if (age - since >= 40) {
                    check(storage.energyStored > energyBefore && jobs(server).single().id() == workId) { "Other-dimension owner stopped work" }
                    check(session.members.keys.none { it.identity() == individual })
                    check(PastureControl.body(combat, resident) === independentBody && combat.controls(resident))
                    energyBefore = storage.energyStored; join(server, level, 0.5); next(10)
                }
                10 -> if (age - since >= 40) {
                    check(storage.energyStored > energyBefore && jobs(server).single().id() == workId) { "Distant owner stopped work" }
                    check(session.members.keys.none { it.identity() == individual })
                    owner.moveTo(517.0, 100.0, 5.0, 0f, 0f); next(11)
                }
                11 -> if (age - since >= 12) {
                    select(); check(session.body === independentBody && session.intent == "work")
                    val target = level.allEntities.filterIsInstance<net.minecraft.world.entity.animal.IronGolem>().first()
                    resident.setBehaviourFlag(com.cobblemon.mod.common.entity.pokemon.PokemonBehaviourFlag.PASTURE_CONFLICT, true)
                    ppBefore = resident.pokemon.moveSet.get(0)!!.currentPp
                    request("focus", target.uuid, Point(target.x, target.y + 1, target.z))
                    check(jobs(server).isEmpty())
                    ownerLease?.close(); ownerLease = null; online = false
                    Cobblemon.storage.onPlayerDisconnect(owner); next(12)
                }
                12 -> {
                    check(age - since < 250) { "Offline resident never used its native move: ${independentBody.reason}" }
                    if (resident.pokemon.moveSet.get(0)!!.currentPp < ppBefore) {
                        check(combat.controls(resident))
                        println("PASTURECHECK offline combat: native move committed and spent PP; dimension/distance did not replace brain or work")
                        join(server, level, 517.0); next(6)
                    }
                }
                6 -> if (age - since >= 16) {
                    select(); check(combat.controls(resident) && session.body === independentBody)
                    val pasture = level.getBlockEntity(home) as PokemonPastureBlockEntity
                    // Recall against a fresh PC instance before the entity has had a tick to synchronize.
                    Cobblemon.storage.onPlayerDisconnect(owner)
                    val current = checkNotNull(Cobblemon.storage.getPC(owner)[individual])
                    check(current !== resident.pokemon)
                    pasture.releasePokemon(individual); next(7)
                }
                7 -> if (age - since >= 30) {
                    check(resident.isRemoved) { "Recall after PC replacement left a ghost pasture entity" }
                    check(!NativePasture.active(resident) && NativePasture.owned(owner).isEmpty())
                    check(session.members.keys.none { it.identity() == individual })
                    check(!combat.controls(resident))
                    println("PASTURECHECK PASS independent resident AI: offline/distant/other-dimension FE work, offline native combat, shared online body, unload/reload and recall")
                    done = true; ownerLease?.close(); ownerLease = null; server.halt(false)
                }
            }
        } catch (error: Throwable) {
            done = true; println("PASTURECHECK FAIL phase=$phase age=$age: $error"); error.printStackTrace()
            runCatching { ownerLease?.close() }; server.halt(false)
        }
    }
}
