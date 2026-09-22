package dev.worldcombat.cobblemon.checks

import com.cobblemon.mod.common.Cobblemon
import com.cobblemon.mod.common.api.events.CobblemonEvents
import com.cobblemon.mod.common.api.moves.Moves
import com.cobblemon.mod.common.api.pokemon.PokemonProperties
import com.cobblemon.mod.common.api.pokemon.stats.Stats
import com.cobblemon.mod.common.entity.pokemon.PokemonEntity
import com.google.gson.JsonParser
import com.mojang.authlib.GameProfile
import dev.worldcombat.cobblemon.control.*
import dev.worldcombat.cobblemon.script.*
import dev.worldcombat.core.checks.TestWorld
import dev.worldcombat.core.runtime.*
import dev.worldcombat.core.world.*
import net.minecraft.core.registries.BuiltInRegistries
import net.minecraft.resources.ResourceLocation
import net.minecraft.server.MinecraftServer
import net.minecraft.server.level.ServerPlayer
import net.minecraft.world.item.ItemStack
import net.minecraft.world.phys.Vec3
import net.neoforged.neoforge.common.util.FakePlayerFactory
import java.util.UUID

/** Actual native health, PP, inventories and AI share the scripted combination paths. */
object NativeCombinationChecks {
    private var age = 0
    private var done = false
    private lateinit var first: PokemonEntity
    private lateinit var target: PokemonEntity
    private lateinit var player: ServerPlayer
    private var session: CompanionControl.Session? = null
    private var mock: AutoCloseable? = null
    private var initialAttack = 0
    private var hp = 0
    private var pp = 0
    private fun step(combat: MinecraftCombat, name: String) = combat.runtime().event("checks:combination_step", combat.bind(first), combat.bind(target), "{\"step\":\"$name\"}", true).let {
        check(it.rejection().isEmpty()) { "Script step $name failed: ${it.rejection()}" }; JsonParser.parseString(it.data()).asJsonObject
    }
    private fun move(id: String) { first.pokemon.moveSet.setMove(0, Moves.getByName(id)!!.create()) }
    private fun cast(combat: MinecraftCombat) {
        val actor = combat.bind(first); val binding = CompanionContent.resolve(actor, 0)
        check(binding.available()) { "Binding unavailable: $binding" }
        combat.runtime().start(binding.id, actor, ActionTarget.entity(combat.bind(target), combat.position(combat.bind(target)), Point(1.0,0.0,0.0)), player.uuid, binding.arguments)
    }
    private fun world(combat: MinecraftCombat) = WorldAccess(combat.runtime(), combat.bind(first), player.uuid, {}, true, 0)
    private fun held(actor: PokemonEntity, id: String) = actor.pokemon.swapHeldItem(ItemStack(BuiltInRegistries.ITEM.get(ResourceLocation.parse("cobblemon:$id"))), decrement = false)
    @JvmStatic fun tick(server: MinecraftServer) {
        if (done || !CombatServices.CONTENT.ready()) return
        val combat = CombatServices.get(server)
        try {
            session?.let { CompanionControl.advance(it) }
            when (age++) {
                0 -> {
                    val level = TestWorld.prepare(server)
                    player = FakePlayerFactory.get(level, GameProfile(UUID.randomUUID(), "P4CombinationCheck")); player.moveTo(2.0,100.0,5.0,0F,0F)
                    mock = TestWorld.mockOwner(server, player); PokemonServerChecks.initializeTestData(player.uuid)
                    fun send(properties: String, x: Double, owned: Boolean): PokemonEntity {
                        val pokemon = PokemonProperties.parse(properties).create()
                        pokemon.moveSet.clear(); pokemon.moveSet.setMove(0, Moves.getByName(if (owned) "growl" else "watergun")!!.create())
                        if (owned) Cobblemon.storage.getParty(player).add(pokemon)
                        return pokemon.sendOut(level, Vec3(x,100.0,2.0), null) {
                            it.setNoAi(true); it.setNoGravity(true); it.setPersistenceRequired()
                            it.getAttribute(net.minecraft.world.entity.ai.attributes.Attributes.KNOCKBACK_RESISTANCE)!!.baseValue = 1.0
                        } ?: error("Send-out failed")
                    }
                    first = send("bulbasaur level=20 ability=overgrow", 2.0, true)
                    target = send("charizard level=50 ability=blaze", 7.0, false)
                    initialAttack = first.pokemon.getStat(Stats.ATTACK)
                }
                20 -> {
                    val result = step(combat, "layers")
                    check(result["stage"].asInt == 1 && result["ability"].asString == "flashfire" && result["nativeAbility"].asString == "overgrow")
                    hp = first.pokemon.currentHealth
                    combat.damage(combat.bind(target), combat.bind(first), null, 3.0, "{\"kind\":\"move\",\"type\":\"fire\",\"bypassCooldown\":true}")
                    check(first.pokemon.currentHealth == hp) { "Top ability layer did not absorb actual fire damage" }
                }
                25 -> {
                    first.pokemon.evs[Stats.ATTACK] = 252
                    PokemonProperties.parse("ability=chlorophyll").apply(first.pokemon)
                }
                32 -> {
                    val result = step(combat, "inspect")
                    check(result["stage"].asInt == 2 && result["ability"].asString == "waterabsorb")
                    first.pokemon.currentHealth = first.pokemon.maxHealth / 2; hp = first.pokemon.currentHealth
                    combat.damage(combat.bind(target), combat.bind(first), null, 3.0, "{\"kind\":\"move\",\"type\":\"water\",\"bypassCooldown\":true}")
                    check(first.pokemon.currentHealth > hp) { "Expired top layer did not reveal the earlier absorption rule" }
                }
                55 -> {
                    val result = step(combat, "inspect")
                    check(result["stage"].asInt == 0 && result["ability"].asString == "chlorophyll" && result["attack"].asInt > initialAttack)
                    check(result["types"].asJsonArray.any { it.asString == "grass" })
                    println("P4CHECK temporary layers alter actual damage, expire independently and preserve native cultivation/ability changes")
                }
                60 -> {
                    step(combat, "borrow"); val binding = CompanionContent.resolve(combat.bind(first), 0)
                    check(binding.id == "cobblemon_world_combat:native_watergun" && first.pokemon.moveSet[0]!!.name == "growl")
                    hp = target.pokemon.currentHealth; pp = first.pokemon.moveSet[0]!!.currentPp; cast(combat)
                }
                80 -> {
                    check(target.pokemon.currentHealth < hp && first.pokemon.moveSet[0]!!.currentPp == pp - 1)
                    check(first.pokemon.moveSet[0]!!.name == "growl")
                }
                88 -> {
                    check(CompanionContent.resolve(combat.bind(first), 0).id == "examples:native_snare")
                    step(combat, "stale"); pp = first.pokemon.moveSet[0]!!.currentPp; cast(combat)
                }
                105 -> {
                    check(first.pokemon.moveSet[0]!!.currentPp == pp && !combat.runtime().busy(combat.bind(first)))
                    check(combat.runtime().state(combat.bind(first)).reason() == "loadout-changed")
                    println("P4CHECK temporary move binding uses original native PP; expiry during preparation cancels without payment")
                    move("copycat"); step(combat, "remember"); pp = first.pokemon.moveSet[0]!!.currentPp; hp = target.pokemon.currentHealth; cast(combat)
                }
                135 -> {
                    check(target.pokemon.currentHealth < hp && first.pokemon.moveSet[0]!!.currentPp == pp - 1)
                    check(target.pokemon.moveSet[0]!!.currentPp == target.pokemon.moveSet[0]!!.maxPp) { "Borrowed design charged the observed Pokemon" }
                    move("assist"); pp = first.pokemon.moveSet[0]!!.currentPp
                    val failure = runCatching { cast(combat) }.exceptionOrNull()
                    check(failure is ActionRejectedException && failure.reason() == "call-limit" && first.pokemon.moveSet[0]!!.currentPp == pp)
                    move("metronome"); pp = first.pokemon.moveSet[0]!!.currentPp; hp = target.pokemon.currentHealth; cast(combat)
                }
                160 -> {
                    check(target.pokemon.currentHealth < hp && first.pokemon.moveSet[0]!!.currentPp == pp - 1) {
                        "Random invocation hp=$hp/${target.pokemon.currentHealth} pp=$pp/${first.pokemon.moveSet[0]!!.currentPp} state=${combat.runtime().state(combat.bind(first))} positions=${first.position()} / ${target.position()}"
                    }
                    println("P4CHECK observed and random JS calls share one native payment; recursive invocation is rejected and remains usable")
                    held(first, "charcoal"); held(target, "mystic_water")
                    val replacedKey = NativeMechanics.heldKey(first.pokemon)
                    held(first, "charcoal")
                    check(NativeMechanics.heldKey(first.pokemon) != replacedKey) { "Same-item replacement retained a stale native item identity" }
                    check(!NativeHeldItems.swap(world(combat), combat.bind(first), combat.bind(target), replacedKey, NativeMechanics.heldKey(target.pokemon)))
                    val a = first.pokemon.heldItem(); val b = target.pokemon.heldItem()
                    var posts = 0
                    val post = CobblemonEvents.HELD_ITEM_POST.subscribe { if (it.pokemon === first.pokemon || it.pokemon === target.pokemon) posts++ }
                    val cancel = CobblemonEvents.HELD_ITEM_PRE.subscribe { if (it.pokemon === target.pokemon) it.cancel() }
                    try {
                        check(!step(combat, "exchange")["swapped"].asBoolean)
                        check(ItemStack.matches(a, first.pokemon.heldItem()) && ItemStack.matches(b, target.pokemon.heldItem()) && posts == 0)
                    } finally { cancel.unsubscribe() }
                    val aKey = NativeMechanics.heldKey(first.pokemon); val bKey = NativeMechanics.heldKey(target.pokemon)
                    try {
                        check(step(combat, "exchange")["swapped"].asBoolean)
                        check(ItemStack.matches(b, first.pokemon.heldItem()) && ItemStack.matches(a, target.pokemon.heldItem()) && posts == 2)
                        check(!NativeHeldItems.swap(world(combat), combat.bind(first), combat.bind(target), aKey, bKey))
                        check(posts == 2) { "Stale exchange published duplicate native settlement" }
                    } finally { post.unsubscribe() }
                    println("P4CHECK paired held-item transaction handles native cancellation, both native post-events and stale requests without item duplication")
                    move("disable"); target.pokemon.currentHealth = target.pokemon.maxHealth
                    session = CompanionControl.session(player); CompanionControl.advance(session!!)
                    session!!.permissions = 1; session!!.tactics = "autonomous"
                }
                185 -> {
                    val binding = CompanionContent.resolve(combat.bind(target), 0)
                    check(binding.reason == "move-restricted") { "Script AI did not apply the new restriction: $binding" }
                    val read = WorldAccess(combat.runtime(), combat.bind(target), null, {}, false, 0)
                    check(!PokemonScriptApi().skill(read, 0).ready()) { "AI readiness ignored the common restriction" }
                    val before = target.pokemon.moveSet[0]!!.currentPp
                    val failure = runCatching { combat.runtime().start(binding.id, combat.bind(target), ActionTarget.entity(combat.bind(first), combat.position(combat.bind(first)), Point(-1.0,0.0,0.0)), null, binding.arguments) }.exceptionOrNull()
                    check(failure is ActionRejectedException && failure.reason() == "move-restricted" && target.pokemon.moveSet[0]!!.currentPp == before)
                    session!!.permissions = 0
                    println("P4CHECK new AI candidate, HUD binding, AI readiness and direct commitment share the script-owned move restriction")
                }
                220 -> {
                    val result = step(combat, "copy")
                    check(result["attack"].asInt == target.pokemon.getStat(Stats.ATTACK) && result["nativeSpecies"].asString == "cobblemon:bulbasaur")
                    check(result["ability"].asString == "blaze" && first.pokemon.ability.name == "chlorophyll")
                    check(CompanionContent.resolve(combat.bind(first), 0).id == "cobblemon_world_combat:native_watergun")
                    first.pokemon.evs[Stats.ATTACK] = 0
                }
                255 -> {
                    val result = step(combat, "inspect")
                    check(result["attack"].asInt == initialAttack && result["ability"].asString == "chlorophyll")
                    check(CompanionContent.resolve(combat.bind(first), 0).id == "examples:move_seal")
                    println("P4CHECK combat copy supplies temporary stats, types, ability and move bindings while retaining native identity and live permanent updates")
                }
                285 -> {
                    check(CompanionContent.resolve(combat.bind(target), 0).available()) { "Expired restriction did not restore native move eligibility" }
                    move("copycat"); step(combat, "remember"); target.moveTo(19.0,100.0,2.0,0F,0F)
                    pp = first.pokemon.moveSet[0]!!.currentPp
                    val failure = runCatching { cast(combat) }.exceptionOrNull()
                    check(failure is ActionRejectedException && failure.reason() == "out-of-range" && first.pokemon.moveSet[0]!!.currentPp == pp)
                    move("metronome"); pp = first.pokemon.moveSet[0]!!.currentPp; hp = target.pokemon.currentHealth; cast(combat)
                }
                317 -> {
                    check(target.pokemon.currentHealth < hp && first.pokemon.moveSet[0]!!.currentPp == pp - 1)
                    check(step(combat, "inspect")["used"].asString == "ember") { "Random choice included a skill outside its own range" }
                    move("copycat"); step(combat, "remember"); target.moveTo(15.0,100.0,2.0,0F,0F)
                    pp = first.pokemon.moveSet[0]!!.currentPp; cast(combat)
                }
                318 -> target.moveTo(19.0,100.0,2.0,0F,0F)
                330 -> {
                    check(first.pokemon.moveSet[0]!!.currentPp == pp && combat.runtime().state(combat.bind(first)).reason() == "out-of-range")
                    target.moveTo(15.0,100.0,2.0,0F,0F); hp = target.pokemon.currentHealth; cast(combat)
                }
                337 -> {
                    check(combat.runtime().state(combat.bind(first)).committed())
                    target.moveTo(19.7,100.0,2.0,0F,0F)
                }
                365 -> {
                    check(target.pokemon.currentHealth == hp && first.pokemon.moveSet[0]!!.currentPp == pp - 1) { "Borrowed projectile exceeded the called skill's range" }
                    println("P4CHECK calls preserve designed range during choice, commitment and projectile flight")
                }
                375 -> {
                    move("disable")
                    val expected = com.google.gson.JsonObject().also {
                        it.addProperty("owner", player.uuid.toString()); it.addProperty("pokemon", first.pokemon.uuid.toString())
                        it.addProperty("pp", first.pokemon.moveSet[0]!!.currentPp); it.addProperty("attack", first.pokemon.getStat(Stats.ATTACK))
                    }
                    java.nio.file.Files.writeString(server.getWorldPath(net.minecraft.world.level.storage.LevelResource.ROOT).resolve("worldcombat-combination-save.json"), expected.toString())
                    first.pokemon.recall(); target.pokemon.recall(); combat.runtime().reset("combination-cleanup")
                    check(combat.runtime().stats().instances() == 0 && combat.runtime().effects().stats().active() == 0)
                    mock?.close(); mock = null; done = true
                    println("P4CHECK PASS native combinations: layered modifiers, temporary loadouts, invocation, resources, item exchange, AI restrictions and cleanup")
                }
            }
        } catch (error: Throwable) { done = true; mock?.close(); mock = null; error.printStackTrace(); println("P4CHECK FAIL native combinations age=$age $error") }
    }
}
