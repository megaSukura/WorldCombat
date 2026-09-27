package dev.worldcombat.cobblemon.checks

import com.cobblemon.mod.common.api.riding.RidingStyle
import com.cobblemon.mod.common.api.riding.stats.RidingStat
import com.cobblemon.mod.common.api.riding.behaviour.types.land.HorseBehaviour
import com.cobblemon.mod.common.entity.pokemon.PokemonEntity
import dev.worldcombat.cobblemon.NativeRidingSpeed
import net.minecraft.resources.ResourceLocation
import net.minecraft.world.entity.ai.attributes.AttributeModifier
import net.minecraft.world.entity.ai.attributes.Attributes
import kotlin.math.abs

/** Real native controller inputs and entity-data serialization; visual riding is checked by the player. */
object NativeRidingSpeedChecks {
    @JvmStatic fun run(actor: PokemonEntity) {
        check(actor.isVehicle && actor.controllingPassenger != null)
        val access = actor as NativeRidingSpeed.Access
        val previousPolicy = access.`worldcombat$ridingPolicy`()
        val previousFactor = access.`worldcombat$ridingFactor`()
        val movement = actor.getAttribute(Attributes.MOVEMENT_SPEED)!!
        val key = ResourceLocation.fromNamespaceAndPath("checks", "riding_speed")
        val busyLock = Any()
        check(!movement.hasModifier(key))
        fun near(a: Double, b: Double) = check(abs(a - b) < 1e-5) { "$a != $b" }
        val horseWalk = HorseBehaviour::class.java.getDeclaredMethod("getWalkSpeed", PokemonEntity::class.java).also { it.isAccessible = true }
        val horse = HorseBehaviour()
        fun walk() = horseWalk.invoke(horse, actor) as Double
        try {
            access.`worldcombat$ridingFactors`(1F, 1F)
            val baseline = RidingStyle.entries.associateWith { actor.getRideStat(RidingStat.SPEED, it, 0.1, 2.0) }
            val jump = actor.getRideStat(RidingStat.JUMP, RidingStyle.LAND, 0.2, 1.0)
            val stamina = actor.getRideStat(RidingStat.STAMINA, RidingStyle.LAND, 10.0, 30.0)
            val basicWalk = walk()
            access.`worldcombat$ridingFactors`(2F, 2F)
            baseline.forEach { (style, speed) -> near(actor.getRideStat(RidingStat.SPEED, style, 0.1, 2.0), speed * 2) }
            near(walk(), basicWalk * 2)
            near(actor.getRideStat(RidingStat.JUMP, RidingStyle.LAND, 0.2, 1.0), jump)
            near(actor.getRideStat(RidingStat.STAMINA, RidingStyle.LAND, 10.0, 30.0), stamina)

            movement.addTransientModifier(AttributeModifier(key, 0.5, AttributeModifier.Operation.ADD_MULTIPLIED_TOTAL))
            // Native horse walking already includes this 1.5x; the script policy adds exactly 2x.
            access.`worldcombat$ridingFactors`(2F, 3F)
            near(walk(), basicWalk * 3)
            baseline.forEach { (style, speed) -> near(actor.getRideStat(RidingStat.SPEED, style, 0.1, 2.0), speed * 3) }

            movement.removeModifier(key)
            NativeRidingSpeed.refresh(actor)
            val policy = NativeRidingSpeed.policy(actor)
            val originalFactor = NativeRidingSpeed.factor(actor)
            movement.addTransientModifier(AttributeModifier(key, 0.5, AttributeModifier.Operation.ADD_MULTIPLIED_TOTAL))
            NativeRidingSpeed.refresh(actor)
            near(NativeRidingSpeed.policy(actor), policy)
            near(NativeRidingSpeed.factor(actor), originalFactor * 1.5)

            // The mount and driver remain alive while native transitions temporarily make the actor unavailable.
            actor.busyLocks.add(busyLock)
            NativeRidingSpeed.refresh(actor)
            near(NativeRidingSpeed.policy(actor), 1.0)
            near(NativeRidingSpeed.factor(actor), 1.0)
            actor.busyLocks.remove(busyLock)
            NativeRidingSpeed.refresh(actor)
            near(NativeRidingSpeed.policy(actor), policy)
            near(NativeRidingSpeed.factor(actor), originalFactor * 1.5)
            actor.entityData.packDirty()
            NativeRidingSpeed.refresh(actor)
            check(actor.entityData.packDirty() == null) { "Unchanged riding factors dirtied entity tracking data" }
            val spawn = actor.entityData.nonDefaultValues ?: error("Fresh trackers require riding factors")
            check(spawn.any { it.value is Float && abs((it.value as Float).toDouble() - NativeRidingSpeed.factor(actor)) < 1e-5 })
            println("P5CHECK native riding speed scales propulsion/horse walking once, preserves jump/stamina, handles native busy transitions, and uses changed-only tracked data")
        } finally {
            actor.busyLocks.remove(busyLock)
            movement.removeModifier(key)
            access.`worldcombat$ridingFactors`(previousPolicy, previousFactor)
        }
    }
}
