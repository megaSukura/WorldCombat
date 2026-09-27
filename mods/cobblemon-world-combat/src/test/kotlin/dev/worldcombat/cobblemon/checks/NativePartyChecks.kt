package dev.worldcombat.cobblemon.checks

import com.cobblemon.mod.common.Cobblemon
import com.cobblemon.mod.common.api.Priority
import com.cobblemon.mod.common.api.events.CobblemonEvents
import com.cobblemon.mod.common.api.pokemon.PokemonProperties
import com.cobblemon.mod.common.api.storage.party.NPCPartyStore
import com.cobblemon.mod.common.entity.npc.NPCEntity
import com.cobblemon.mod.common.entity.pokemon.PokemonEntity
import com.google.gson.JsonParser
import dev.worldcombat.cobblemon.control.CompanionControl
import dev.worldcombat.cobblemon.control.TacticsContext
import dev.worldcombat.cobblemon.script.NativeParty
import dev.worldcombat.core.checks.TestWorld
import dev.worldcombat.core.runtime.ActionRejectedException
import dev.worldcombat.core.runtime.Point
import dev.worldcombat.core.runtime.WorldAccess
import dev.worldcombat.core.world.MinecraftCombat
import net.minecraft.server.level.ServerPlayer
import net.minecraft.world.phys.Vec3
import kotlin.math.ceil

/** Two same-species individuals prove stable party identity, independent of species and stale slot intent. */
object NativePartyChecks {
    fun run(combat: MinecraftCombat, actor: PokemonEntity, owner: ServerPlayer) {
        val store = Cobblemon.storage.getParty(owner)
        val first = PokemonProperties.parse("eevee level=15").create()
        val second = PokemonProperties.parse("eevee level=15").create()
        check(store.add(first) && store.add(second))
        try {
            first.currentHealth = 0; second.currentHealth = 0
            val slot = store.indexOf(first)
            val world = WorldAccess(combat.runtime(), combat.bind(actor), owner.uuid, {}, true, 0)
            fun result(expected: String) = JsonParser.parseString(NativeParty.reviveResult(world, combat.bind(actor), slot, .5, expected)).asJsonObject
            val stale = result(second.uuid.toString())
            check(!stale.get("ok").asBoolean && stale.get("reason").asString == "member-changed")
            check(first.isFainted() && second.isFainted())
            check(result(first.uuid.toString()).get("ok").asBoolean)
            check(first.currentHealth == ceil(first.maxHealth * .5).toInt() && second.isFainted() && first.entity == null)
            check(!result(first.uuid.toString()).get("ok").asBoolean)
            check(JsonParser.parseString(NativeParty.reviveResult(world, combat.bind(actor), store.indexOf(second), .5)).asJsonObject.get("ok").asBoolean)
            val session = CompanionControl.session(owner)
            val selected = session.partySlot
            try {
                check(JsonParser.parseString(NativeParty.sendOut(world, combat.bind(actor), slot, Point(13.0, 100.0, 4.0))).asJsonObject.get("ok").asBoolean)
                check(session.partySlot == slot)
                check(NativeParty.recall(world, combat.bind(first.entity ?: error("Player send-out absent"))))
            } finally { session.partySlot = selected }
            TestWorld.mark("Native party revive verified: exact same-species identity, stale refusal, half health, inactive result and legacy compatibility")
        } finally { store.remove(first); store.remove(second) }
        runNPC(combat, owner)
    }

    /** Native stores exercise both persisted and dynamically provided NPC teams without a challenge manager. */
    fun runNPC(combat: MinecraftCombat, player: ServerPlayer) {
        val level = player.serverLevel()
        val npc = NPCEntity(level)
        npc.moveTo(14.0, 100.0, 4.0, 0F, 0F)
        npc.setNoAi(true); npc.setNoGravity(true)
        check(level.addFreshEntity(npc))
        PokemonServerChecks.initializeTestData(npc.uuid)
        val store = NPCPartyStore(npc)
        val first = PokemonProperties.parse("eevee level=15").create()
        val second = PokemonProperties.parse("eevee level=15").create()
        val third = PokemonProperties.parse("pidgey level=15").create()
        check(store.add(first) && store.add(second) && store.add(third))
        val selected = CompanionControl.session(player).partySlot
        try {
            val actor = first.sendOut(level, Vec3(12.0, 100.0, 1.0), null) {
                it.setNoAi(true); it.setNoGravity(true)
            } ?: error("NPC send-out absent")
            val handle = combat.bind(actor)
            val world = WorldAccess(combat.runtime(), handle, null, {}, true, 0)
            fun result(value: String) = JsonParser.parseString(value).asJsonObject
            fun party() = JsonParser.parseString(NativeParty.party(world, handle)).asJsonArray
            check(npc.party == null && first.getOwnerNPC() === npc && !first.isWild())
            check(party().map { it.asJsonObject.get("id").asString } == listOf(first, second, third).map { it.uuid.toString() })
            npc.party = store
            check(party().size() == 3)
            npc.party = null
            val tactics = TacticsContext(combat, CompanionControl.Body(true).also { it.actor = handle }, null, "tick")
            try { check(tactics.owner()?.let(combat::resolve) === npc) } finally { tactics.close() }

            second.currentHealth = 0
            check(result(NativeParty.reviveResult(world, handle, 1, .5, third.uuid.toString())).get("reason").asString == "member-changed")
            val secondCoordinates = second.storeCoordinates.get()
            second.storeCoordinates.set(third.storeCoordinates.get())
            try {
                check(result(NativeParty.reviveResult(world, handle, 1, .5)).get("reason").asString == "not-owned")
                check(second.isFainted())
            } finally { second.storeCoordinates.set(secondCoordinates) }
            check(NativeParty.revive(world, handle, 1, .5))
            check(second.currentHealth == ceil(second.maxHealth * .5).toInt() && second.entity == null)

            val firstCoordinates = first.storeCoordinates.get()
            first.storeCoordinates.set(third.storeCoordinates.get())
            try {
                check(party().isEmpty)
                check(runCatching { NativeParty.sendOut(world, handle, 1, Point(12.0, 100.0, 4.0)) }.exceptionOrNull() is ActionRejectedException)
            } finally { first.storeCoordinates.set(firstCoordinates) }
            val pc = Cobblemon.storage.getPC(player.uuid, level.registryAccess())
            val boxed = PokemonProperties.parse("eevee level=15").create()
            check(pc.add(boxed))
            try {
                first.storeCoordinates.set(boxed.storeCoordinates.get())
                check(party().isEmpty)
                check(runCatching { NativeParty.sendOut(world, handle, 1, Point(12.0, 100.0, 4.0)) }.exceptionOrNull() is ActionRejectedException)
            } finally { first.storeCoordinates.set(firstCoordinates); pc.remove(boxed) }
            npc.party = NPCPartyStore(npc)
            try { check(party().isEmpty) } finally { npc.party = null }

            check(result(NativeParty.sendOut(world, handle, 1, Point(12.0, 100.0, 4.0))).get("ok").asBoolean)
            check(second.getOwnerNPC() === npc && second.storeCoordinates.get()?.store === store)
            check(CompanionControl.session(player).partySlot == selected)
            check(NativeParty.recall(world, combat.bind(second.entity ?: error("NPC reserve absent"))))
            check(result(NativeParty.switchOut(world, handle, 1, null)).get("ok").asBoolean)
            check(first.entity == null && second.entity != null && !combat.valid(handle))
            check(CompanionControl.session(player).partySlot == selected)

            val switched = combat.bind(second.entity ?: error("NPC switch absent"))
            val switchedWorld = WorldAccess(combat.runtime(), switched, null, {}, true, 0)
            val mutation = CobblemonEvents.POKEMON_RECALL_PRE.subscribe(Priority.HIGHEST) {
                if (it.pokemon === second) store.swap(0, 2)
            }
            val refused = try { result(NativeParty.switchOut(switchedWorld, switched, 0, null)) } finally { mutation.unsubscribe() }
            check(!refused.get("ok").asBoolean && refused.get("reason").asString == "target-changed" && refused.get("restored").asBoolean)
            check(second.entity != null && first.entity == null && third.entity == null)
            TestWorld.mark("Native NPC party verified: dynamic and persisted stores, owner entity, identity/PC boundaries, revive, send/recall/switch, player selection and recall-time slot replacement")
        } finally {
            store.clearParty()
            npc.discard()
        }
    }
}
