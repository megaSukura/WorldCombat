package dev.worldcombat.cobblemon.checks

import com.cobblemon.mod.common.Cobblemon
import com.cobblemon.mod.common.api.moves.BenchedMove
import com.cobblemon.mod.common.api.moves.Moves
import com.cobblemon.mod.common.api.pokemon.PokemonProperties
import com.cobblemon.mod.common.entity.pokemon.PokemonEntity
import com.google.gson.JsonParser
import com.mojang.authlib.GameProfile
import dev.worldcombat.cobblemon.script.PokemonView
import dev.worldcombat.core.checks.TestWorld
import dev.worldcombat.core.runtime.ActionTarget
import dev.worldcombat.core.runtime.Point
import dev.worldcombat.core.world.CombatServices
import dev.worldcombat.core.world.MinecraftCombat
import net.minecraft.server.MinecraftServer
import net.minecraft.server.level.ClientInformation
import net.minecraft.server.level.ServerPlayer
import net.minecraft.core.BlockPos
import net.minecraft.world.level.block.Blocks
import net.minecraft.world.effect.MobEffectInstance
import net.minecraft.world.effect.MobEffects
import net.minecraft.world.entity.ai.attributes.Attributes
import net.minecraft.world.phys.Vec3
import net.neoforged.neoforge.common.util.FakePlayerFactory
import java.util.UUID

/** Loads the production profile and learns legal native moves; never replaces a recipe or damage handler. */
object VerdantSupportChecks {
    private val moves = listOf("protect", "substitute", "helpinghand", "ingrain", "amnesia", "gigadrain", "venoshock", "endure")
    private var age = 0
    private var index = 0
    private var start = -1
    private var next = 25
    private var done = false
    private var observed = false
    private var preparing = false
    private var recovery = false
    private var pp = 0
    private var hp = 0
    private var targetHp = 0
    private var movement = 0.0
    private var enduranceHealth = 0F
    private var lastTargetHealth = 0
    private val targetDamagePulses = mutableListOf<Int>()
    private lateinit var actor: PokemonEntity
    private lateinit var ally: PokemonEntity
    private lateinit var target: PokemonEntity
    private lateinit var owner: ServerPlayer
    private var ownerLease: AutoCloseable? = null

    private fun hit(combat: MinecraftCombat, victim: PokemonEntity, amount: Double) {
        victim.invulnerableTime = 0
        combat.damage(combat.bind(target), combat.bind(victim), null, amount,
            "{\"kind\":\"support-check\",\"bypassCooldown\":true,\"type\":\"normal\"}")
    }
    private fun feedback(combat: MinecraftCombat, kind: String): Boolean =
        JsonParser.parseString(combat.presentations().snapshot(owner)).asJsonArray.any { scene ->
            val value = scene.asJsonObject
            value.get("type").asString == "world_combat:feedback" && value.getAsJsonObject("data").get("kind")?.asString == kind
        }

    @JvmStatic fun tick(server: MinecraftServer) {
        if (done || !CombatServices.CONTENT.ready()) return
        val combat = CombatServices.get(server)
        try {
            if (age++ == 0) {
                val level = TestWorld.prepare(server)
                // Real knockback needs floor beyond the narrow shared fixture platform.
                for (chunkX in -1..1) for (chunkZ in -1..0) level.setChunkForced(chunkX, chunkZ, true)
                for (x in -6..20) for (z in -6..12) level.setBlockAndUpdate(BlockPos(x, 99, z), Blocks.STONE.defaultBlockState())
                level.dayTime = 6000
                level.setWeatherParameters(12000, 0, false, false)
                val profile = GameProfile(UUID.randomUUID(), "P5SupportRecipes")
                owner = ServerPlayer(server, level, profile, ClientInformation.createDefault()).also {
                    it.connection = FakePlayerFactory.get(level, profile).connection
                    it.moveTo(2.0, 100.0, 4.0, 0F, 0F)
                }
                ownerLease = TestWorld.mockOwner(server, owner)
                PokemonServerChecks.initializeTestData(owner.uuid)
                fun send(properties: String, position: Vec3, owned: Boolean): PokemonEntity {
                    val pokemon = PokemonProperties.parse(properties).create()
                    if (owned) check(Cobblemon.storage.getParty(owner).add(pokemon))
                    return pokemon.sendOut(level, position, null)!!.also { it.setNoAi(true); it.setPersistenceRequired() }
                }
                actor = send("venusaur level=50", Vec3(3.0, 100.0, 2.5), true)
                ally = send("bulbasaur level=50", Vec3(3.0, 100.0, 4.7), true)
                target = send("blissey level=100", Vec3(8.0, 100.0, 2.5), false)
                for (name in moves) {
                    val move = Moves.getByName(name)!!
                    check(move in actor.pokemon.form.moves.getAllLegalMoves()) { "$name absent from the actual non-legacy learnset" }
                    actor.pokemon.benchedMoves.add(BenchedMove(move, 0))
                    check(PokemonView.capture(actor).canAccessMove(name)) { "$name not available through native memory" }
                }
                return
            }
            if (age < next) return
            check(kotlin.math.abs(actor.maxHealth - actor.pokemon.maxHealth.toFloat()) < 0.1F) { "Formal support caster did not retain native HP capacity" }
            if (index >= moves.size) {
                ownerLease?.close(); done = true
                println("P5CHECK PASS verdant support 8 production recipes, native legal memory/PP, finite defence, destructible substitute, vanilla support, rooting, drain, poison combination and lethal endurance")
                return
            }
            val move = moves[index]
            val handle = combat.bind(actor)
            if (start < 0) {
                check(actor.isAlive && ally.isAlive && target.isAlive) { "A fixture body left between recipes: actor=${actor.position()}/${actor.pokemon.currentHealth}, ally=${ally.position()}/${ally.pokemon.currentHealth}, target=${target.position()}/${target.pokemon.currentHealth}" }
                actor.removeAllEffects(); ally.removeAllEffects(); target.removeAllEffects()
                actor.pokemon.heal(); ally.pokemon.heal(); target.pokemon.heal()
                actor.moveTo(3.0, 100.0, 2.5, 0F, 0F)
                ally.moveTo(3.0, 100.0, 4.7, 0F, 0F)
                target.moveTo(8.0, 100.0, 2.5, 0F, 0F)
                actor.deltaMovement = Vec3.ZERO; ally.deltaMovement = Vec3.ZERO; target.deltaMovement = Vec3.ZERO
                // Native NoAI suppresses its grounded movement update; rooting must settle with real physics.
                actor.setNoAi(move != "ingrain")
                if (move == "ingrain") {
                    actor.move(net.minecraft.world.entity.MoverType.SELF, Vec3(0.0, -0.05, 0.0))
                    check(actor.onGround()) { "Rooting fixture did not settle onto its stone floor" }
                }
                if (move == "ingrain" || move == "gigadrain") actor.pokemon.currentHealth = actor.pokemon.maxHealth / 2
                if (move == "amnesia") {
                    actor.addEffect(MobEffectInstance(MobEffects.MOVEMENT_SLOWDOWN, 160, 0))
                    actor.addEffect(MobEffectInstance(MobEffects.WEAKNESS, 160, 0))
                }
                if (move == "venoshock") target.addEffect(MobEffectInstance(MobEffects.POISON, 160, 0))
                actor.pokemon.moveSet.setMove(0, Moves.getByName(move)!!.create())
                val native = PokemonView.capture(actor).move(0)!!
                pp = native.pp(); hp = actor.pokemon.currentHealth; targetHp = target.pokemon.currentHealth
                lastTargetHealth = targetHp; targetDamagePulses.clear()
                movement = actor.getAttributeValue(Attributes.MOVEMENT_SPEED)
                val destination = when (move) {
                    "protect", "helpinghand" -> combat.bind(ally)
                    "gigadrain", "venoshock" -> combat.bind(target)
                    else -> handle
                }
                val point = if (move == "substitute") Point(5.5, 100.0, 4.6) else combat.position(destination)
                val delta = point.minus(combat.position(handle))
                val direction = if (delta.length() < 0.01) Point(1.0, 0.0, 0.0) else delta.unit()
                val input = if (move in setOf("protect", "helpinghand", "gigadrain", "venoshock")) ActionTarget.entity(destination, point, direction)
                    else ActionTarget.point(point, direction)
                combat.runtime().start("world_combat:$move", handle, input, owner.uuid,
                    mapOf("native-slot" to "0", "native-move" to native.key(), "native-design" to move, "native-selection" to "native"))
                check(actor.pokemon.moveSet[0]!!.currentPp == pp) { "$move spent PP before preparation" }
                start = age; observed = false; preparing = false; recovery = false
            }
            val state = combat.runtime().state(handle)
            val targetNow = target.pokemon.currentHealth
            if (targetNow < lastTargetHealth) targetDamagePulses += lastTargetHealth - targetNow
            lastTargetHealth = targetNow
            if (state.stage() == "preparing") preparing = true
            if (state.stage() == "recovering") recovery = true
            if (!observed) when (move) {
                "protect" -> if (combat.runtime().effects().query(combat.bind(ally), "world_combat:guard").isNotEmpty()) {
                    val shield = combat.runtime().effects().query(combat.bind(ally), "world_combat:guard")[0]
                    val capacity = JsonParser.parseString(shield.data()).asJsonObject.get("capacity").asDouble
                    val before = ally.health; val nativeBefore = ally.pokemon.currentHealth
                    hit(combat, ally, 2.0)
                    val remaining = combat.runtime().effects().query(combat.bind(ally), "world_combat:guard").firstOrNull()
                    val remainingCapacity = remaining?.let { JsonParser.parseString(it.data()).asJsonObject.get("capacity").asDouble } ?: 0.0
                    val fractionalLoss = before - ally.health
                    println("P5CHECK shield request=2.0 expectedReduced=0.5 worldLoss=$fractionalLoss nativeLoss=${nativeBefore - ally.pokemon.currentHealth} capacity=$capacity->$remainingCapacity scale=${PokemonView.capture(ally).healthScale()} hp=$before->${ally.health}")
                    val integralBefore = ally.health; val integralNativeBefore = ally.pokemon.currentHealth
                    hit(combat, ally, 8.0)
                    println("P5CHECK shield request=8.0 expectedReduced=2.0 worldLoss=${integralBefore - ally.health} nativeLoss=${integralNativeBefore - ally.pokemon.currentHealth}")
                    check(kotlin.math.abs(capacity - remainingCapacity - 1.5) < 0.001) { "Finite shield did not intercept exactly 75% of the incoming request" }
                    check(fractionalLoss > 0 && fractionalLoss < 1.5F) { "The finite shield's reduced 0.5 damage was lost by native HP projection: worldLoss=$fractionalLoss nativeBefore=$nativeBefore" }
                    check(kotlin.math.abs(integralBefore - ally.health - 2F) < 0.01F) { "Finite shield failed the native 8-to-2 damage comparison" }
                    hit(combat, ally, capacity * 2.0)
                    check(combat.runtime().effects().query(combat.bind(ally), "world_combat:guard").isEmpty()) { "Repeated hits did not exhaust the shield" }
                    observed = true
                }
                "substitute" -> {
                    val effects = combat.runtime().effects().query(handle, "world_combat:substitute")
                    if (effects.isNotEmpty()) {
                        check(actor.pokemon.currentHealth < hp && combat.helpers().count() == 1) { "Substitute did not exchange native health for its helper" }
                        val ref = JsonParser.parseString(effects[0].data()).asJsonObject.get("helper").asString
                        val helper = server.overworld().getEntity(UUID.fromString(ref.substringBefore('/'))) as net.minecraft.world.entity.LivingEntity
                        val before = actor.pokemon.currentHealth; val bodyBefore = helper.health
                        hit(combat, actor, 2.0)
                        check(actor.pokemon.currentHealth == before && helper.health < bodyBefore) { "Damage did not reach the actual substitute body" }
                        check(feedback(combat, "guard")) { "Actual substitute damage produced no readable absorption result" }
                        combat.damage(combat.bind(target), combat.bind(helper), null, 100.0,
                            "{\"kind\":\"support-check\",\"bypassCooldown\":true,\"knockback\":false}")
                        check(!helper.isAlive && feedback(combat, "break")) { "Breaking the real helper produced no distinct break feedback" }
                        actor.invulnerableTime = 0; hit(combat, actor, 1.0)
                        check(actor.pokemon.currentHealth < before) { "A broken substitute continued to absorb damage" }
                        observed = true
                    }
                }
                "helpinghand" -> if (ally.hasEffect(MobEffects.DAMAGE_BOOST)) {
                    check(ally.getAttributeValue(Attributes.ATTACK_DAMAGE) > ally.getAttribute(Attributes.ATTACK_DAMAGE)!!.baseValue) {
                        "Helping hand did not affect the actual native attack attribute"
                    }
                    check(combat.runtime().effects().query(combat.bind(ally), "cobblemon_world_combat:modifier").isEmpty()) { "Helping hand duplicated the native strength attribute with a script stage" }
                    observed = true
                }
                "ingrain" -> if (combat.runtime().effects().query(handle, "world_combat:rooting").isNotEmpty()) {
                    check(actor.getAttributeValue(Attributes.MOVEMENT_SPEED) < movement * 0.01) { "Rooting did not retain a real movement restriction" }
                    if (actor.pokemon.currentHealth > hp) observed = true
                }
                "amnesia" -> if (actor.hasEffect(MobEffects.DAMAGE_RESISTANCE)) {
                    check(!actor.hasEffect(MobEffects.MOVEMENT_SLOWDOWN) && !actor.hasEffect(MobEffects.WEAKNESS)) { "Amnesia did not clear the selected vanilla interference" }
                    observed = true
                }
                "gigadrain" -> if (actor.pokemon.currentHealth > hp && target.pokemon.currentHealth < targetHp) observed = true
                "venoshock" -> if (target.pokemon.currentHealth < targetHp && !target.hasEffect(MobEffects.POISON) && target.pokemon.status == null) {
                    check(feedback(combat, "toxin-consumed")) { "Actual poison consumption produced no readable consumption feedback" }
                    observed = true
                }
                "endure" -> if (combat.runtime().effects().query(handle, "world_combat:guard").isNotEmpty()) {
                    hit(combat, actor, actor.health + 20.0)
                    check(actor.isAlive && actor.pokemon.currentHealth > 0 && actor.health > 0) { "Endure failed against a real lethal native damage request" }
                    check(actor.pokemon.currentHealth == 1) { "Endure did not leave its promised last native HP: ${actor.pokemon.currentHealth}/${actor.health}" }
                    check(combat.runtime().effects().query(handle, "world_combat:guard").isEmpty()) { "Endure did not spend its one charge" }
                    enduranceHealth = actor.health; observed = true
                }
            }
            if (age - start > 230) error("$move did not terminate")
            if (age > start + 2 && !combat.runtime().busy(handle)) {
                check(state.stage() == "finished") { "$move ended ${state.stage()}: ${state.reason()}" }
                check(preparing && recovery && observed) { "$move missed a native effect or action stage: prepare=$preparing recovery=$recovery effect=$observed" }
                check(actor.pokemon.moveSet[0]!!.currentPp == pp - 1) { "$move did not settle exactly one native PP" }
                if (move == "ingrain") check(actor.getAttributeValue(Attributes.MOVEMENT_SPEED) >= movement * 0.99) { "Completed rooting leaked its movement restriction" }
                if (move == "gigadrain") check(targetDamagePulses.size == 3) {
                    "Giga drain did not settle all three actual native HP pulses: $targetDamagePulses"
                }
                if (move == "endure") {
                    check(actor.isAlive && actor.health >= enduranceHealth * 0.99F) { "Native health synchronization lost endurance's remaining health" }
                    hit(combat, actor, 100.0)
                    check(actor.pokemon.currentHealth == 0 || !actor.isAlive) { "Endure protected against a second lethal hit after its charge was spent" }
                }
                println("P5CHECK support $move passed in ${age - start} ticks")
                index++; start = -1; next = if (index == moves.size) age + 1 else age + 220
            }
        } catch (error: Throwable) {
            done = true; ownerLease?.close()
                    println("P5CHECK FAIL verdant support ${moves.getOrNull(index)} age=$age ${error.message}; actor=${if (::actor.isInitialized) "${actor.position()} ground=${actor.onGround()}" else "uninitialized"}")
            error.printStackTrace()
        }
    }
}
