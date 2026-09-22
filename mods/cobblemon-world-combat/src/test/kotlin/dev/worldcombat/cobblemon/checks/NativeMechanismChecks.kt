package dev.worldcombat.cobblemon.checks

import com.cobblemon.mod.common.Cobblemon
import com.cobblemon.mod.common.api.moves.Moves
import com.cobblemon.mod.common.api.pokemon.PokemonProperties
import com.cobblemon.mod.common.entity.pokemon.PokemonEntity
import com.mojang.authlib.GameProfile
import dev.worldcombat.cobblemon.control.*
import dev.worldcombat.cobblemon.network.ControlCommand
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

/** Native writes, designed world effects and independent companion intent in one live server batch. */
object NativeMechanismChecks {
    private var age = 0
    private var done = false
    private lateinit var first: PokemonEntity
    private lateinit var second: PokemonEntity
    private lateinit var target: PokemonEntity
    private lateinit var player: ServerPlayer
    private lateinit var session: CompanionControl.Session
    private var mock: AutoCloseable? = null
    private var poisonedHealth = 0
    private var healingHealth = 0
    private var firstBody: CompanionControl.Body? = null
    private var secondBody: CompanionControl.Body? = null
    private fun world(combat: MinecraftCombat, actor: PokemonEntity) = WorldAccess(combat.runtime(), combat.bind(actor), player.uuid, {}, true, 0)
    private fun held(actor: PokemonEntity, id: String) = actor.pokemon.swapHeldItem(ItemStack(BuiltInRegistries.ITEM.get(ResourceLocation.parse("cobblemon:$id"))), decrement = false)
    private fun castExample(combat: MinecraftCombat, move: String, input: ActionTarget) {
        first.pokemon.moveSet.setMove(0, Moves.getByName(move)!!.create())
        val actor = combat.bind(first); val skill = CompanionContent.resolve(actor, 0)
        combat.runtime().start(skill.id, actor, input, player.uuid, skill.arguments)
    }
    private fun command(combat: MinecraftCombat, operation: String, value: Int, point: Point = Point(9.0,100.0,2.0)) {
        val actor = session.actor!!
        CompanionControl.request(player, ControlCommand(session.id, session.gate.lastSequence() + 1, session.epoch, player.server.tickCount.toLong(),
            actor.entity(), actor.generation(), session.partySlot, operation, value, ControlCommand.NONE, point, Point(1.0,0.0,0.0), ""))
    }
    @JvmStatic fun tick(server: MinecraftServer) {
        if (done || !CombatServices.CONTENT.ready()) return
        val combat = CombatServices.get(server)
        try {
            if (age > 0) CompanionControl.advance(session)
            when (age++) {
                0 -> {
                    val level = TestWorld.prepare(server)
                    player = FakePlayerFactory.get(level, GameProfile(UUID.randomUUID(), "P4NativeCheck")); player.moveTo(2.0,100.0,4.0,0F,0F)
                    mock = TestWorld.mockOwner(server, player); PokemonServerChecks.initializeTestData(player.uuid)
                    fun send(properties: String, x: Double, owned: Boolean): PokemonEntity {
                        val pokemon = PokemonProperties.parse(properties).create()
                        pokemon.moveSet.clear(); pokemon.moveSet.setMove(0, Moves.getByName("growl")!!.create())
                        if (owned) Cobblemon.storage.getParty(player).add(pokemon)
                        return pokemon.sendOut(level, Vec3(x,100.0,2.0), null) { it.setNoAi(true); it.setNoGravity(true); it.setPersistenceRequired() } ?: error("Send-out failed")
                    }
                    first = send("bulbasaur level=20", 2.0, true); second = send("charmander level=20", 5.0, true)
                    target = send("vaporeon level=20 ability=waterabsorb", 10.0, false)
                    session = CompanionControl.session(player)
                }
                20 -> {
                    check(session.members.size == 2) { "Both sent-out partners must be managed" }
                    command(combat, "intent", 1)
                    firstBody = session.body; firstBody!!.permissions = 0
                    session.partySlot = 1; CompanionControl.advance(session); secondBody = session.body
                    check(firstBody !== secondBody && firstBody!!.intent == "hold")
                    check(combat.controls(first) && combat.controls(second)) { "Selection released the previous companion" }
                    command(combat, "tactics", 1); secondBody!!.permissions = 1
                }
                31 -> {
                    val handle = combat.bind(second)
                    check(combat.runtime().busy(handle)) { "Autonomous action did not begin preparation" }
                    session.partySlot = 0; CompanionControl.advance(session)
                    check(combat.runtime().busy(handle)) { "Changing selection interrupted the other partner's autonomous preparation" }
                }
                32 -> { session.partySlot = 1; CompanionControl.advance(session) }
                40 -> {
                    check(combat.runtime().effects().query(combat.bind(target), "world_combat:rooted").isNotEmpty()) {
                        "New mechanism candidate was not used by native AI: tick=${combat.runtime().now()} manual=${session.lastManual} retry=${session.blockedUntil} reason=${session.reason} memory=${session.body.memory} binding=${CompanionContent.resolve(session.actor, 0)}"
                    }
                    check(firstBody!!.intent == "hold" && firstBody!!.intentPoint == Point(9.0,100.0,2.0))
                    secondBody!!.permissions = 0
                    command(combat, "intent", 4)
                    CompanionControl.advance(session)
                    check(!combat.controls(second) && combat.controls(first)) { "Roam must release only its own companion" }
                    session.partySlot = 0; CompanionControl.advance(session)
                    check(session.body === firstBody && session.intent == "hold")
                    val move = first.pokemon.moveSet[0]!!
                    val key = PokemonScriptApi().pokemon(combat.bind(first)).move(0)!!.key()
                    val beforePp = move.currentPp
                    check(NativeMechanics.pp(world(combat, first), combat.bind(first), 0, key, beforePp, beforePp - 1))
                    check(!NativeMechanics.pp(world(combat, first), combat.bind(first), 0, key, beforePp, 0) && move.currentPp == beforePp - 1) { "Stale resource request changed native PP" }
                    first.pokemon.currentHealth = first.pokemon.maxHealth
                    target.pokemon.currentHealth = target.pokemon.maxHealth / 2
                    val before = target.pokemon.currentHealth
                    combat.damage(combat.bind(first), combat.bind(target), player.uuid, 3.0, "{\"kind\":\"move\",\"bypassCooldown\":true,\"type\":\"water\",\"category\":\"special\"}")
                    check(target.pokemon.currentHealth > before) { "World absorb rule did not use the native healing path" }
                    target.pokemon.currentHealth = target.pokemon.maxHealth
                    held(target, "focus_sash")
                    combat.damage(combat.bind(first), combat.bind(target), player.uuid, 100.0, "{\"kind\":\"move\",\"bypassCooldown\":true,\"type\":\"normal\",\"category\":\"physical\"}")
                    check(target.pokemon.currentHealth == 1 && target.pokemon.heldItem().isEmpty) { "Focus item did not survive and consume exactly once" }
                    target.pokemon.currentHealth = target.pokemon.maxHealth
                    held(first, "life_orb")
                    val hp = first.pokemon.currentHealth
                    combat.damage(combat.bind(first), combat.bind(target), player.uuid, 2.0, "{\"kind\":\"move\",\"bypassCooldown\":true,\"type\":\"normal\",\"category\":\"physical\",\"action\":912}")
                    check(first.pokemon.currentHealth < hp) { "Post-hit item effect did not alter native health" }
                    val after = first.pokemon.currentHealth
                    combat.damage(combat.bind(first), combat.bind(target), player.uuid, 2.0, "{\"kind\":\"move\",\"bypassCooldown\":true,\"type\":\"normal\",\"category\":\"physical\",\"action\":912}")
                    check(first.pokemon.currentHealth == after) { "Multi-hit action charged the same item effect twice" }
                    check(NativeMechanics.status(world(combat, first), combat.bind(target), "cobblemon:poison", 40, NativeMechanics.statusKey(target.pokemon)))
                    poisonedHealth = target.pokemon.currentHealth
                }
                60 -> {
                    first.pokemon.currentHealth = first.pokemon.maxHealth / 2; healingHealth = first.pokemon.currentHealth
                    castExample(combat, "leechseed", ActionTarget.point(Point(2.0,100.4,2.0), Point(1.0,0.0,0.0)))
                }
                85 -> {
                    check(first.pokemon.currentHealth > healingHealth) { "Healing field did not update native health" }
                    castExample(combat, "tailwhip", ActionTarget.point(Point(5.0,100.0,4.0), Point(1.0,0.0,0.0)))
                }
                95 -> {
                    check(combat.helpers().count() == 1) { "Native-bound decoy did not create its helper" }
                    castExample(combat, "withdraw", ActionTarget.entity(combat.bind(first), combat.position(combat.bind(first)), Point(1.0,0.0,0.0)))
                }
                105 -> {
                    val before = target.pokemon.currentHealth
                    val defence = combat.runtime().effects().query(combat.bind(first), "world_combat:reflect").toList()
                    val defenderHealth = first.pokemon.currentHealth
                    val accepted = combat.damage(combat.bind(target), combat.bind(first), null, 2.0, "{\"kind\":\"move\",\"bypassCooldown\":true,\"type\":\"normal\"}")
                    check(target.pokemon.currentHealth < before) { "Native-bound reflection: defence=$defence accepted=$accepted defender=$defenderHealth->${first.pokemon.currentHealth} attacker=$before->${target.pokemon.currentHealth} sourceValid=${combat.valid(combat.bind(first))}" }
                    poisonedHealth = target.pokemon.currentHealth
                }
                140 -> {
                    check(target.pokemon.currentHealth < poisonedHealth) { "Native poison did not produce its world periodic effect" }
                    held(target, "pecha_berry")
                }
                150 -> {
                    val notice = "{\"pokemon\":\"${target.pokemon.uuid}\"}"
                    CompanionTactics.notice(session, combat, "native_capture_started", notice)
                    check(session.members.values.all { it.captureHold == target.pokemon.uuid }) { "Script capture policy did not reach every companion" }
                    CompanionTactics.notice(session, combat, "native_capture_complete", notice)
                    check(session.members.values.all { it.captureHold == null }) { "Script capture policy did not clear the completed target" }
                    check(session.body === firstBody) { "Native notification changed command selection" }
                }
                165 -> {
                    check(target.pokemon.status == null && target.pokemon.heldItem().isEmpty) { "Native cure and item consumption did not agree" }
                    val old = combat.bind(second)
                    second.pokemon.recall(); CompanionControl.advance(session)
                    check(session.members.size == 1 && !combat.valid(old) && combat.controls(first)) { "Recall damaged independent management" }
                    first.pokemon.recall(); target.pokemon.recall(); combat.runtime().reset("batch-cleanup")
                    check(combat.runtime().effects().stats().active() == 0 && combat.helpers().count() == 0)
                    mock?.close(); mock = null; done = true
                    println("P4CHECK PASS native mechanisms: multi-partner intent, selection, roam, candidate extension, absorption, item settlement, native status, cure and cleanup")
                }
            }
        } catch (error: Throwable) { done = true; mock?.close(); mock = null; error.printStackTrace(); println("P4CHECK FAIL native mechanisms age=$age $error") }
    }
}
