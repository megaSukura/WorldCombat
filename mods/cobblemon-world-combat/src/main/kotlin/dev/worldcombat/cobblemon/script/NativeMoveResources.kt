package dev.worldcombat.cobblemon.script

import com.cobblemon.mod.common.api.moves.Move
import com.cobblemon.mod.common.entity.pokemon.PokemonEntity
import dev.worldcombat.core.runtime.ActionContext
import dev.worldcombat.core.runtime.ActionRejectedException
import dev.worldcombat.core.runtime.CommitCost
import dev.worldcombat.core.world.CombatServices
import net.neoforged.neoforge.server.ServerLifecycleHooks
import java.util.UUID
import java.util.WeakHashMap

/** Transient object identity, independent of PP updates and the native persistent move ID. */
internal object NativeMoveKeys {
    private val keys = WeakHashMap<Move, String>()
    @Synchronized fun key(move: Move): String = keys.getOrPut(move) { UUID.randomUUID().toString() }
}

/** Adapts one native PP balance to the core's resource transaction; content supplies the cost. */
class NativePpCost(private val owner: ActionContext, private val slot: Int,
                   private val expectedMove: String, amount: Double) : CommitCost {
    private val amount: Int
    private var move: Move? = null
    private var before = 0
    private var written = false
    init {
        require(amount.isFinite() && amount >= 0 && amount <= Int.MAX_VALUE && amount == amount.toInt().toDouble())
        this.amount = amount.toInt()
    }
    override fun key() = "${owner.actor().key()}/pp/$expectedMove"
    private fun current(): Move {
        val server = ServerLifecycleHooks.getCurrentServer() ?: throw ActionRejectedException("actor-left")
        val combat = CombatServices.get(server)
        combat.checkThread()
        val entity = combat.resolve(owner.actor()) as? PokemonEntity ?: throw ActionRejectedException("actor-left")
        val move = entity.pokemon.moveSet[slot] ?: throw ActionRejectedException("loadout-changed")
        if (NativeMoveKeys.key(move) != expectedMove) throw ActionRejectedException("loadout-changed")
        return move
    }
    override fun prepare(action: ActionContext) {
        check(action === owner) { "Resource belongs to another action" }
        owner.checkCostAccess(this, "prepare")
        move = current()
        before = move!!.currentPp
        if (before < amount) throw ActionRejectedException("no-pp")
    }
    override fun apply() {
        owner.checkCostAccess(this, "apply")
        val prepared = checkNotNull(move)
        if (current() !== prepared || prepared.currentPp != before) throw ActionRejectedException("resource-changed")
        written = true
        prepared.currentPp = before - amount
    }
    override fun rollback() {
        owner.checkCostAccess(this, "rollback")
        if (written) {
            written = false
            checkNotNull(move).currentPp = before
        }
    }
}
