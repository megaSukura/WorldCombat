package dev.worldcombat.cobblemon.checks

import com.cobblemon.mod.common.Cobblemon
import com.cobblemon.mod.common.entity.pokemon.PokemonEntity
import com.mojang.authlib.GameProfile
import dev.worldcombat.core.checks.TestWorld
import dev.worldcombat.core.world.CombatServices
import net.minecraft.core.BlockPos
import net.minecraft.core.registries.BuiltInRegistries
import net.minecraft.nbt.CompoundTag
import net.minecraft.network.chat.Component
import net.minecraft.resources.ResourceLocation
import net.minecraft.server.MinecraftServer
import net.minecraft.server.level.ClientInformation
import net.minecraft.server.level.ServerPlayer
import net.minecraft.world.effect.MobEffects
import net.minecraft.world.entity.Entity
import net.minecraft.world.entity.Display
import net.minecraft.world.entity.animal.Cow
import net.minecraft.world.level.block.Blocks
import net.minecraft.world.level.block.CropBlock
import net.minecraft.world.phys.AABB
import net.neoforged.neoforge.common.util.FakePlayerFactory
import java.util.UUID

/** Executes the shipped datapack and native commands; no substitute content is registered here. */
object VerdantPlaytestChecks {
    private var age = 0
    private var done = false
    private lateinit var owner: ServerPlayer
    private var lease: AutoCloseable? = null
    private val retired = mutableListOf<Entity>()
    private val area = AABB(-48.0, 90.0, -16.0, 72.0, 112.0, 48.0)
    private val kits = listOf(
        "bulbasaur" to setOf("vinewhip", "growth", "solarbeam", "synthesis"),
        "ivysaur" to setOf("poisonpowder", "venoshock", "substitute", "gigadrain"),
        "venusaur" to setOf("grassyterrain", "protect", "helpinghand", "ingrain"),
        "venusaur" to setOf("amnesia", "endure", "petaldance", "petalblizzard")
    )
    private val repertoire = setOf("tackle", "growl", "vinewhip", "growth", "leechseed", "razorleaf", "poisonpowder", "sleeppowder",
        "seedbomb", "takedown", "sweetscent", "synthesis", "worryseed", "powerwhip", "solarbeam", "petaldance", "petalblizzard",
        "protect", "endure", "substitute", "helpinghand", "ingrain", "amnesia", "gigadrain", "venoshock", "grassyterrain")
    private val functions = listOf("setup", "create", "partner", "arena", "targets", "retire", "crops", "menu", "restore", "replant", "spawn", "resident", "wild", "stop",
        "select_1", "select_2", "select_3", "select_4", "conditions", "hurt", "debuff", "pressure", "endure", "pressure_stop", "duel", "duel_resident", "range", "away", "return", "range_stop")

    private fun command(server: MinecraftServer, name: String) {
        server.commands.performPrefixedCommand(owner.createCommandSourceStack().withPermission(4), "function worldcombat:p5_$name")
    }
    private fun tagged(server: MinecraftServer, tag: String): List<Entity> =
        server.overworld().getEntitiesOfClass(Entity::class.java, area).filter { tag in it.tags }

    private fun targets(server: MinecraftServer) {
        val current = tagged(server, "wc_p5_target")
        check(current.size == 3) { "Expected three current targets, found ${current.map { "${it.uuid}:alive=${it.isAlive}" }}" }
        check(current.all { it is Cow && it.isAlive && it.isNoAi && it.health == 240F }) { "Current target was dead, mobile, or not restored to 240 HP" }
        for (label in listOf("wc_p5_a", "wc_p5_b", "wc_p5_c")) {
            check(tagged(server, label).size == 1) { "Target label $label did not identify exactly one current body" }
        }
    }

    private fun checkRetired() {
        val lookup = setOf("wc_p5_target", "wc_p5_a", "wc_p5_b", "wc_p5_c", "wc_p5_wild")
        check(retired.all { it.tags.intersect(lookup).isEmpty() }) { "Retired fixture retained a current lookup tag during its death animation" }
        check(retired.none { it.isAlive }) { "A health reset revived a retired fixture" }
    }

    private fun plants(server: MinecraftServer) {
        val level = server.overworld()
        for ((x, id) in listOf(3 to "minecraft:wheat", 5 to "farmersdelight:cabbages")) for (z in listOf(13, 15)) {
            val pos = BlockPos(x, 100, z)
            val state = level.getBlockState(pos)
            check(BuiltInRegistries.BLOCK.getKey(state.block).toString() == id) { "Missing playtest crop at $pos: $state" }
            check(state.block is CropBlock && (state.block as CropBlock).getAge(state) == 0) { "Crop must begin at native age zero" }
            check(level.getBlockState(pos.below()).`is`(Blocks.FARMLAND))
        }
    }
    private fun finish(server: MinecraftServer) {
        VerdantPlaytestConditionChecks.close(server)
        if (::owner.isInitialized) server.playerList.deop(owner.gameProfile)
        lease?.close(); lease = null; done = true
    }

    @JvmStatic fun tick(server: MinecraftServer) {
        if (done || !CombatServices.CONTENT.ready()) return
        try {
            if (age >= 50) {
                if (VerdantPlaytestConditionChecks.tick(server, owner)) {
                    finish(server)
                    println("P5CHECK PASS playtest: shipped native setup, four legal kits and 26-move access, crops/items, repeat-safe fixtures, explicit owned-partner conditions, native damage start/stop/recall, lethal endurance, non-grass real wild cast and distant-scene round trip")
                }
                return
            }
            when (++age) {
                1 -> {
                    val level = TestWorld.prepare(server)
                    for (x in -3..4) for (z in -1..1) { level.setChunkForced(x, z, true); level.getChunk(x, z) }
                    val profile = GameProfile(UUID.randomUUID(), "P5PlaytestOwner")
                    owner = ServerPlayer(server, level, profile, ClientInformation.createDefault()).also {
                        it.connection = FakePlayerFactory.get(level, profile).connection
                        it.moveTo(8.0, 100.0, 8.0, 0F, 0F)
                    }
                    lease = TestWorld.mockOwner(server, owner); PokemonServerChecks.initializeTestData(owner.uuid)
                    server.playerList.op(owner.gameProfile)
                    check((0..5).all { Cobblemon.storage.getParty(owner).get(it) == null })
                    for (name in functions) check(server.functions.get(ResourceLocation.parse("worldcombat:p5_$name")).isPresent) {
                        "Datapack function p5_$name did not load; inspect native function parse errors"
                    }
                    for (move in repertoire) check(CombatServices.CONTENT.get("world_combat:$move") != null) { "Production skill missing: $move" }
                    command(server, "setup")
                }
                10 -> {
                    val party = Cobblemon.storage.getParty(owner)
                    check((0..5).count { party.get(it) != null } == 4) { "Setup did not give exactly four native partners" }
                    val accessible = mutableSetOf<String>()
                    kits.forEachIndexed { slot, (species, moves) ->
                        val pokemon = party.get(slot)!!
                        check(pokemon.species.resourceIdentifier.path == species && pokemon.level == 60)
                        check(pokemon.moveSet.map { it.name }.toSet() == moves) { "Unexpected native kit at $slot: ${pokemon.moveSet.map { it.name }}" }
                        check(pokemon.moveSet.all { it.currentPp == it.maxPp })
                        check(pokemon.getOwnerUUID() == owner.uuid)
                        accessible += pokemon.allAccessibleMoves.map { it.name }; accessible += moves
                    }
                    check(accessible.containsAll(repertoire)) { "Formal moves unreachable from the four native kits: ${repertoire - accessible}" }
                    for ((id, count) in listOf("cobblemon:ether" to 8, "cobblemon:rare_candy" to 2, "cobblemon:oran_berry" to 4,
                        "farmersdelight:cabbage_seeds" to 16, "minecraft:bone_meal" to 16, "cobblemon:poke_ball" to 16)) {
                        check(owner.inventory.countItem(BuiltInRegistries.ITEM.get(ResourceLocation.parse(id))) == count) { "Native helper item not given: $id" }
                    }
                    targets(server)
                    val signs = tagged(server, "wc_p5_sign")
                    check(signs.size == 6 && signs.all { entity ->
                        if (entity !is Display.TextDisplay) false else {
                            val saved = entity.saveWithoutId(CompoundTag())
                            val text = Component.Serializer.fromJson(saved.getString("text"), server.registryAccess())
                            text?.string?.isNotBlank() == true && saved.getString("billboard") == "center" && saved.getString("alignment") == "center"
                        }
                    }) {
                        "Playtest labels did not load as six readable, camera-facing native text displays"
                    }
                    check(tagged(server, "wc_p5_origin").size == 1)
                    check(owner.isCreative); plants(server)
                    command(server, "setup")
                    println("P5CHECK playtest native setup: four owner-bound kits, all 26 moves accessible, helper items, targets and MC/FD plants")
                }
                20 -> {
                    val party = Cobblemon.storage.getParty(owner)
                    check((0..5).count { party.get(it) != null } == 4 && tagged(server, "wc_p5_origin").size == 1) { "Repeating setup duplicated fixtures" }
                    party.get(0)!!.currentHealth -= 10; party.get(0)!!.moveSet[0]!!.currentPp = 0
                    server.overworld().setBlockAndUpdate(BlockPos(3, 100, 13), (Blocks.WHEAT as CropBlock).getStateForAge(7))
                    retired += tagged(server, "wc_p5_target")
                    command(server, "restore"); command(server, "replant")
                }
                25 -> {
                    targets(server); checkRetired()
                    retired += tagged(server, "wc_p5_target")
                    command(server, "restore")
                }
                30 -> {
                    val pokemon = Cobblemon.storage.getParty(owner).get(0)!!
                    check(pokemon.currentHealth == pokemon.maxHealth) { "Native heal command left HP ${pokemon.currentHealth}/${pokemon.maxHealth}" }
                    check(pokemon.moveSet.all { it.currentPp == it.maxPp }) { "Native heal command left PP ${pokemon.moveSet.map { "${it.name}:${it.currentPp}/${it.maxPp}" }}" }
                    targets(server); checkRetired(); plants(server)
                    command(server, "wild")
                }
                35 -> {
                    retired += tagged(server, "wc_p5_wild")
                    command(server, "wild")
                }
                40 -> {
                    val residents = tagged(server, "wc_p5_wild")
                    check(residents.size == 1 && residents[0] is PokemonEntity) { "Native wild macro did not create exactly one tagged resident" }
                    val resident = residents[0] as PokemonEntity
                    check(resident.pokemon.isWild() && resident.pokemon.species.resourceIdentifier.path == "bulbasaur" && !resident.isNoAi)
                    check(resident.pokemon.moveSet.map { it.name }.toSet() == setOf("tackle", "growl", "growth", "synthesis"))
                    check(!owner.isCreative && owner.hasEffect(MobEffects.DAMAGE_RESISTANCE))
                    checkRetired(); retired += residents
                    command(server, "stop")
                }
                50 -> {
                    check(tagged(server, "wc_p5_wild").isEmpty() && owner.isCreative && !owner.hasEffect(MobEffects.DAMAGE_RESISTANCE))
                    checkRetired()
                    check((0..5).count { Cobblemon.storage.getParty(owner).get(it) != null } == 4)
                    VerdantPlaytestConditionChecks.begin(server, owner)
                }
            }
        } catch (error: Throwable) {
            finish(server); println("P5CHECK FAIL playtest at $age: ${error.message} (${error.stackTrace.firstOrNull { it.className.startsWith("dev.worldcombat") }})"); error.printStackTrace()
        }
    }
}
