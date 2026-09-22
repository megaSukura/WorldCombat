package dev.worldcombat.cobblemon.script

import com.cobblemon.mod.common.entity.pokemon.PokemonEntity
import dev.worldcombat.core.runtime.ActorHandle
import dev.worldcombat.core.world.CombatServices
import net.neoforged.neoforge.server.ServerLifecycleHooks

class PokemonScriptApi {
    private val epoch = CombatServices.CONTENT.epoch()
    init { NativeHeldItems.install() }
    fun channel(id: String, callback: java.util.function.Consumer<ContentRequestContext>) = NativeContentChannels.register(epoch, id, callback)
    /** Read-only pack setting; see config/cobblemon_world_combat-server.toml and WorldCombatConfig.read. */
    fun packConfig(key: String): Double = dev.worldcombat.cobblemon.config.WorldCombatConfig.read(key)
    fun data(world: dev.worldcombat.core.runtime.WorldAccess, actor: ActorHandle, key: String) = NativeContentData.data(world, actor, key)
    fun compareData(world: dev.worldcombat.core.runtime.WorldAccess, actor: ActorHandle, key: String, expected: String?, value: String?) =
        NativeContentData.compareData(world, actor, key, expected, value)
    fun attributeBase(world: dev.worldcombat.core.runtime.WorldAccess, actor: ActorHandle, id: String, expected: Double, value: Double) =
        NativePublicAttributes.compareBase(world, actor, id, expected, value)
    fun register(id: String, version: String, maxTicks: Int,
                 callback: java.util.function.Consumer<dev.worldcombat.core.runtime.ActionContext>) {
        CombatServices.CONTENT.registerForDomain(epoch, id, version, maxTicks, "cobblemon", callback)
    }

    fun registerAction(id: String, version: String, maxTicks: Int, targetKind: String, range: Double,
                       callback: java.util.function.Consumer<dev.worldcombat.core.runtime.ActionContext>) {
        CombatServices.CONTENT.registerAction(epoch, id, version, maxTicks, "cobblemon", targetKind, range, callback)
    }

    fun tactics(callback: java.util.function.Consumer<dev.worldcombat.cobblemon.control.TacticsContext>) =
        dev.worldcombat.cobblemon.control.CompanionContent.brain(epoch, callback)
    fun skill(world: dev.worldcombat.core.runtime.WorldAccess, slot: Int): dev.worldcombat.cobblemon.control.WorldSkill {
        require(slot in 0..3); world.check()
        return dev.worldcombat.cobblemon.control.WorldSkill(world, slot)
    }

    fun slot(slot: Int, action: String) = dev.worldcombat.cobblemon.control.CompanionContent.slot(epoch, slot, action)

    fun loadout(callback: java.util.function.Consumer<dev.worldcombat.cobblemon.control.LoadoutContext>) =
        dev.worldcombat.cobblemon.control.CompanionContent.loadout(epoch, callback)

    fun growth(callback: java.util.function.Consumer<GrowthEvent>) = GrowthContent.register(epoch, callback)
    fun capture(callback: java.util.function.Consumer<CaptureView>) = CaptureContent.register(epoch, callback)

    fun ppCost(action: dev.worldcombat.core.runtime.ActionContext, slot: Int, moveKey: String, amount: Double): dev.worldcombat.core.runtime.CommitCost {
        check(epoch == CombatServices.CONTENT.epoch() && CombatServices.CONTENT.ready())
        action.origin() // Enforce the action's thread, owner and lifecycle before creating a resource handle.
        return NativePpCost(action, slot, moveKey, amount)
    }

    fun typeEffectiveness(attack: String, defence: String) = PokemonTypeRelations.multiplier(attack, defence)
    fun healthCapacity(world: dev.worldcombat.core.runtime.WorldAccess, actor: ActorHandle, value: Double) =
        NativeHealthCapacity.apply(world, actor, value)
    fun moveTemplate(id: String): PokemonMoveView {
        require(id.matches(Regex("[a-z0-9]{1,64}")))
        return PokemonMoveView.capture(com.cobblemon.mod.common.api.moves.Moves.getByName(id)
            ?: throw IllegalArgumentException("Unknown native move: $id"))
    }
    fun swapHeld(world: dev.worldcombat.core.runtime.WorldAccess, first: ActorHandle, second: ActorHandle, firstKey: String, secondKey: String) =
        NativeHeldItems.swap(world, first, second, firstKey, secondKey)
    /** Ordered read-only party of the actor's owner, `[]` for a wild actor. */
    fun party(world: dev.worldcombat.core.runtime.WorldAccess, actor: ActorHandle) = NativeParty.party(world, actor)
    /** Recalls the sent-out individual behind `actor`; false with no change when it is not the live partner. */
    fun recall(world: dev.worldcombat.core.runtime.WorldAccess, actor: ActorHandle) = NativeParty.recall(world, actor)
    /** Sends the owner's party `slot` out at `point` (or the actor's position); JSON {ok,reason,ref}. */
    fun sendOut(world: dev.worldcombat.core.runtime.WorldAccess, actor: ActorHandle, slot: Int, point: dev.worldcombat.core.runtime.Point?) =
        NativeParty.sendOut(world, actor, slot, point)
    /** Recalls `actor` and sends party `slot` out where it stood; JSON {ok,reason,ref,restored}, a refused send-out restores the caster. */
    fun switchOut(world: dev.worldcombat.core.runtime.WorldAccess, actor: ActorHandle, slot: Int, point: dev.worldcombat.core.runtime.Point?) =
        NativeParty.switchOut(world, actor, slot, point)
    /** Restores a fainted party member to `ratio` of maximum HP; a separate step from sendOut. */
    fun revive(world: dev.worldcombat.core.runtime.WorldAccess, actor: ActorHandle, slot: Int, ratio: Double) =
        NativeParty.revive(world, actor, slot, ratio)
    /** Same revive step with a readable reason; JSON {ok,reason,restored}. */
    fun reviveResult(world: dev.worldcombat.core.runtime.WorldAccess, actor: ActorHandle, slot: Int, ratio: Double) =
        NativeParty.reviveResult(world, actor, slot, ratio)
    fun status(world: dev.worldcombat.core.runtime.WorldAccess, actor: ActorHandle, id: String, seconds: Int, expected: String) = NativeMechanics.status(world, actor, id, seconds, expected)
    fun statusSeconds(world: dev.worldcombat.core.runtime.WorldAccess, actor: ActorHandle, seconds: Int, expected: String) = NativeMechanics.statusSeconds(world, actor, seconds, expected)
    fun statusMirror(world: dev.worldcombat.core.runtime.WorldAccess, actor: ActorHandle, expected: String) = NativeMechanics.statusMirror(world, actor, expected)
    fun consumeHeld(world: dev.worldcombat.core.runtime.WorldAccess, actor: ActorHandle, key: String, count: Int) = NativeMechanics.consumeHeld(world, actor, key, count)
    fun pp(world: dev.worldcombat.core.runtime.WorldAccess, actor: ActorHandle, slot: Int, move: String, expected: Int, value: Int) = NativeMechanics.pp(world, actor, slot, move, expected, value)
    fun statusLease(world: dev.worldcombat.core.runtime.WorldAccess, actor: ActorHandle) = NativeMechanics.statusLease(world, actor)
    fun statusRelease(world: dev.worldcombat.core.runtime.WorldAccess, actor: ActorHandle) = NativeMechanics.statusRelease(world, actor)
    fun record(world: dev.worldcombat.core.runtime.WorldAccess, actor: ActorHandle, id: String, amount: Int) = NativeMechanics.record(world, actor, id, amount)
    fun resetCritical(world: dev.worldcombat.core.runtime.WorldAccess, actor: ActorHandle) = NativeMechanics.resetCritical(world, actor)

    fun pokemon(handle: ActorHandle): PokemonView {
        val server = ServerLifecycleHooks.getCurrentServer() ?: error("A running server is required")
        val combat = CombatServices.get(server)
        combat.checkThread()
        val entity = combat.inspect(handle) as? PokemonEntity ?: error("Pokemon handle is no longer active")
        return PokemonViews.of(entity, server.tickCount)
    }
}

/**
 * Snapshots are reused within a tick: behavior code asks for the same Pokemon many times per decision. Every Pokemon
 * property write reports through `Pokemon.onChange` (see PokemonChangeMixin), and attribute writes through
 * `CombatAttributeChangedEvent`; both drop the entry so a later read in the same tick sees the write.
 */
object PokemonViews {
    private val views = HashMap<java.util.UUID, PokemonView>()
    private var tick = -1
    private var metadataRevision = -1L
    fun of(entity: PokemonEntity, now: Int): PokemonView {
        val revision = NativeMoveMetadata.revision
        if (now != tick || metadataRevision != revision) { views.clear(); tick = now; metadataRevision = revision }
        return views.getOrPut(entity.pokemon.uuid) { PokemonView.capture(entity) }
    }
    @JvmStatic fun invalidate(pokemon: com.cobblemon.mod.common.pokemon.Pokemon) { views.remove(pokemon.uuid) }
}
