package dev.worldcombat.cobblemon.checks

import com.cobblemon.mod.common.Cobblemon
import com.cobblemon.mod.common.api.moves.Moves
import com.cobblemon.mod.common.api.pokemon.PokemonProperties
import com.cobblemon.mod.common.entity.pokemon.PokemonEntity
import com.google.gson.JsonParser
import com.mojang.authlib.GameProfile
import dev.worldcombat.cobblemon.script.NativeContentData
import dev.worldcombat.cobblemon.script.PokemonView
import dev.worldcombat.core.checks.TestWorld
import dev.worldcombat.core.runtime.ActionTarget
import dev.worldcombat.core.runtime.Point
import dev.worldcombat.core.runtime.WorldAccess
import dev.worldcombat.core.world.CombatServices
import net.minecraft.core.BlockPos
import net.minecraft.core.registries.BuiltInRegistries
import net.minecraft.resources.ResourceLocation
import net.minecraft.server.MinecraftServer
import net.minecraft.server.level.ClientInformation
import net.minecraft.server.level.ServerPlayer
import net.minecraft.world.InteractionHand
import net.minecraft.world.item.ItemStack
import net.minecraft.world.item.Items
import net.minecraft.world.level.GameRules
import net.minecraft.world.level.block.Blocks
import net.minecraft.world.level.block.CropBlock
import net.minecraft.world.phys.Vec3
import net.neoforged.bus.api.EventPriority
import net.neoforged.neoforge.common.NeoForge
import net.neoforged.neoforge.common.util.FakePlayerFactory
import net.neoforged.neoforge.event.entity.player.PlayerInteractEvent
import java.util.UUID
import java.util.function.Consumer

/** Runs the final skill against actual Minecraft and Farmer's Delight plants, without replacement content. */
object VerdantCultivationChecks {
    private var age = 0
    private var done = false
    private lateinit var owner: ServerPlayer
    private lateinit var actor: PokemonEntity
    private var lease: AutoCloseable? = null
    private val wheat = BlockPos(7, 100, 2)
    private val cabbage = BlockPos(8, 100, 2)
    private val centre = Point(7.5, 100.15, 2.5)
    private var initialPp = 0
    private var initialHealth = 0
    private var sawFeedback = false
    private var sawPreparation = false
    private var sawRecovery = false

    private fun scope(server: MinecraftServer, writable: Boolean = true): WorldAccess {
        val combat = CombatServices.get(server)
        return WorldAccess(combat.runtime(), combat.bind(actor), owner.uuid, Runnable {}, writable, 0)
    }
    private fun crops(server: MinecraftServer) {
        val level = server.overworld()
        val modCrop = BuiltInRegistries.BLOCK.get(ResourceLocation.parse("farmersdelight:cabbages"))
        check(modCrop is CropBlock) { "Actual Farmer's Delight cabbage was not loaded" }
        for (pos in listOf(wheat, cabbage)) level.setBlockAndUpdate(pos.below(), Blocks.FARMLAND.defaultBlockState())
        level.setBlockAndUpdate(wheat, Blocks.WHEAT.defaultBlockState())
        level.setBlockAndUpdate(cabbage, modCrop.defaultBlockState())
    }
    private fun cast(server: MinecraftServer) {
        val combat = CombatServices.get(server); val handle = combat.bind(actor)
        val move = PokemonView.capture(actor).move(0)!!
        initialPp = move.pp(); initialHealth = actor.pokemon.currentHealth
        combat.runtime().start("world_combat:grassyterrain", handle,
            ActionTarget.point(centre, centre.minus(combat.position(handle)).unit()), owner.uuid,
            mapOf("native-slot" to "0", "native-move" to move.key(), "native-design" to "grassyterrain", "native-selection" to "native"))
        check(actor.pokemon.moveSet[0]!!.currentPp == initialPp)
    }
    @JvmStatic fun tick(server: MinecraftServer) {
        if (done || !CombatServices.CONTENT.ready()) return
        val combat = CombatServices.get(server)
        try {
            when (++age) {
                1 -> {
                    val level = TestWorld.prepare(server)
                    level.gameRules.getRule(GameRules.RULE_RANDOMTICKING).set(0, server)
                    level.dayTime = 6000
                    val profile = GameProfile(UUID.randomUUID(), "P5NativeGarden")
                    owner = ServerPlayer(server, level, profile, ClientInformation.createDefault()).also {
                        it.connection = FakePlayerFactory.get(level, profile).connection
                        it.moveTo(3.0, 100.0, 4.0, 0F, 0F)
                        it.setItemInHand(InteractionHand.MAIN_HAND, ItemStack(Items.DIAMOND_SWORD))
                    }
                    lease = TestWorld.mockOwner(server, owner); PokemonServerChecks.initializeTestData(owner.uuid)
                    val pokemon = PokemonProperties.parse("ivysaur level=40").create()
                    check(Cobblemon.storage.getParty(owner).add(pokemon))
                    actor = pokemon.sendOut(level, Vec3(5.5, 100.0, 2.5), null)!!; actor.setNoAi(true)
                    actor.pokemon.healTimer = 100000
                    actor.pokemon.moveSet.setMove(0, Moves.getByName("grassyterrain")!!.create())
                    crops(server)
                }
                30 -> {
                    val world = scope(server); val point = Point(7.0, 100.0, 2.0)
                    val native = world.block(point)!!; check(native.growable() && native.property("age") == "0")
                    var refused = false
                    try { scope(server, false).useItem(point, "minecraft:bone_meal", native.state()) } catch (expected: IllegalStateException) { refused = true }
                    check(refused) { "Read-only observation mutated a native block" }
                    val listener = Consumer<PlayerInteractEvent.RightClickBlock> { event -> if (event.pos == wheat) event.isCanceled = true }
                    NeoForge.EVENT_BUS.addListener(EventPriority.NORMAL, false, PlayerInteractEvent.RightClickBlock::class.java, listener)
                    try {
                        check(world.useItem(point, "minecraft:bone_meal", native.state()) == "protected-area")
                        check(world.block(point)!!.state() == native.state()) { "Denied interaction changed the crop" }
                    } finally { NeoForge.EVENT_BUS.unregister(listener) }
                    check(world.useItem(point, "minecraft:bone_meal", native.state()) == "changed")
                    val next = world.block(point)!!.state()
                    check(world.useItem(point, "minecraft:bone_meal", native.state()) == "state-changed")
                    check(world.block(point)!!.state() == next) { "Stale native state caused a second mutation" }
                    val foreign = Point(8.0, 100.0, 2.0); val other = world.block(foreign)!!
                    check(other.id() == "farmersdelight:cabbages" && other.growable())
                    check(world.useItem(foreign, "minecraft:bone_meal", other.state()) == "changed")
                    check(owner.mainHandItem.`is`(Items.DIAMOND_SWORD) && owner.x == 3.0) { "Native interaction altered the real player's hand or position" }
                    println("P5CHECK native crop facts, Farmer's Delight item behavior, read-only/CAS and NeoForge permission veto passed")
                    crops(server); actor.pokemon.currentHealth = actor.pokemon.maxHealth / 2; cast(server)
                }
                240 -> {
                    check(sawPreparation && sawRecovery) { "Garden action missed preparation/recovery" }
                    check(actor.pokemon.moveSet[0]!!.currentPp == initialPp - 1)
                    check(actor.pokemon.currentHealth > initialHealth) { "Garden failed to heal its nearby owner-bound Pokemon" }
                    for (pos in listOf(wheat, cabbage)) {
                        val state = server.overworld().getBlockState(pos)
                        check((state.block as CropBlock).isMaxAge(state)) { "Production garden did not mature $pos: $state" }
                    }
                    check(sawFeedback) { "Actual crop growth was not published as world feedback" }
                    check(scope(server).effects(combat.bind(actor), "world_combat:field").isEmpty()) { "Expired garden remained active" }
                    println("P5CHECK production grassyterrain matured vanilla and mod crops, healed native HP, spent one PP and expired")
                    val world = scope(server); val key = "world_combat:preferences/grassyterrain"
                    check(NativeContentData.compareData(world, world.source(), key, null, """{"version":1,"patch":{"cultivatePlants":false}}"""))
                    crops(server); actor.pokemon.currentHealth = actor.pokemon.maxHealth / 2; cast(server)
                }
                450 -> {
                    check(actor.pokemon.moveSet[0]!!.currentPp == initialPp - 1 && actor.pokemon.currentHealth > initialHealth)
                    for (pos in listOf(wheat, cabbage)) check(scope(server).block(Point(pos.x.toDouble(), 100.0, pos.z.toDouble()))!!.property("age") == "0")
                    lease?.close(); done = true
                    println("P5CHECK PASS production garden: native/FD plants, permission hooks, scoped use, real feedback, recovery and individual cultivation preference")
                }
            }
            if (::actor.isInitialized && age in 31..230) {
                val state = combat.runtime().state(combat.bind(actor))
                if (state.stage() == "preparing") sawPreparation = true
                if (state.stage() == "recovering") sawRecovery = true
                val scenes = JsonParser.parseString(combat.presentations().snapshot(owner)).asJsonArray
                if (scenes.any { it.asJsonObject.get("type").asString == "world_combat:feedback" && it.asJsonObject.getAsJsonObject("data").get("kind").asString == "work" }) sawFeedback = true
            }
        } catch (error: Throwable) {
            done = true; lease?.close(); println("P5CHECK FAIL cultivation at $age: ${error.message}"); error.printStackTrace()
        }
    }
}
