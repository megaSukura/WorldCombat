package dev.worldcombat.cobblemon.checks

import com.cobblemon.mod.common.Cobblemon
import com.cobblemon.mod.common.api.pokemon.PokemonProperties
import com.cobblemon.mod.common.entity.pokemon.PokemonEntity
import com.mojang.authlib.GameProfile
import dev.worldcombat.cobblemon.script.PokemonView
import dev.worldcombat.core.runtime.ActionTarget
import dev.worldcombat.core.runtime.Point
import dev.worldcombat.core.world.CombatServices
import io.netty.channel.embedded.EmbeddedChannel
import net.minecraft.network.Connection
import net.minecraft.network.PacketSendListener
import net.minecraft.network.protocol.Packet
import net.minecraft.network.protocol.PacketFlow
import net.minecraft.server.MinecraftServer
import net.minecraft.server.level.ServerPlayer
import net.minecraft.server.network.CommonListenerCookie
import net.minecraft.server.network.ServerGamePacketListenerImpl
import net.minecraft.server.players.PlayerList
import net.minecraft.world.effect.MobEffects
import net.minecraft.world.entity.Entity
import net.minecraft.world.entity.animal.Cow
import net.minecraft.world.phys.AABB
import net.minecraft.world.phys.Vec3
import net.neoforged.neoforge.common.util.FakePlayerFactory
import java.util.UUID
import kotlin.math.abs

/** Runs the same opt-in helper script and datapack controls shipped in the isolated playtest copy. */
object VerdantPlaytestConditionChecks {
    private var age = 0
    private var listed: MutableList<ServerPlayer>? = null
    private var player: ServerPlayer? = null
    private var channel: EmbeddedChannel? = null
    private var originalConnection: ServerGamePacketListenerImpl? = null
    private lateinit var first: PokemonEntity
    private lateinit var selected: PokemonEntity
    private lateinit var foreign: PokemonEntity
    private lateinit var opponent: PokemonEntity
    private lateinit var target: Cow
    private var firstHealth = 0
    private var foreignHealth = 0
    private var pausedHealth = 0
    private var enduranceObserved = -1
    private var fightStarted = -1
    private var initialPp = 0
    private var targetHealth = 0F
    private val area = AABB(-72.0, 90.0, -48.0, 112.0, 120.0, 72.0)

    private fun command(server: MinecraftServer, owner: ServerPlayer, name: String) {
        server.commands.performPrefixedCommand(owner.createCommandSourceStack().withPermission(4), "function worldcombat:p5_$name")
    }

    private fun tagged(server: MinecraftServer, name: String): List<Entity> =
        server.overworld().getEntitiesOfClass(Entity::class.java, area).filter { name in it.tags }

    @Suppress("UNCHECKED_CAST")
    fun begin(server: MinecraftServer, owner: ServerPlayer) {
        // Keep a real channel for NeoForge capability queries and native teleport behavior; no socket is opened.
        originalConnection = owner.connection; player = owner
        val network = Connection(PacketFlow.SERVERBOUND)
        channel = EmbeddedChannel(network)
        owner.connection = object : ServerGamePacketListenerImpl(server, network, owner, CommonListenerCookie.createInitial(owner.gameProfile, false)) {
            override fun send(packet: Packet<*>) { }
            override fun send(packet: Packet<*>, listener: PacketSendListener?) { }
            override fun tick() { }
        }
        // KubeJS observes the real online-player list. The fixture and embedded channel leave in every exit path.
        val field = PlayerList::class.java.getDeclaredField("players")
        field.isAccessible = true
        listed = field.get(server.playerList) as MutableList<ServerPlayer>
        check(owner !in listed!!)
        listed!!.add(owner)
        val party = Cobblemon.storage.getParty(owner)
        for (slot in listOf(0, 3)) {
            val pokemon = party.get(slot)!!
            val settings = pokemon.persistentData.getCompound("WorldCombat").copy()
            settings.putString("Preferences", "{\"verdant\":{\"intent\":\"hold\"}}")
            pokemon.persistentData.put("WorldCombat", settings)
        }
        first = party.get(0)!!.sendOut(server.overworld(), Vec3(5.0, 100.0, 9.0), null)!!.also { it.setNoAi(true) }
        selected = party.get(3)!!.sendOut(server.overworld(), Vec3(6.0, 100.0, 8.0), null)!!.also { it.setNoAi(true) }
        val guest = FakePlayerFactory.get(server.overworld(), GameProfile(UUID.randomUUID(), "P5OtherTrainer"))
        PokemonServerChecks.initializeTestData(guest.uuid)
        val other = PokemonProperties.parse("eevee level=40").create()
        check(Cobblemon.storage.getParty(guest).add(other))
        foreign = other.sendOut(server.overworld(), Vec3(8.5, 100.0, 8.7), null)!!.also { it.setNoAi(true) }
        firstHealth = first.pokemon.currentHealth; foreignHealth = foreign.pokemon.currentHealth
    }

    fun close(server: MinecraftServer) {
        val owner = player
        if (owner != null) {
            command(server, owner, "pressure_stop")
            listed?.remove(owner)
            originalConnection?.let { owner.connection = it }
        }
        channel?.finishAndReleaseAll(); channel = null; originalConnection = null
        listed = null; player = null
    }

    private fun unchangedOthers() {
        check(first.pokemon.currentHealth == firstHealth && foreign.pokemon.currentHealth == foreignHealth) {
            "Selected-partner helper changed another owned slot or the nearer other trainer's Pokemon"
        }
        check(!first.hasEffect(MobEffects.WEAKNESS) && !foreign.hasEffect(MobEffects.WEAKNESS)) {
            "Selected-partner negative effects reached an unrelated body"
        }
    }

    fun tick(server: MinecraftServer, owner: ServerPlayer): Boolean {
        age++
        check(age < 650) { "Playtest conditions timed out at $age; fight=$fightStarted endurance=$enduranceObserved" }
        val combat = CombatServices.get(server)
        when (age) {
            10 -> command(server, owner, "select_4")
            15 -> {
                check(tagged(server, "wc_p5_selected") == listOf(selected)) { "Explicit fourth native party slot did not select only its sent-out body" }
                command(server, owner, "hurt"); command(server, owner, "debuff")
            }
            20 -> {
                val hp = selected.pokemon.currentHealth
                check(abs(hp - selected.pokemon.maxHealth * 0.5) <= 1.0) { "Helper did not create observable native half-health: $hp/${selected.pokemon.maxHealth}" }
                check(selected.hasEffect(MobEffects.MOVEMENT_SLOWDOWN) && selected.hasEffect(MobEffects.WEAKNESS)) { "Native amnesia observation conditions are missing" }
                unchangedOthers()
                selected.removeAllEffects(); selected.pokemon.heal()
                command(server, owner, "pressure")
            }
            65 -> check(selected.pokemon.currentHealth == selected.pokemon.maxHealth) { "Periodic damage ignored the player's preparation delay" }
            110 -> {
                check(selected.pokemon.currentHealth < selected.pokemon.maxHealth && selected.pokemon.currentHealth > 0) { "Periodic damage did not reach native health" }
                unchangedOthers(); command(server, owner, "pressure_stop")
            }
            115 -> {
                check(tagged(server, "wc_p5_selected").isEmpty()) { "Stop retained the active helper selection" }
                pausedHealth = selected.pokemon.currentHealth
            }
            145 -> {
                check(selected.pokemon.currentHealth == pausedHealth) { "Periodic damage continued after stop" }
                command(server, owner, "select_1")
            }
            150 -> {
                check(tagged(server, "wc_p5_selected") == listOf(first))
                command(server, owner, "pressure")
            }
            160 -> first.pokemon.recall()
            170 -> {
                check(tagged(server, "wc_p5_selected").isEmpty()) { "Recall retained a selected body" }
                first = Cobblemon.storage.getParty(owner).get(0)!!.sendOut(server.overworld(), Vec3(5.0, 100.0, 9.0), null)!!.also { it.setNoAi(true) }
            }
            175 -> command(server, owner, "select_2")
            180 -> {
                check(tagged(server, "wc_p5_selected").isEmpty()) { "An unavailable party slot fell back to a nearby Pokemon" }
                command(server, owner, "hurt")
            }
            225 -> {
                check(first.pokemon.currentHealth == firstHealth && tagged(server, "wc_p5_selected").isEmpty()) { "Old pressure followed a recalled individual into its replacement entity" }
                selected.pokemon.heal(); command(server, owner, "select_4")
            }
            230 -> command(server, owner, "endure")
            240 -> {
                check(selected.pokemon.currentHealth == selected.pokemon.maxHealth) { "Lethal helper attacked before the actual endurance effect existed" }
                val view = PokemonView.capture(selected)
                val slot = (0..3).firstOrNull { view.move(it)?.id() == "endure" }
                    ?: error("Native playtest kit lost endure: ${selected.pokemon.moveSet.map { it.name }}")
                val native = view.move(slot)!!
                val actor = combat.bind(selected)
                combat.runtime().start("world_combat:endure", actor, ActionTarget.point(combat.position(actor), Point(1.0, 0.0, 0.0)), owner.uuid,
                    mapOf("native-slot" to slot.toString(), "native-move" to native.key(), "native-design" to "endure", "native-selection" to "native"))
            }
        }
        if (age >= 240 && enduranceObserved < 0) {
            check(selected.isAlive && selected.pokemon.currentHealth > 0) { "Lethal observation helper defeated the actual enduring Pokemon" }
            if (selected.pokemon.currentHealth == 1) {
                enduranceObserved = age
                check(combat.runtime().effects().query(combat.bind(selected), "world_combat:guard").isEmpty()) { "Native lethal hit did not spend the real endurance charge" }
                println("P5CHECK playtest helper: exact party selection, actual HP/effect conditions, delayed native damage, explicit stop/recall cleanup and real endurance 1 HP")
            }
            check(age < 340) { "Lethal helper did not observe and hit the production endurance effect" }
        }
        if (enduranceObserved >= 0 && fightStarted < 0 && age >= enduranceObserved + 35) {
            check(selected.isAlive && selected.pokemon.currentHealth == 1) { "Lethal helper repeated its hit after the one-shot observation" }
            command(server, owner, "restore")
            command(server, owner, "range"); command(server, owner, "range")
            val distant = tagged(server, "wc_p5_range")
            check(distant.size == 1 && distant[0].isAlive && distant[0].position().distanceTo(owner.position()) >= 39) { "Repeated range setup did not retain one live genuinely distant target" }
            val origin = tagged(server, "wc_p5_origin").single().position()
            command(server, owner, "away")
            check(owner.position().distanceTo(origin) >= 29) { "Away control did not create a meaningful owner distance" }
            command(server, owner, "return")
            check(owner.position().distanceTo(origin) < 2) { "Return did not place the player at the known scene origin" }
            command(server, owner, "range_stop")
            check(tagged(server, "wc_p5_range").isEmpty()) { "Distant target cleanup retained its lookup tag" }
            command(server, owner, "duel")
            val previous = tagged(server, "wc_p5_duel").single()
            command(server, owner, "duel")
            check(!previous.isAlive && "wc_p5_duel" !in previous.tags) { "Repeated duel retained the previous test opponent" }
            opponent = tagged(server, "wc_p5_duel").single() as PokemonEntity
            check(opponent.pokemon.isWild() && opponent.pokemon.species.resourceIdentifier.path == "eevee" && !opponent.isNoAi)
            check(opponent.pokemon.moveSet.map { it.name }.toSet() == setOf("tackle", "growl", "takedown", "helpinghand")) {
                "Unexpected native opponent loadout: ${opponent.pokemon.moveSet.map { it.name }}"
            }
            first.pokemon.recall(); selected.pokemon.recall(); foreign.pokemon.recall()
            target = tagged(server, "wc_p5_a").single() as Cow
            target.moveTo(opponent.x - 4.0, opponent.y, opponent.z, 0F, 0F)
            targetHealth = target.health; initialPp = opponent.pokemon.moveSet.sumOf { it.currentPp }
            fightStarted = age
        }
        if (fightStarted >= 0 && age == fightStarted + 30) {
            check(opponent.hurt(server.overworld().damageSources().mobAttack(target), 1F)) { "Actual native provocation was refused" }
        }
        if (fightStarted >= 0 && age > fightStarted + 30) {
            check(age - fightStarted < 220) { "Non-grass observer did not actually cast against a native attacker; PP=${opponent.pokemon.moveSet.map { it.currentPp }} health=${target.health}" }
            if (target.health < targetHealth && opponent.pokemon.moveSet.sumOf { it.currentPp } < initialPp && !combat.runtime().busy(combat.bind(opponent))) {
                command(server, owner, "stop")
                check(tagged(server, "wc_p5_duel").isEmpty() && tagged(server, "wc_p5_wild").isEmpty())
                check(owner.isCreative)
                println("P5CHECK playtest conditions: repeat-safe distant target and owner round trip, non-grass native wild provocation, real formal damage and PP, complete stop")
                return true
            }
        }
        return false
    }
}
