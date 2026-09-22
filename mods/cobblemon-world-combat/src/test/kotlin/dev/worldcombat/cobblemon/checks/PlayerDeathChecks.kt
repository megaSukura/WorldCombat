package dev.worldcombat.cobblemon.checks

import com.cobblemon.mod.common.Cobblemon
import com.cobblemon.mod.common.api.moves.Moves
import com.cobblemon.mod.common.api.pokemon.PokemonProperties
import com.cobblemon.mod.common.entity.pokemon.PokemonEntity
import com.mojang.authlib.GameProfile
import dev.worldcombat.cobblemon.control.CompanionControl
import dev.worldcombat.cobblemon.network.ContentRequest
import dev.worldcombat.cobblemon.script.NativeContentChannels
import dev.worldcombat.cobblemon.script.NativeContentSubscriptions
import dev.worldcombat.core.checks.TestWorld
import dev.worldcombat.core.runtime.ActorHandle
import dev.worldcombat.core.world.CombatServices
import io.netty.channel.embedded.EmbeddedChannel
import net.minecraft.core.BlockPos
import net.minecraft.network.Connection
import net.minecraft.network.PacketSendListener
import net.minecraft.network.protocol.Packet
import net.minecraft.network.protocol.PacketFlow
import net.minecraft.server.MinecraftServer
import net.minecraft.server.level.ClientInformation
import net.minecraft.server.level.ServerPlayer
import net.minecraft.server.network.CommonListenerCookie
import net.minecraft.server.network.ServerGamePacketListenerImpl
import net.minecraft.server.players.PlayerList
import net.minecraft.world.entity.Entity
import net.minecraft.world.level.GameRules
import net.minecraft.world.level.GameType
import net.minecraft.world.level.block.Blocks
import net.minecraft.world.phys.Vec3
import java.util.UUID

/** A native player with an embedded no-op network: normal death/tickets/respawn, no client window. */
object PlayerDeathChecks {
    private var age = 0
    private var done = false
    private lateinit var owner: ServerPlayer
    private lateinit var listed: MutableList<ServerPlayer>
    private var lease: AutoCloseable? = null
    private var channel: EmbeddedChannel? = null
    private val wild = mutableListOf<PokemonEntity>()
    private var removed = 0
    private var rejoined: ActorHandle? = null
    private var retiredOwner: ServerPlayer? = null
    private var inspectedPokemon: UUID? = null
    private var oldSession: UUID? = null
    private val existing = java.lang.Boolean.getBoolean("worldcombat.check.death.useExisting")

    private fun connect(server: MinecraftServer, player: ServerPlayer) {
        channel?.close()
        val network = Connection(PacketFlow.SERVERBOUND)
        channel = EmbeddedChannel(network)
        player.connection = object : ServerGamePacketListenerImpl(server, network, player, CommonListenerCookie.createInitial(player.gameProfile, false)) {
            override fun send(packet: Packet<*>) { }
            override fun send(packet: Packet<*>, listener: PacketSendListener?) { }
            override fun tick() { }
        }
    }

    @Suppress("UNCHECKED_CAST")
    @JvmStatic fun tick(server: MinecraftServer) {
        if (done || !CombatServices.CONTENT.ready()) return
        try {
            val level = server.overworld()
            // A real network listener calls doTick even while its player is dead. This no-socket fixture must too.
            if (::owner.isInitialized && !owner.isRemoved) owner.doTick()
            when (++age) {
                1 -> {
                    server.gameRules.getRule(GameRules.RULE_DOMOBSPAWNING).set(false, server)
                    server.gameRules.getRule(GameRules.RULE_SPAWN_CHUNK_RADIUS).set(0, server)
                    level.dayTime = 6000
                    if (!existing) for (x in 504..536) for (z in 504..520) level.setBlockAndUpdate(BlockPos(x, 99, z), Blocks.STONE.defaultBlockState())
                    val profileId = System.getProperty("worldcombat.check.death.owner")?.let(UUID::fromString) ?: UUID.randomUUID()
                    owner = ServerPlayer(server, level, GameProfile(profileId, if (existing) "Dev" else "P5DeathOwner"), ClientInformation.createDefault())
                    connect(server, owner)
                    if (existing) { server.playerList.load(owner); owner.health = owner.maxHealth; owner.deathTime = 0 }
                    if (existing) owner.moveTo(6.2, -60.0, -10.4, 0F, 0F) else owner.moveTo(512.0, 100.0, 512.0, 0F, 0F)
                    owner.setGameMode(GameType.CREATIVE)
                    lease = TestWorld.mockOwner(server, owner)
                    val field = PlayerList::class.java.getDeclaredField("players"); field.isAccessible = true
                    listed = field.get(server.playerList) as MutableList<ServerPlayer>; listed.add(owner)
                    if (!existing) PokemonServerChecks.initializeTestData(owner.uuid)
                    level.addNewPlayer(owner)
                    if (!existing) {
                        val pokemon = PokemonProperties.parse("bulbasaur level=20").create()
                        check(Cobblemon.storage.getParty(owner).add(pokemon))
                        pokemon.sendOut(level, Vec3(514.0, 100.0, 512.0), null)
                        for (i in 0..7) {
                            val native = PokemonProperties.parse("oddish level=15").create()
                            native.moveSet.clear(); native.moveSet.add(Moves.getByName("sweetscent")!!.create())
                            wild.add(native.sendOut(level, Vec3(507.0 + i * 3, 100.0, 515.0), null)!!)
                        }
                    }
                    println("P5CHECK native player entered ${if (existing) "copied playtest world" else "remote chunks with 8 production sweet-scent wild actors"}")
                }
                20 -> if (!existing) {
                    val combat = CombatServices.get(server)
                    val previous = combat.bind(wild.first())
                    combat.left(wild.first())
                    check(!combat.valid(previous)) { "Departing handle stayed usable before cleanup" }
                    rejoined = combat.bind(wild.first())
                    check(rejoined != previous && combat.valid(rejoined)) { "Rejoined actor did not receive a fresh binding" }
                }
                21 -> if (!existing) {
                    check(CombatServices.get(server).valid(rejoined)) { "Old departure cleanup invalidated the rejoined generation" }
                    println("P5CHECK departure invalidates immediately and next-tick cleanup preserves the rejoined generation")
                }
                80 -> {
                    if (existing) wild.addAll(level.getEntitiesOfClass(PokemonEntity::class.java, owner.boundingBox.inflate(192.0)))
                    println("P5CHECK player-death tracked ${wild.size} native actors before kill")
                    inspectedPokemon=Cobblemon.storage.getParty(owner).firstOrNull()?.uuid
                    inspectedPokemon?.let { pokemon ->
                        val session=CompanionControl.session(owner);oldSession=session.id
                        val reply=NativeContentChannels.process(owner,ContentRequest(session.id,500,CombatServices.CONTENT.epoch(),server.tickCount.toLong(),"world_combat:skills",pokemon,"{\"op\":\"inspect\"}"))
                        check(reply.code()=="ok") { "Pre-death information request: ${reply.code()}" }
                    }
                }
                100 -> {
                    check(owner.isAlive)
                    server.commands.performPrefixedCommand(server.createCommandSourceStack(), "kill @a")
                    check(owner.isDeadOrDying) { "Native kill did not kill the registered player" }
                    println("P5CHECK actual kill @a completed at tick=$age; native death and chunk tickets continue ticking")
                }
                180 -> {
                    check(owner.isDeadOrDying)
                    check(owner.deathTime >= 20 && owner.isRemoved) { "Native death did not reach removal: deathTime=${owner.deathTime}, removed=${owner.isRemoved}" }
                    retiredOwner=owner
                    owner = server.playerList.respawn(owner, false, Entity.RemovalReason.KILLED)
                    connect(server, owner)
                    println("P5CHECK native respawn completed at ${owner.position()}")
                }
                185 -> inspectedPokemon?.let { pokemon ->
                    check(retiredOwner !== owner && retiredOwner == owner) { "Fixture must exercise Minecraft's reused entity identity" }
                    val session=CompanionControl.session(owner)
                    check(session.id!=oldSession)
                    fun inspect(sequence:Long,input:String) = NativeContentChannels.process(owner,ContentRequest(session.id,sequence,CombatServices.CONTENT.epoch(),server.tickCount.toLong(),"world_combat:skills",pokemon,input))
                    val menu=inspect(1,"{\"op\":\"inspect\"}")
                    check(menu.code()=="ok") { "First information request after native respawn was rejected: ${menu.code()}" }
                    check(com.google.gson.JsonParser.parseString(menu.data()).asJsonObject.getAsJsonArray("menu").size()>0)
                    val attributes=inspect(2,"{\"op\":\"attributes\"}")
                    check(attributes.code()=="ok" && attributes.data().contains("\"attributes\""))
                    check(inspect(2,"{\"op\":\"inspect\"}").code()=="old-request") { "Same-session duplicate request accepted" }
                    check(NativeContentChannels.process(retiredOwner!!,ContentRequest(oldSession!!,501,CombatServices.CONTENT.epoch(),server.tickCount.toLong(),"world_combat:skills",pokemon,"{}")).code()=="stale-session")
                    NativeContentSubscriptions.remove(retiredOwner!!)
                    NativeContentSubscriptions.entityChanged(owner)
                    check(NativeContentSubscriptions.drain(server).any { it.first === owner && it.second.pokemon()==pokemon }) { "Retired player cleanup removed the current view subscription" }
                    println("P5CHECK respawn UI: reused entity id, fresh information sequence, complete menu/attributes, duplicate rejection and observer isolation passed")
                }
                200 -> {
                    owner.teleportTo(1024.0, 100.0, 1024.0)
                    // The fixture has no client move packet to acknowledge the teleport.
                    level.chunkSource.move(owner)
                    println("P5CHECK respawned player left former chunks: ${owner.position()}, forced=${level.forcedChunks.size}")
                }
                600 -> {
                    removed = wild.count { it.isRemoved }
                    check(owner.isAlive) { "Respawned creative player died unexpectedly" }
                    check(removed > 0) { "Scenario did not unload any original wild actors (${wild.size})" }
                    listed.remove(owner); owner.discard(); lease?.close(); channel?.close(); done = true
                    println("P5CHECK PASS player kill, 80 death ticks, native respawn, remote movement and $removed chunk-unloaded wild actors")
                }
            }
        } catch (error: Throwable) {
            done = true
            println("P5CHECK FAIL player death at $age: ${error.message}"); error.printStackTrace()
            if (::listed.isInitialized) listed.remove(owner)
            if (::owner.isInitialized) owner.discard()
            lease?.close(); channel?.close()
        }
    }
}
