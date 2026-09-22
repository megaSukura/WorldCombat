package dev.worldcombat.cobblemon.script

import com.cobblemon.mod.common.api.events.CobblemonEvents
import com.cobblemon.mod.common.api.events.pokemon.HeldItemEvent
import com.cobblemon.mod.common.entity.pokemon.PokemonEntity
import com.cobblemon.mod.common.net.messages.client.pokemon.update.HeldItemUpdatePacket
import com.cobblemon.mod.common.pokemon.Pokemon
import com.cobblemon.mod.common.pokemon.feature.StashHandler
import dev.worldcombat.cobblemon.mixin.PokemonHeldAccess
import dev.worldcombat.core.runtime.*
import dev.worldcombat.core.world.CombatServices
import dev.worldcombat.core.world.WorldEquipment
import net.minecraft.world.entity.LivingEntity
import net.minecraft.world.item.ItemStack
import net.neoforged.neoforge.server.ServerLifecycleHooks
import java.util.Collections
import java.util.IdentityHashMap

/** The native held item reaches both reads and writes through the shared equipment contract. */
object NativeHeldItems {
    private val settling = Collections.newSetFromMap(IdentityHashMap<Pokemon, Boolean>())
    @Volatile private var installed = false

    /**
     * Registers the native held item as the "cobblemon" equipment provider, so `world.equipment(...)` reports
     * provider="cobblemon"/slot="held"/index=0 and `world.equipmentTake/Give/Drop/Exchange` reaches it through the
     * same compare-and-set contract as hands, armour and Curios. Reads used to live only on `CobblemonCombat.pokemon`;
     * they now also appear in the shared snapshot without re-running any gameplay.
     */
    fun install() {
        if (installed) return
        installed = true
        WorldEquipment.register("cobblemon") { entity, result ->
            val owner = entity as? PokemonEntity
            val stack = owner?.pokemon?.heldItem()
            if (stack != null && !stack.isEmpty) result.add(WorldEquipment.capture("cobblemon", "held", 0, stack, entity.registryAccess()))
        }
        WorldEquipment.registerWriter("cobblemon", object : WorldEquipment.Writer {
            override fun open(entity: LivingEntity, slot: String, index: Int, expected: ItemStack): WorldEquipment.Opened {
                val pokemon = (entity as? PokemonEntity)?.pokemon ?: return WorldEquipment.Opened.failure("not-pokemon")
                if (slot != "held" || index != 0) return WorldEquipment.Opened.failure("unknown-slot")
                val access = pokemon as PokemonHeldAccess
                val current = pokemon.heldItem()
                return WorldEquipment.Opened.success(
                    HeldSlot(pokemon, access, current.copy(), access.`worldcombat$canDropHeldItem`(), ItemStack.matches(current, expected))
                )
            }
            override fun take(entity: LivingEntity, slot: String, index: Int, expected: ItemStack): WorldEquipment.WriteResult {
                val opened = open(entity, slot, index, expected)
                return if (opened.ok()) WorldEquipment.takeFrom(opened.slot()) else WorldEquipment.WriteResult.failure(opened.reason())
            }
            override fun put(entity: LivingEntity, slot: String, index: Int, expected: ItemStack, incoming: ItemStack): WorldEquipment.WriteResult {
                val opened = open(entity, slot, index, expected)
                return if (opened.ok()) WorldEquipment.putInto(opened.slot(), incoming) else WorldEquipment.WriteResult.failure(opened.reason())
            }
        })
    }

    /**
     * One native held slot in a two-phase transaction. Preflight runs HELD_ITEM_PRE once and records what the
     * listener accepted. commit writes storage only (no rejectable pre-event, no client packet, no post-event);
     * {@link publish} sends the client update and fires HELD_ITEM_POST once every slot in the transaction
     * succeeded, so a rollback never announces or duplicates anything. Rollback restores storage directly.
     */
    private class HeldSlot(
        private val pokemon: Pokemon,
        private val access: PokemonHeldAccess,
        private val stock: ItemStack,
        private val canDrop: Boolean,
        private val observed: Boolean
    ) : WorldEquipment.Slot {
        private var pendingDrop = true
        private var committed: ItemStack? = null
        override fun stock() = stock.copy()
        override fun fresh() = observed && ItemStack.matches(pokemon.heldItem(), stock)
        /** A Pokemon's held slot holds one item; a larger stack is refused instead of being truncated. */
        override fun capacityFor(incoming: ItemStack) = 1
        override fun droppable() = stock.isEmpty || canDrop
        override fun preflight(incoming: ItemStack, incomingDroppable: Boolean): String? {
            val pre = HeldItemEvent.Pre(pokemon, incoming.copy(), stock.copy(), false)
            CobblemonEvents.HELD_ITEM_PRE.post(pre)
            if (pre.isCanceled || pre.decrement) return "refused"
            if (!ItemStack.matches(pre.receiving, incoming) || !ItemStack.matches(pre.returning, stock)) return "refused"
            pendingDrop = incoming.isEmpty || incomingDroppable
            return null
        }
        override fun commit(finalStack: ItemStack): Boolean {
            write(finalStack, pendingDrop)
            committed = finalStack.copy()
            return true
        }
        override fun settle(finalStack: ItemStack) {
            committed = null
            write(finalStack, finalStack.isEmpty || canDrop)
        }
        override fun publish() {
            val held = committed ?: return
            pokemon.onChange(HeldItemUpdatePacket({ pokemon }, held.copy()))
            CobblemonEvents.HELD_ITEM_POST.post(HeldItemEvent.Post(pokemon, held.copy(), stock.copy(), false)) { StashHandler.giveHeldItem(it) }
        }
        private fun write(value: ItemStack, drop: Boolean) {
            access.`worldcombat$heldItem`(value.copy())
            access.`worldcombat$canDropHeldItem`(value.isEmpty || drop)
        }
    }

    /** The identity-keyed held swap runs on the same shared two-phase equipment transaction as every other slot. */
    fun swap(world: WorldAccess, first: ActorHandle, second: ActorHandle, firstKey: String, secondKey: String): Boolean {
        world.requireMutation(first); world.requireMutation(second)
        val server = ServerLifecycleHooks.getCurrentServer() ?: throw ActionInactiveException("Server stopped")
        val combat = CombatServices.get(server)
        val entityA = combat.resolve(first) as? PokemonEntity ?: throw ActionInactiveException("Pokemon left")
        val entityB = combat.resolve(second) as? PokemonEntity ?: throw ActionInactiveException("Pokemon left")
        val a = entityA.pokemon; val b = entityB.pokemon
        if (a === b || a in settling || b in settling) return false
        if (NativeMechanics.heldKey(a) != firstKey || NativeMechanics.heldKey(b) != secondKey) return false
        val stockA = a.heldItem(); val stockB = b.heldItem()
        if (stockA.isEmpty && stockB.isEmpty) return false
        val accessA = a as PokemonHeldAccess; val accessB = b as PokemonHeldAccess
        settling.add(a); settling.add(b)
        try {
            val slotA = HeldSlot(a, accessA, stockA, accessA.`worldcombat$canDropHeldItem`(), true)
            val slotB = HeldSlot(b, accessB, stockB, accessB.`worldcombat$canDropHeldItem`(), true)
            return WorldEquipment.exchange(slotA, slotB, 0).ok()
        } finally { settling.remove(a); settling.remove(b) }
    }
}
