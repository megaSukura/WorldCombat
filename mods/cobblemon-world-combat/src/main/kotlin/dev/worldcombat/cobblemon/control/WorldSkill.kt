package dev.worldcombat.cobblemon.control

import dev.worldcombat.core.runtime.*

/** Native loadout binding retained inside the caller's world scope. */
class WorldSkill(private val world: WorldAccess, private val slot: Int) {
    private fun binding(): SkillBinding { world.check(); return CompanionContent.resolve(world.source(), slot) }
    fun id() = binding().id
    fun kind() = binding().definition?.targetKind() ?: ""
    fun range() = binding().range
    fun ready(): Boolean { val value = binding(); return value.available() && world.readiness(value.id).isEmpty() }
    fun cast(target: ActorHandle?, point: Point, direction: Point): Boolean = submit(target, point, direction) > 0
    /** Exact accepted instance, including an action which finished synchronously; zero means refused. */
    fun submit(target: ActorHandle?, point: Point, direction: Point): Long {
        if (!ready()) return 0
        val value = binding()
        val args = com.google.gson.JsonObject()
        value.arguments.forEach { (key, item) -> args.addProperty(key, item) }
        return try { world.cast(value.id, target, point, direction, args.toString()) }
            catch (_: ActionRejectedException) { 0 }
    }
}
