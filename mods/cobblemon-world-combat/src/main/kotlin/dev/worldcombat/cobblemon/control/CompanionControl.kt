package dev.worldcombat.cobblemon.control

import com.cobblemon.mod.common.Cobblemon
import com.cobblemon.mod.common.entity.pokemon.PokemonEntity
import dev.worldcombat.cobblemon.network.*
import dev.worldcombat.core.runtime.*
import dev.worldcombat.core.world.CombatServices
import dev.worldcombat.core.world.MinecraftCombat
import net.minecraft.server.MinecraftServer
import net.minecraft.server.level.ServerPlayer
import net.minecraft.world.entity.LivingEntity
import net.neoforged.neoforge.network.PacketDistributor
import java.util.IdentityHashMap
import java.util.UUID

object CompanionControl {
    class Body {
        var index = 0
        var memory = "{}"
        var preferences = "{}"
        var actor: ActorHandle? = null
        var epoch = -1L
        var reason = ""
        var pending: ControlCommand? = null
        var pendingUntil = 0L
        var approaching = false
        var approachPosition: Point? = null
        var approachProgress = 0L
        var nextApproach = 0L
        var intent = ""
        var tactics = ""
        var permissions = 0
        var chaseRange = 12
        var intentPoint: Point? = null
        var intentTarget: ActorHandle? = null
        var captureHold: UUID? = null
        var lastManual = 0L
        var blockedUntil = 0L
        val manualActions = mutableSetOf<Long>()
        var lastManualAction = 0L
        var behaviorStage = "idle"
    }
    class Session(val player: ServerPlayer) {
        var sent: ControlState? = null
        val id: UUID = UUID.randomUUID()
        val gate = RequestGate()
        var partySlot = 0
        val members = linkedMapOf<ActorHandle, Body>()
        var body = Body()
        var actor: ActorHandle?
            get() = body.actor
            set(value) { body.actor = value }
        var epoch: Long
            get() = body.epoch
            set(value) { body.epoch = value }
        var reason: String
            get() = body.reason
            set(value) { body.reason = value }
        var pending: ControlCommand?
            get() = body.pending
            set(value) { body.pending = value }
        var pendingUntil: Long
            get() = body.pendingUntil
            set(value) { body.pendingUntil = value }
        var intent: String
            get() = body.intent
            set(value) { body.intent = value }
        var tactics: String
            get() = body.tactics
            set(value) { body.tactics = value }
        var permissions: Int
            get() = body.permissions
            set(value) { body.permissions = value }
        var chaseRange: Int
            get() = body.chaseRange
            set(value) { body.chaseRange = value }
        var intentPoint: Point?
            get() = body.intentPoint
            set(value) { body.intentPoint = value }
        var intentTarget: ActorHandle?
            get() = body.intentTarget
            set(value) { body.intentTarget = value }
        var captureHold: UUID?
            get() = body.captureHold
            set(value) { body.captureHold = value }
        var lastManual: Long
            get() = body.lastManual
            set(value) { body.lastManual = value }
        var blockedUntil: Long
            get() = body.blockedUntil
            set(value) { body.blockedUntil = value }
        var behaviorStage: String
            get() = body.behaviorStage
            set(value) { body.behaviorStage = value }
    }
    private val servers = IdentityHashMap<MinecraftServer, MutableMap<UUID, Session>>()
    fun stop(server: MinecraftServer) {
        servers.remove(server)
    }
    fun isCurrentPlayer(player: ServerPlayer) = player.server.playerList.getPlayer(player.uuid) === player
    fun session(player: ServerPlayer): Session {
        if (!isCurrentPlayer(player)) throw ActionInactiveException("Player session expired")
        val sessions = servers.getOrPut(player.server) { mutableMapOf() }
        val old = sessions[player.uuid]
        return if (old?.player === player) old else Session(player).also { sessions[player.uuid] = it }
    }
    fun tick(server: MinecraftServer) {
        val sessions = servers.getOrPut(server) { mutableMapOf() }
        for ((id, old) in sessions.toMap()) if (server.playerList.getPlayer(id) !== old.player) {
            old.members.keys.forEach { CombatServices.get(server).controlled(it, false) }
            sessions.remove(id)
        }
        for (player in server.playerList.players) advance(session(player))
    }
    fun advance(s: Session) {
        val server = s.player.server
        val combat = CombatServices.get(server)
        refresh(s, combat)
        val selected = s.body
        try {
            for (body in s.members.values.toList()) {
                s.body = body
                val pending = s.pending
                if (pending != null) {
                    if (s.body.approaching) advanceApproach(s, pending, combat)
                    else if (server.tickCount.toLong() > s.pendingUntil) { s.pending = null; s.reason = "queue-expired" }
                    else if (s.actor != null && combat.runtime().readiness(s.actor, CompanionContent.resolve(s.actor, pending.value()).id).isEmpty()) {
                        s.pending = null
                        execute(s, pending, combat)
                    }
                }
                CompanionTactics.tick(s, combat)
            }
        } finally { s.body = selected }
        sync(s)
    }
    private fun refresh(s: Session, combat: MinecraftCombat) {
        val party = Cobblemon.storage.getParty(s.player)
        val epoch = CombatServices.CONTENT.epoch()
        val previous = s.body
        val available = linkedMapOf<Int, Pair<PokemonEntity, ActorHandle>>()
        for (slot in 0..5) {
            val entity = party.get(slot)?.entity ?: continue
            if (entity.level() !== s.player.level() || !entity.isAlive || entity.ownerUUID != s.player.uuid) continue
            val actor = combat.bind(entity)
            if (combat.valid(actor) && combat.mayAct(actor, s.player.uuid)) available[slot] = entity to actor
        }
        val present = available.values.map { it.second }.toSet()
        for ((handle, body) in s.members.toMap()) if (handle !in present || body.epoch != epoch) {
            combat.runtime().interruptPreparation(handle); combat.controlled(handle, false); s.members.remove(handle)
        }
        var index = 0
        for ((_, pair) in available) {
            val (entity, handle) = pair
            val body = s.members.getOrPut(handle) {
                Body().also {
                    it.actor = handle; it.epoch = epoch; it.reason = "ready"
                    s.body = it; CompanionTactics.load(s, entity)
                }
            }
            body.manualActions.removeIf { combat.runtime().state(handle, it) == null }
            body.index = index++
        }
        val selected = available[s.partySlot]?.second?.let(s.members::get)
        s.body = selected ?: if (previous.actor == null && previous.epoch == epoch) previous else Body().also {
            it.epoch = epoch
            val entity = party.get(s.partySlot)?.entity
            it.reason = if (!CombatServices.CONTENT.ready()) "content-unavailable"
                else if (entity != null && entity.isAlive && entity.beamMode == 0) "native-control" else "send-out"
        }
        if (previous !== s.body) {
            if(previous.approaching)previous.actor?.let(combat::stopMovement)
            previous.approaching=false
            previous.pending = null
            previous.actor?.let {
                for (instance in previous.manualActions.toList()) combat.runtime().interruptPreparation(it, instance)
            }
        }
    }
    fun request(player: ServerPlayer, command: ControlCommand) {
        if (!isCurrentPlayer(player)) return
        val s = session(player)
        val combat = CombatServices.get(player.server)
        combat.checkThread()
        refresh(s, combat)
        if (command.session() != s.id) { sync(s, true); return }
        val rejected = s.gate.accept(command.sequence(), player.server.tickCount.toLong(), command.observedTick(), command.operation() == "input-update")
        if (rejected.isNotEmpty()) {
            if (rejected != "old-request") { s.reason = rejected; sync(s, true) }
            return
        }
        try {
            if (!player.isAlive || player.isSpectator) throw ActionRejectedException("actor-left")
            if (command.epoch() != s.epoch) throw ActionRejectedException("content-reloaded")
            if (command.partySlot() !in 0..5) throw ActionRejectedException("invalid-target")
            if (command.operation() == "select") {
                s.partySlot = command.partySlot(); refresh(s, combat)
            } else {
                val actor = s.actor ?: throw ActionRejectedException("send-out")
                if (command.partySlot() != s.partySlot || command.actor() != actor.entity() || command.generation() != actor.generation())
                    throw ActionRejectedException("actor-changed")
                if (!command.direction().length().isFinite() || command.direction().length() < 0.001) throw ActionRejectedException("invalid-target")
                s.lastManual = combat.runtime().now()
                if (command.operation() == "input-update" || command.operation() == "input-stop") {
                    val token = command.version().toLongOrNull() ?: throw ActionRejectedException("invalid-input")
                    val waiting=s.pending
                    if(s.body.approaching && waiting!=null && pendingToken(s)==token) {
                        if(command.operation()=="input-stop") { combat.stopMovement(actor);s.pending=null;s.body.approaching=false;s.reason="cancelled";s.behaviorStage="idle" }
                        else {
                            ActionInput.validate(command.input(),CombatServices.CONTENT.preview(binding(actor,waiting).id).input(),Double.POSITIVE_INFINITY,actor,combat,combat.runtime().effects())
                            s.pending=ControlCommand(waiting.session(),waiting.sequence(),waiting.epoch(),command.observedTick(),waiting.actor(),waiting.generation(),waiting.partySlot(),"cast",waiting.value(),command.target(),command.point(),command.direction(),waiting.version(),command.input())
                        }
                        sync(s,true);return
                    }
                    combat.runtime().control(actor, player.uuid, token, command.input(), command.operation() == "input-stop")
                    sync(s, command.operation() == "input-stop"); return
                }
                if (command.operation() != "cast") {
                    if(s.body.approaching) { combat.stopMovement(actor);s.pending=null;s.body.approaching=false }
                    if(command.operation()=="cancel-cast") { s.pending=null;s.reason="cancelled";s.behaviorStage="idle";sync(s,true);return }
                    CompanionTactics.command(s, command, combat)
                    sync(s, true)
                    return
                }
                if (command.value() !in 0..3) throw ActionRejectedException("invalid-slot")
                val binding = binding(actor, command)
                val definition = binding.definition!!
                val destination=target(s,command,combat)
                combat.runtime().validateInput(definition.id(),actor,destination,player.uuid,true)
                ActionInput.validate(command.input(), CombatServices.CONTENT.preview(binding.id).input(), Double.POSITIVE_INFINITY, actor, combat, combat.runtime().effects())
                if (combat.runtime().cooldown(actor, definition.id()) > 0) throw ActionRejectedException("cooldown")
                val needsApproach=runCatching { validateCast(s,command,combat) }.exceptionOrNull()?.let {
                    if(it is ActionRejectedException && it.reason()=="out-of-range") true else throw it
                } ?: false
                if (needsApproach) {
                    combat.runtime().interruptPreparation(actor,binding.id)
                    s.pending=command;s.body.approaching=true;s.body.approachPosition=combat.position(actor)
                    s.body.approachProgress=player.server.tickCount.toLong();s.body.nextApproach=0
                    s.behaviorStage="approaching";s.reason="approaching"
                    sync(s,true);return
                }
                if(s.body.approaching)combat.stopMovement(actor)
                s.body.approaching=false
                if (!combat.runtime().interruptPreparation(actor, binding.id)) {
                    if (CombatServices.CONTENT.preview(binding.id).input().sustained()) throw ActionRejectedException("busy")
                    s.pending = command
                    s.pendingUntil = player.server.tickCount + 10L
                    s.reason = "queued"
                } else {
                    s.pending = null
                    execute(s, command, combat)
                }
            }
        } catch (rejected: ActionRejectedException) { s.reason = rejected.reason() }
        sync(s, true)
    }
    private fun binding(actor: ActorHandle, command: ControlCommand): SkillBinding {
        val binding = CompanionContent.resolve(actor, command.value())
        if (binding.version != command.version()) throw ActionRejectedException("content-mismatch")
        if (!binding.available()) throw ActionRejectedException(binding.reason)
        return binding
    }
    private fun validateCast(s:Session,command:ControlCommand,combat:MinecraftCombat) {
        val actor=s.actor?:throw ActionRejectedException("actor-left")
        if(actor.entity()!=command.actor()||actor.generation()!=command.generation())throw ActionRejectedException("actor-changed")
        val binding=binding(actor,command);val definition=binding.definition!!
        combat.runtime().validateInput(definition.id(),actor,target(s,command,combat),s.player.uuid)
        if(target(s,command,combat).point().minus(combat.position(actor)).length()>binding.range)throw ActionRejectedException("out-of-range")
        ActionInput.validate(command.input(),CombatServices.CONTENT.preview(definition.id()).input(),binding.range,actor,combat,combat.runtime().effects())
    }
    private fun advanceApproach(s:Session,command:ControlCommand,combat:MinecraftCombat) {
        val actor=s.actor?:return
        fun finish(reason:String) { combat.stopMovement(actor);s.pending=null;s.body.approaching=false;s.reason=reason;s.behaviorStage="idle" }
        try {
            if(command.epoch()!=s.epoch)throw ActionRejectedException("content-mismatch")
            try {
                validateCast(s,command,combat)
                finish("ready");execute(s,command,combat);return
            } catch(e:ActionRejectedException) { if(e.reason()!="out-of-range")throw e }
            if(combat.runtime().claimed(actor,"movement")) { s.body.approachProgress=s.player.server.tickCount.toLong();return }
            val now=s.player.server.tickCount.toLong();val position=combat.position(actor)
            if((s.body.approachPosition?.minus(position)?.length()?:0.0) > .2) { s.body.approachPosition=position;s.body.approachProgress=now }
            if(now-s.body.approachProgress>80) { finish("path-blocked");return }
            if(now<s.body.nextApproach)return
            s.body.nextApproach=now+5
            val binding=binding(actor,command);val definition=binding.definition!!;var goal=target(s,command,combat).point()
            val samples=ActionInput.parse(command.input(),CombatServices.CONTENT.preview(definition.id()).input()).samples()
            samples.maxByOrNull { it.point().minus(position).length() }?.let { if(it.point().minus(position).length()>binding.range)goal=it.point() }
            val moving=combat.navigate(actor,goal,binding.range*.85,1.0)
            if(moving !in setOf("moving","arrived","not-grounded"))finish(moving)
        } catch(e:ActionRejectedException) { finish(e.reason()) }
    }
    private fun execute(s: Session, command: ControlCommand, combat: MinecraftCombat) {
        try {
            val actor = s.actor ?: throw ActionRejectedException("actor-left")
            if (actor.entity() != command.actor() || actor.generation() != command.generation())
                throw ActionRejectedException("actor-changed")
            val binding = binding(actor, command)
            if (command.epoch() != s.epoch)
                throw ActionRejectedException("content-mismatch")
            val instance = combat.runtime().start(binding.id, actor, target(s, command, combat), s.player.uuid,
                if (command.input() == "{}") binding.arguments else binding.arguments + (ActionInput.KEY to command.input()))
            s.body.manualActions.add(instance)
            s.body.lastManualAction = instance
            s.lastManual=combat.runtime().now()
            s.reason = "accepted"
        } catch (rejected: ActionRejectedException) { s.reason = rejected.reason() }
    }
    private fun target(s: Session, command: ControlCommand, combat: MinecraftCombat): ActionTarget {
        return if (command.target() != ControlCommand.NONE) {
            val entity = s.player.serverLevel().getEntity(command.target()) as? LivingEntity
                ?: throw ActionRejectedException("target-left")
            val point=MinecraftCombat.point(entity.boundingBox.center)
            val delta=s.actor?.let { point.minus(combat.position(it)) }
            ActionTarget.entity(combat.bind(entity),point,if(delta!=null&&delta.length()>.001)delta.unit() else command.direction())
        } else ActionTarget.point(command.point(), command.direction())
    }
    fun snapshot(s: Session): ControlState {
        val combat = CombatServices.get(s.player.server)
        val actor = s.actor
        val entity = actor?.let { combat.resolve(it) }
        val state = actor?.let { combat.runtime().state(it) }
        val requestState = actor?.let { combat.runtime().result(it, s.body.lastManualAction) } ?: state
        val references = com.google.gson.JsonObject()
        s.player.serverLevel().getEntitiesOfClass(LivingEntity::class.java, s.player.boundingBox.inflate(32.0))
            .filter { it.isAlive && s.player.hasLineOfSight(it) }.sortedBy { it.uuid.toString() }
            .forEach { references.addProperty(it.uuid.toString(), combat.bind(it).ref()) }
        val skills = (0..3).map { slot ->
            val binding = CompanionContent.resolve(actor, slot)
            val definition = binding.definition
            ControlState.Skill(binding.id, binding.version, definition?.targetKind() ?: "aim", binding.range,
                if (actor == null) 0 else combat.runtime().cooldown(actor, binding.id).toInt(), binding.available(),
                binding.label, binding.remaining, binding.maximum, binding.reason, CombatServices.CONTENT.preview(binding.id))
        }
        return ControlState(s.id, s.gate.lastSequence(), s.epoch, s.player.server.tickCount.toLong(),
            actor?.entity() ?: ControlCommand.NONE, actor?.generation() ?: 0, entity?.id ?: -1, s.partySlot,
            entity?.displayName?.string?.take(128) ?: "", if (actor != null && combat.runtime().busy(actor)) state?.stage() ?: "preparing" else s.behaviorStage,
            if (requestState?.stage() == "cancelled" && s.reason == "accepted") requestState.reason() else s.reason,
            s.intent, s.tactics, s.permissions, s.chaseRange, if (s.intent == "protect") s.intentTarget?.entity() ?: s.player.uuid else ControlCommand.NONE, skills,
            (0..5).mapNotNull { slot ->
                val member = Cobblemon.storage.getParty(s.player).get(slot)?.entity ?: return@mapNotNull null
                val body = s.members.entries.firstOrNull { it.key.entity() == member.uuid }?.value ?: return@mapNotNull null
                ControlState.Member(slot, member.displayName?.string?.take(128) ?: "", body.intent, combat.runtime().state(body.actor)?.stage() ?: body.behaviorStage)
            }, references.toString(), pendingToken(s).takeIf { it>0 } ?: if (actor == null) 0 else combat.runtime().inputToken(actor, s.player.uuid))
    }
    private fun pendingToken(s:Session):Long {
        val command=s.pending?:return 0
        if(!s.body.approaching)return 0
        val spec=CombatServices.CONTENT.preview(CompanionContent.resolve(s.actor,command.value()).id).input()
        return if(spec.sustained())ActionInput.parse(command.input(),spec).token() else 0
    }
    private fun sync(s: Session, force: Boolean = false) {
        val update = snapshot(s)
        val previous = s.sent
        if (force || previous == null || previous.atTick(update.tick(), update.sequence()) != update || update.tick() - previous.tick() >= 20) {
            PacketDistributor.sendToPlayer(s.player, update)
            s.sent = update
        }
    }
}
