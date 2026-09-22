package dev.worldcombat.cobblemon

import com.cobblemon.mod.common.entity.pokemon.PokemonEntity
import dev.worldcombat.core.world.CombatDomain
import net.minecraft.server.level.ServerPlayer
import net.minecraft.world.entity.LivingEntity
import dev.worldcombat.cobblemon.script.GrowthContent
import dev.worldcombat.core.runtime.ActionContext

class PokemonCombatDomain : CombatDomain {
    override fun id() = "cobblemon"
    override fun supports(entity: LivingEntity) = entity is PokemonEntity
    override fun identity(entity: LivingEntity) = (entity as PokemonEntity).pokemon.uuid
    override fun deferredDamage() = true
    override fun movementControl(entity: LivingEntity, controlled: Boolean) {
        val pokemon = entity as PokemonEntity
        if (controlled && !pokemon.isVehicle && !pokemon.isPassenger) {
            pokemon.brain.stopAll(pokemon.level() as net.minecraft.server.level.ServerLevel, pokemon)
            pokemon.brain.eraseMemory(net.minecraft.world.entity.ai.memory.MemoryModuleType.WALK_TARGET)
            pokemon.brain.eraseMemory(net.minecraft.world.entity.ai.memory.MemoryModuleType.ATTACK_TARGET)
        }
    }
    private val ownerNames = java.util.concurrent.ConcurrentHashMap<java.util.UUID, String>()
    override fun navigationReason(entity: LivingEntity, goal: dev.worldcombat.core.runtime.Point) =
        dev.worldcombat.cobblemon.script.NativePasture.navigation(entity as PokemonEntity, goal)
    override fun controlIdentity(entity: LivingEntity): String {
        val owner = (entity as PokemonEntity).ownerUUID ?: return "wild"
        return ownerNames.computeIfAbsent(owner) { it.toString() } + ((entity as PokemonEntity).tethering?.let { "/pasture/${it.tetheringId}" } ?: "")
    }
    override fun owner(entity: LivingEntity) = (entity as PokemonEntity).pokemon.getOwnerUUID()
    override fun available(entity: LivingEntity): Boolean {
        val pokemon = (entity as PokemonEntity).pokemon
        // A recalled or replaced representation is discarded, so the sent-out state plus liveness identifies the current entity
        // without the level lookup behind `pokemon.entity`.
        return entity.isAlive && !entity.isRemoved && !pokemon.isFainted() && pokemon.state is com.cobblemon.mod.common.pokemon.activestate.SentOutState
            && !entity.isBusy && !entity.isEvolving && entity.beamMode == 0
            && (entity.tethering == null || dev.worldcombat.cobblemon.script.NativePasture.active(entity))
    }
    /** Controller authorization; per-definition eligibility belongs to loadout and commit policies. */
    override fun mayControl(entity: LivingEntity, controller: ServerPlayer) =
        (entity as PokemonEntity).pokemon.getOwnerUUID() == controller.uuid && entity.beamMode == 0 &&
            !entity.isPassenger && (!entity.isVehicle || entity.controllingPassenger === controller) && !entity.isEvolving &&
            (entity.tethering == null || dev.worldcombat.cobblemon.script.NativePasture.mayControl(entity, controller))

    override fun friendly(source: LivingEntity, target: LivingEntity): Boolean {
        if (source.isAlliedTo(target)) return true
        val owner = (source as PokemonEntity).pokemon.getOwnerUUID() ?: return false
        return target.uuid == owner || target is PokemonEntity && target.pokemon.getOwnerUUID() == owner
    }

    override fun joined(entity: LivingEntity) {
        val pokemon = (entity as PokemonEntity).pokemon
        dev.worldcombat.cobblemon.script.NativePublicAttributes.restore(entity)
        if (pokemon.maxHealth > 0) PokemonHealthBridge.project(entity)
    }
    override fun facts(entity: LivingEntity, out: com.google.gson.JsonObject) {
        val pokemon = (entity as PokemonEntity).pokemon
        out.addProperty("species", pokemon.species.resourceIdentifier.toString())
        out.addProperty("form", pokemon.form.name)
        out.addProperty("gender", pokemon.gender.name.lowercase(java.util.Locale.ROOT))
        out.add("types", com.google.gson.JsonArray().also { values -> pokemon.types.forEach { values.add(it.showdownId()) } })
        out.add("aspects", com.google.gson.JsonArray().also { values -> pokemon.aspects.sorted().forEach { values.add(it) } })
        out.addProperty("level", pokemon.level)
        out.addProperty("status", pokemon.status?.status?.name?.toString() ?: "")
        out.addProperty("wild", pokemon.isWild())
        out.addProperty("owner", pokemon.getOwnerUUID()?.toString() ?: "")
        out.addProperty("aiEnabled", !entity.isNoAi)
        dev.worldcombat.cobblemon.script.NativePasture.capture(entity)?.let {
            out.add("pasture", com.google.gson.JsonParser.parseString(it.json()))
        }
    }

    override fun defeated(source: LivingEntity, target: LivingEntity, controller: ServerPlayer?) {
        if (target is PokemonEntity) GrowthContent.defeated(source as PokemonEntity, target, controller)
    }
    override fun committed(actor: LivingEntity, action: ActionContext) {
        GrowthContent.committed(actor as PokemonEntity, action)
    }
}
