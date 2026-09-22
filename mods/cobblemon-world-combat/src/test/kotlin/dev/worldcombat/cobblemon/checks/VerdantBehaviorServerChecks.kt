package dev.worldcombat.cobblemon.checks

import com.cobblemon.mod.common.Cobblemon
import com.cobblemon.mod.common.api.moves.Moves
import com.cobblemon.mod.common.api.pokemon.PokemonProperties
import com.cobblemon.mod.common.entity.pokemon.PokemonEntity
import com.cobblemon.mod.common.pokemon.Pokemon
import com.mojang.authlib.GameProfile
import dev.worldcombat.cobblemon.control.CompanionControl
import dev.worldcombat.cobblemon.network.ControlCommand
import dev.worldcombat.core.checks.TestWorld
import dev.worldcombat.core.runtime.Point
import dev.worldcombat.core.world.CombatServices
import dev.worldcombat.core.world.MinecraftCombat
import net.minecraft.core.BlockPos
import net.minecraft.server.MinecraftServer
import net.minecraft.server.level.ClientInformation
import net.minecraft.server.level.ServerPlayer
import net.minecraft.world.entity.EntityType
import net.minecraft.world.entity.animal.Pig
import net.minecraft.world.entity.ai.memory.MemoryModuleType
import net.minecraft.world.entity.ai.memory.WalkTarget
import net.minecraft.world.level.block.Blocks
import net.minecraft.world.level.block.CropBlock
import net.minecraft.world.level.GameRules
import net.minecraft.world.phys.Vec3
import net.neoforged.neoforge.common.util.FakePlayerFactory
import java.util.UUID

/** Native fixture inputs only. All decisions, movements, casts and skill effects come from the production profile. */
object VerdantBehaviorServerChecks {
    private var age = 0
    private var phase = 0
    private var phaseStart = 0
    private var done = false
    private lateinit var owner: ServerPlayer
    private var lease: AutoCloseable? = null
    private lateinit var wild: PokemonEntity
    private lateinit var noAi: PokemonEntity
    private lateinit var visitor: Pig
    private lateinit var partner: PokemonEntity
    private lateinit var patient: PokemonEntity
    private lateinit var session: CompanionControl.Session
    private var initialPp = 0
    private var visitorHealth = 0F
    private var patientHealth = 0
    private var savedLight = 0
    private var sawMovement = false
    private var origin = Vec3.ZERO
    private val work = Point(11.0, 100.0, 10.0)
    private val crop = BlockPos(24, 100, 10)
    private val garden = Point(24.0, 100.0, 10.0)

    private fun moves(pokemon: Pokemon, vararg names: String) {
        pokemon.moveSet.clear()
        names.forEachIndexed { slot, name -> pokemon.moveSet.setMove(slot, Moves.getByName(name)!!.create()) }
    }
    private fun config(pokemon: Pokemon, move: String, patch: String) {
        val root = pokemon.persistentData.getCompound("WorldCombat").copy()
        val content = root.getCompound("Content").copy()
        content.putString("world_combat:preferences/$move", "{\"version\":1,\"patch\":$patch}")
        root.put("Content", content); pokemon.persistentData.put("WorldCombat", root); pokemon.onChange()
    }
    private fun light(entity: PokemonEntity): Int {
        val raw = entity.pokemon.persistentData.getCompound("WorldCombat").getCompound("Content").getString("world_combat:state/growth")
        return if (raw.isEmpty()) 0 else com.google.gson.JsonParser.parseString(raw).asJsonObject.get("light")?.asInt ?: 0
    }
    private fun next(value: Int, message: String) {
        println("P5CHECK behavior $message age=$age")
        phase = value; phaseStart = age
    }
    private fun command(operation: String, destination: Point = work) {
        CompanionControl.advance(session)
        val actor = session.actor ?: error("Partner not available for $operation: ${session.reason}")
        CompanionControl.request(owner, ControlCommand(session.id, session.gate.lastSequence() + 1, session.epoch,
            owner.server.tickCount.toLong(), actor.entity(), actor.generation(), session.partySlot, operation, 0,
            ControlCommand.NONE, destination, Point(1.0, 0.0, 0.0), ""))
        check(session.intent == operation) { "$operation was refused: ${session.reason}" }
    }
    private fun diagnose(combat: MinecraftCombat): String = if (::partner.isInitialized)
        "partner=${partner.position()} hp=${partner.pokemon.currentHealth} light=${light(partner)} state=${combat.runtime().state(combat.bind(partner))} intent=${session.intent} reason=${session.reason} memory=${session.body.memory}"
        else if (::wild.isInitialized) "wild=${wild.position()} hp=${wild.pokemon.currentHealth} pp=${wild.pokemon.moveSet[0]?.currentPp} state=${combat.runtime().state(combat.bind(wild))}" else "initializing"

    @JvmStatic fun tick(server: MinecraftServer) {
        if (done || !CombatServices.CONTENT.ready()) return
        val combat = CombatServices.get(server)
        try {
            age++
            if (::session.isInitialized) CompanionControl.advance(session)
            check(age < 1800) { "Scenario timed out: ${diagnose(combat)}" }
            when (phase) {
                0 -> {
                    val level = TestWorld.prepare(server)
                    level.setChunkForced(1, 0, true)
                    for (x in 0..31) for (z in 0..15) {
                        level.setBlockAndUpdate(BlockPos(x, 99, z), Blocks.STONE.defaultBlockState())
                        for (y in 100..105) level.setBlockAndUpdate(BlockPos(x, y, z), Blocks.AIR.defaultBlockState())
                    }
                    level.dayTime = 6000; level.setWeatherParameters(12000, 0, false, false)
                    val profile = GameProfile(UUID.randomUUID(), "P5BehaviorOwner")
                    owner = ServerPlayer(server, level, profile, ClientInformation.createDefault()).also {
                        it.connection = FakePlayerFactory.get(level, profile).connection
                        it.moveTo(2.0, 100.0, 12.0, 0F, 0F)
                    }
                    lease = TestWorld.mockOwner(server, owner)
                    PokemonServerChecks.initializeTestData(owner.uuid)
                    val roaming = PokemonProperties.parse("bulbasaur level=40 nature=calm").create()
                    moves(roaming, "razorleaf")
                    wild = roaming.sendOut(level, Vec3(3.0, 100.0, 3.0), null)!!
                    val fixed = PokemonProperties.parse("ivysaur level=30 nature=bold").create()
                    moves(fixed, "growth", "tackle")
                    noAi = fixed.sendOut(level, Vec3(14.0, 100.0, 10.0), null)!!
                    noAi.setNoAi(true)
                    visitor = TestWorld.mob(EntityType.PIG, level, 8.0)
                    visitor.moveTo(8.0, 100.0, 3.0, 0F, 0F)
                    next(1, "production entities sent out")
                }
                1 -> if (age - phaseStart >= 30) {
                    initialPp = wild.pokemon.moveSet[0]!!.currentPp
                    origin = wild.position(); sawMovement = false
                    wild.brain.setMemory(MemoryModuleType.WALK_TARGET, WalkTarget(Vec3(6.0, 100.0, 3.0), 0.7F, 0))
                    next(2, "native roaming observation begins")
                }
                2 -> {
                    check(!combat.controls(wild)) { "Peaceful wild brain was captured by script control" }
                    check(wild.pokemon.moveSet[0]!!.currentPp == initialPp) { "Neutral visitor provoked an unsolicited cast" }
                    if (wild.position().distanceTo(origin) > 0.3) sawMovement = true
                    if (age - phaseStart >= 60) {
                        check(sawMovement) { "Native WALK_TARGET did not move the idle wild individual" }
                        wild.moveTo(3.0, 100.0, 3.0, 0F, 0F); wild.navigation.stop()
                        wild.brain.eraseMemory(MemoryModuleType.WALK_TARGET)
                        visitorHealth = visitor.health
                        check(wild.hurt(server.overworld().damageSources().mobAttack(visitor), 1F)) { "Native observed attack was refused" }
                        check(wild.lastHurtByMob === visitor) { "Damage did not produce a native observed attacker" }
                        next(3, "neutrality and native movement passed; native attacker introduced")
                    }
                }
                3 -> {
                    check(age - phaseStart < 180) { "Wild did not use its actual skill against the seen attacker: ${diagnose(combat)}" }
                    if (wild.pokemon.moveSet[0]!!.currentPp < initialPp && visitor.health < visitorHealth && !combat.runtime().busy(combat.bind(wild))) {
                        check(noAi.pokemon.moveSet[0]!!.currentPp == noAi.pokemon.moveSet[0]!!.maxPp && light(noAi) == 0 && !combat.controls(noAi)) {
                            "Native NoAI fixture was autonomously prepared or controlled"
                        }
                        wild.pokemon.recall(); noAi.pokemon.recall(); visitor.discard()
                        val pokemon = PokemonProperties.parse("bulbasaur level=40 nature=calm").create()
                        moves(pokemon, "growth"); config(pokemon, "growth", "{\"autoPrepare\":false}")
                        check(Cobblemon.storage.getParty(owner).add(pokemon))
                        partner = pokemon.sendOut(server.overworld(), Vec3(3.0, 100.0, 10.0), null)!!
                        val friend = PokemonProperties.parse("blissey level=40").create()
                        moves(friend, "splash"); check(Cobblemon.storage.getParty(owner).add(friend))
                        patient = friend.sendOut(server.overworld(), Vec3(11.0, 100.0, 12.0), null)!!; patient.setNoAi(true)
                        session = CompanionControl.session(owner)
                        next(4, "wild real hit and PP, native NoAI passed; owned partners sent out")
                    }
                }
                4 -> if (age - phaseStart >= 30) {
                    check(session.members.size == 2) { "Expected both native party individuals" }
                    initialPp = partner.pokemon.moveSet[0]!!.currentPp
                    command("work"); origin = partner.position()
                    next(5, "work issued through production command handler")
                }
                5 -> {
                    check(light(partner) == 0 && partner.pokemon.moveSet[0]!!.currentPp == initialPp) { "Disabled autoPrepare still cast" }
                    check(age - phaseStart < 280) { "Work failed to approach its location: ${diagnose(combat)}" }
                    if (partner.position().distanceTo(Vec3(work.x(), work.y(), work.z())) < 3) {
                        check(partner.position().distanceTo(origin) > 4) { "Fixture did not exercise real travel" }
                        next(6, "work reached location with native movement and disabled preparation")
                    }
                }
                6 -> if (age - phaseStart >= 50) {
                    check(light(partner) == 0 && partner.pokemon.moveSet[0]!!.currentPp == initialPp)
                    config(partner.pokemon, "growth", "{\"autoPrepare\":true}")
                    next(7, "individual growth preference enabled")
                }
                7 -> {
                    check(age - phaseStart < 180) { "Enabled growth did not prepare: ${diagnose(combat)}" }
                    if (light(partner) > 0 && !combat.runtime().busy(combat.bind(partner))) {
                        check(partner.pokemon.moveSet[0]!!.currentPp < initialPp) { "Real preparation did not spend native PP" }
                        savedLight = light(partner); moves(partner.pokemon, "splash")
                        next(8, "production growth changed native-backed state and PP; capability removed")
                    }
                }
                8 -> if (age - phaseStart >= 60) {
                    check(light(partner) == savedLight && !combat.runtime().busy(combat.bind(partner))) { "Removed ability remained active" }
                    config(partner.pokemon, "synthesis", "{\"helpFriends\":false}")
                    moves(partner.pokemon, "synthesis")
                    partner.pokemon.heal(); patient.pokemon.currentHealth = patient.pokemon.maxHealth / 2
                    patientHealth = patient.pokemon.currentHealth; initialPp = partner.pokemon.moveSet[0]!!.currentPp
                    next(9, "live capability replacement and individual care preference installed")
                }
                9 -> if (age - phaseStart >= 50) {
                    check(patient.pokemon.currentHealth == patientHealth && partner.pokemon.moveSet[0]!!.currentPp == initialPp) { "Disabled friend care still cast" }
                    config(partner.pokemon, "synthesis", "{\"helpFriends\":true}")
                    next(10, "individual friend-care preference enabled")
                }
                10 -> {
                    check(age - phaseStart < 220) { "Enabled synthesis did not restore friend: ${diagnose(combat)} patient=${patient.position()} hp=${patient.pokemon.currentHealth}" }
                    if (patient.pokemon.currentHealth > patientHealth && !combat.runtime().busy(combat.bind(partner))) {
                        check(partner.pokemon.moveSet[0]!!.currentPp < initialPp)
                        moves(partner.pokemon, "splash")
                        command("autonomous")
                        check(combat.controls(partner)) { "Autonomous activity lost unified control" }
                        origin = partner.position(); sawMovement = false
                        owner.moveTo(24.0, 100.0, 3.0, 0F, 0F)
                        next(11, "production synthesis restored native friend HP; autonomous owner-distance response begins")
                    }
                }
                11 -> {
                    check(combat.controls(partner)) { "Autonomous companion left unified management" }
                    if (partner.position().distanceTo(origin) > 0.3 && partner.position().distanceTo(owner.position()) + 0.3 < origin.distanceTo(owner.position())) sawMovement = true
                    if (age - phaseStart >= 60) {
                        check(sawMovement) { "Autonomous companion did not respond to its departing owner" }
                        origin = partner.position(); sawMovement = false
                        command("follow"); owner.moveTo(4.0, 100.0, 12.0, 0F, 0F)
                        next(16, "autonomous managed movement passed; unsupported loadout follows a changed owner position")
                    }
                }
                16 -> {
                    check(combat.controls(partner)) { "Follow with an unsupported loadout lost unified control" }
                    if (partner.position().distanceTo(origin) > 0.3 && partner.position().distanceTo(owner.position()) + 0.3 < origin.distanceTo(owner.position())) sawMovement = true
                    if (age - phaseStart >= 60) {
                        check(sawMovement) { "Unsupported loadout did not follow the moving owner" }
                        patient.pokemon.recall()
                        val level = server.overworld()
                        level.gameRules.getRule(GameRules.RULE_RANDOMTICKING).set(0, server)
                        level.setBlockAndUpdate(crop.below(), Blocks.FARMLAND.defaultBlockState())
                        level.setBlockAndUpdate(crop, Blocks.WHEAT.defaultBlockState())
                        moves(partner.pokemon, "grassyterrain")
                        config(partner.pokemon, "grassyterrain", "{\"cultivatePlants\":true,\"plotRadius\":3,\"reservePP\":2}")
                        partner.pokemon.moveSet[0]!!.currentPp = 2
                        origin = partner.position(); command("work", garden)
                        next(12, "managed autonomy/follow passed; real wheat work site waits at the skill PP reserve")
                    }
                }
                12 -> {
                    check(partner.pokemon.moveSet[0]!!.currentPp == 2) { "Cultivation spent the reserved native PP" }
                    check(server.overworld().getBlockState(crop) == Blocks.WHEAT.defaultBlockState()) { "Reserved work changed the native crop" }
                    if (age - phaseStart >= 60) {
                        val move = partner.pokemon.moveSet[0]!!
                        move.currentPp = move.maxPp; initialPp = move.currentPp
                        next(13, "native PP restored; the same production work order resumes")
                    }
                }
                13 -> {
                    check(age - phaseStart < 360) { "Production work did not cultivate wheat after resources returned: ${diagnose(combat)} crop=${server.overworld().getBlockState(crop)}" }
                    val state = server.overworld().getBlockState(crop)
                    val memory = com.google.gson.JsonParser.parseString(session.body.memory).asJsonObject
                    val completed = memory.getAsJsonObject("worksite")?.get("completed")?.asInt ?: 0
                    if (state != Blocks.WHEAT.defaultBlockState() && state.block === Blocks.WHEAT && completed > 0 && !combat.runtime().busy(combat.bind(partner))) {
                        check(partner.pokemon.moveSet[0]!!.currentPp < initialPp) { "Native crop changed without the skill spending PP" }
                        check(partner.position().distanceTo(origin) > 4) { "Work site did not require real native approach" }
                        next(14, "actual native crop change, skill PP, movement and work completion observed")
                    }
                }
                14 -> {
                    check(age - phaseStart < 260) { "Production garden did not finish native wheat growth: ${diagnose(combat)}" }
                    val state = server.overworld().getBlockState(crop)
                    if (state.block === Blocks.WHEAT && (state.block as CropBlock).isMaxAge(state)) {
                        initialPp = partner.pokemon.moveSet[0]!!.currentPp
                        next(15, "native crop mature; checking completed work stops consuming PP")
                    }
                }
                15 -> if (age - phaseStart >= 80) {
                    check(partner.pokemon.moveSet[0]!!.currentPp == initialPp) { "Finished work kept casting at mature crops" }
                    command("hold"); check(combat.controls(partner)) { "Hold released unified control" }
                    partner.pokemon.recall(); lease?.close(); lease = null; done = true
                    println("P5CHECK PASS behavior actual wild neutrality/native movement, seen-attacker cast+PP, NoAI, owned work travel/preparation, per-skill preferences, live capability change, friend healing, managed autonomous/follow/hold and real crop work with resource wait/resume/completion")
                }
            }
        } catch (error: Throwable) {
            done = true; lease?.close(); lease = null
            println("P5CHECK FAIL behavior phase=$phase age=$age ${error.message}; ${diagnose(combat)}")
            error.printStackTrace()
        }
    }
}
