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
import net.minecraft.world.level.ClipContext
import net.minecraft.world.phys.HitResult
import net.neoforged.neoforge.network.PacketDistributor
import java.util.IdentityHashMap
import java.util.UUID

object CompanionControl {
    class Body(val worldDriven: Boolean = false) {
        var lastWorldTick = -1L
        var index = 0
        var slot = 0
        var memory = "{}"
        var preferences = "{}"
        var actor: ActorHandle? = null
        var epoch = -1L
        var reason = ""
        var pending: ControlCommand? = null
        var pendingReason = ""
        var approaching = false
        var approachPosition: Point? = null
        var approachProgress = 0L
        var nextApproach = 0L
        var approachGoal: Point? = null
        var lastTargetPoint: Point? = null
        var pendingTarget: ActorHandle? = null
        var targetAnchor: Point? = null
        var lastTargetSeen = 0L
        var searchStarted = -1L
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
        var lastPartySlot = 0
        private val pastureSlots = linkedMapOf<UUID, Int>()
        fun pastureSlot(id: UUID): Int = pastureSlots.getOrPut(id) { 6 + pastureSlots.size }
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
        PastureControl.stop(server)
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
            old.members.values.forEach { detach(old, it, CombatServices.get(server)) }
            sessions.remove(id)
        }
        for (player in server.playerList.players) advance(session(player))
        PastureControl.tick(server)
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
                    advanceApproach(s, pending, combat)
                }
                if (!body.worldDriven) CompanionTactics.tick(s, combat)
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
        dev.worldcombat.cobblemon.script.NativePasture.owned(s.player)
            .forEach { entity ->
                val actor = combat.bind(entity)
                if (combat.valid(actor) && combat.mayAct(actor, s.player.uuid)) available[s.pastureSlot(entity.pokemon.uuid)] = entity to actor
            }
        val present = available.values.map { it.second }.toSet()
        for ((handle, body) in s.members.toMap()) if (handle !in present || body.epoch != epoch) {
            detach(s, body, combat); s.members.remove(handle)
        }
        var index = 0
        for ((slot, pair) in available) {
            val (entity, handle) = pair
            val body = s.members.getOrPut(handle) {
                if (entity.tethering != null) PastureControl.body(combat, entity) else Body().also {
                    it.actor = handle; it.epoch = epoch; it.reason = "ready"
                    s.body = it; CompanionTactics.load(s, entity)
                }
            }
            body.manualActions.removeIf { combat.runtime().state(handle, it) == null }
            body.index = index++
            body.slot = slot
        }
        if (s.partySlot >= 6 && s.partySlot !in available) s.partySlot = s.lastPartySlot
        val selected = available[s.partySlot]?.second?.let(s.members::get)
        s.body = selected ?: if (previous.actor == null && previous.epoch == epoch) previous else Body().also {
            it.epoch = epoch
            val entity = s.partySlot.takeIf { it in 0..5 }?.let { party.get(it)?.entity }
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
    private fun detach(s: Session, body: Body, combat: MinecraftCombat) {
        val actor = body.actor ?: return
        if (!body.worldDriven) {
            combat.runtime().interruptPreparation(actor); combat.controlled(actor, false)
        } else {
            val selected = s.body
            try {
                s.body = body
                if (body.pending != null) clearPending(s, combat, "cancelled")
                body.manualActions.forEach { combat.runtime().interruptPreparation(actor, it) }
            } finally { s.body = selected }
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
            if (command.operation() == "select-individual") {
                val party = Cobblemon.storage.getParty(player)
                val slot = (0..5).firstOrNull { party.get(it)?.uuid == command.target() }
                    ?: s.members.values.firstOrNull { it.actor?.identity() == command.target() }?.slot
                    ?: throw ActionRejectedException("invalid-target")
                s.partySlot = slot
                if (slot < 6) s.lastPartySlot = slot
                refresh(s, combat)
            } else if (command.operation() == "select") {
                if (command.partySlot() !in 0..5) throw ActionRejectedException("invalid-target")
                s.lastPartySlot = command.partySlot()
                s.partySlot = command.partySlot(); refresh(s, combat)
            } else {
                val actor = s.actor ?: throw ActionRejectedException("send-out")
                if (command.partySlot() != s.partySlot || command.actor() != actor.entity() || command.generation() != actor.generation())
                    throw ActionRejectedException("actor-changed")
                if (!command.direction().length().isFinite() || command.direction().length() < 0.001) throw ActionRejectedException("invalid-target")
                if (command.operation() == "input-update" || command.operation() == "input-stop" || command.operation() == "input-release") {
                    val token = command.version().toLongOrNull() ?: throw ActionRejectedException("invalid-input")
                    val waiting=s.pending
                    if(waiting!=null && pendingToken(s)==token) {
                        if(command.operation()!="input-update") { clearPending(s,combat,"cancelled") }
                        else {
                            ActionInput.validate(command.input(),CombatServices.CONTENT.preview(binding(actor,waiting).id).input(),Double.POSITIVE_INFINITY,actor,combat,combat.runtime().effects())
                            val revised=ControlCommand(waiting.session(),waiting.sequence(),waiting.epoch(),command.observedTick(),waiting.actor(),waiting.generation(),waiting.partySlot(),"cast",waiting.value(),command.target(),command.point(),command.direction(),waiting.version(),command.input())
                            val destination=target(s,revised,combat)
                            s.body.pendingTarget=destination.entity();s.body.targetAnchor=destination.entity()?.let { combat.bounds(it).anchor(destination.point()) }
                            s.pending=revised
                        }
                        sync(s,true);return
                    }
                    if (command.operation() == "input-release") combat.runtime().releaseInput(actor, player.uuid, token, command.input())
                    else combat.runtime().control(actor, player.uuid, token, command.input(), command.operation() == "input-stop")
                    sync(s, command.operation() != "input-update"); return
                }
                if (command.operation() != "cast") {
                    clearPending(s,combat,"cancelled")
                    if(command.operation()=="cancel-cast") { sync(s,true);return }
                    s.lastManual = combat.runtime().now()
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
                // Reserving input is passive. Movement belongs to the normal order until
                // this action is ready and actually needs a position from which to cast.
                clearPending(s,combat,"")
                val now=player.server.tickCount.toLong()
                s.pending=command
                s.body.pendingTarget=destination.entity();s.body.targetAnchor=destination.entity()?.let { combat.bounds(it).anchor(destination.point()) }
                s.body.lastTargetPoint=destination.point();s.body.lastTargetSeen=now
                s.body.nextApproach=0;s.body.approachGoal=null;s.body.searchStarted=-1
                advanceApproach(s,command,combat)
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
        val destination=target(s,command,combat)
        if(destination.entity()!=null && !observedAt(s,destination.entity(),destination.point(),combat))throw ActionRejectedException("target-not-visible")
        combat.runtime().validateInput(definition.id(),actor,destination,s.player.uuid)
        val rangePoint=destination.entity()?.let { combat.closestPoint(it,combat.position(actor)) }?:destination.point()
        if(rangePoint.minus(combat.position(actor)).length()>binding.range)throw ActionRejectedException("out-of-range")
        val preview=CombatServices.CONTENT.preview(definition.id())
        if(preview.lineOfSight() && !combat.clear(actor,combat.position(actor),destination.point()))throw ActionRejectedException("path-blocked")
        ActionInput.validate(command.input(),preview.input(),binding.range,actor,combat,combat.runtime().effects())
    }
    private fun advanceApproach(s:Session,command:ControlCommand,combat:MinecraftCombat) {
        val actor=s.actor?:return
        fun finish(reason:String) {
            clearPending(s,combat,reason)
        }
        try {
            if(command.epoch()!=s.epoch)throw ActionRejectedException("content-mismatch")
            val now=s.player.server.tickCount.toLong();val binding=binding(actor,command)
            val positioning=try { validateCast(s,command,combat);"" }
                catch(e:ActionRejectedException) { if(e.reason() in setOf("out-of-range","path-blocked","target-not-visible"))e.reason() else throw e }
            val readiness=combat.runtime().readiness(actor,binding.id)
            if(positioning=="target-not-visible" && now-s.body.lastTargetSeen>60){finish("target-not-visible");return}
            if(readiness.isNotEmpty()) {
                if(readiness !in setOf("cooldown","busy"))throw ActionRejectedException(readiness)
                if(s.body.approaching && !combat.runtime().claimed(actor,"movement"))combat.stopMovement(actor)
                s.body.approaching=false;s.body.searchStarted=-1;s.body.approachGoal=null
                s.body.pendingReason=waitingReason(readiness);s.reason=s.body.pendingReason
                return
            }
            if(positioning.isEmpty()) {
                val selected=target(s,command,combat)
                beginManual(s,combat);finish("ready");execute(s,command,combat,selected);return
            }
            // The rider owns positioning. Preserve the actual range/sight refusal instead of asking
            // native navigation to take over and turning it into an unrelated mounted-control error.
            val entity = combat.resolve(actor)
            if (entity?.isVehicle == true || entity?.isPassenger == true) { finish(positioning); return }
            if(combat.runtime().claimed(actor,"movement") || combat.runtime().claimed(actor,"aim")) {
                s.body.pendingReason="waiting-action";s.reason=s.body.pendingReason;return
            }
            if(!s.body.approaching) {
                beginManual(s,combat)
                s.body.approaching=true;s.body.approachPosition=combat.position(actor);s.body.approachProgress=now
                s.body.nextApproach=0;s.body.searchStarted=-1
            }
            val position=combat.position(actor)
            val destination=target(s,command,combat)
            var goal=if(positioning=="out-of-range"&&destination.entity()!=null)combat.closestPoint(destination.entity(),position) else destination.point()
            var within=binding.range*.85
            if(positioning=="target-not-visible") {
                if(now-s.body.lastTargetSeen>60){finish("target-not-visible");return}
                goal=s.body.lastTargetPoint?:throw ActionRejectedException("target-not-visible")
                within=.8
            } else if(positioning=="path-blocked") {
                if(s.body.searchStarted<0)s.body.searchStarted=now
                if(now-s.body.searchStarted>80){finish("path-blocked");return}
                val previous=s.body.approachGoal
                if(previous==null || previous.minus(position).length()<=.8) {
                    s.body.approachGoal=clearPosition(combat,actor,position,goal)
                }
                // Navigation still uses the native pathfinder; a waypoint only asks for a nearby line of fire.
                goal=s.body.approachGoal?:goal;within=if(s.body.approachGoal!=null).7 else .8
            } else {
                s.body.searchStarted=-1;s.body.approachGoal=null
                val samples=ActionInput.parse(command.input(),CombatServices.CONTENT.preview(binding.id).input()).samples()
                samples.maxByOrNull { it.point().minus(position).length() }?.let { if(it.point().minus(position).length()>binding.range)goal=it.point() }
            }
            if((s.body.approachPosition?.minus(position)?.length()?:0.0)>.2){s.body.approachPosition=position;s.body.approachProgress=now}
            if(now-s.body.approachProgress>80){finish(if(positioning=="target-not-visible")positioning else "path-blocked");return}
            s.behaviorStage=if(positioning=="target-not-visible")"searching" else "approaching";s.reason="approaching"
            if(now<s.body.nextApproach)return
            s.body.nextApproach=now+5
            val moving=combat.navigate(actor,goal,within,1.0)
            if(moving !in setOf("moving","arrived","not-grounded")) {
                if(positioning=="path-blocked"){s.body.approachGoal=null;return}
                finish(moving)
            }
        } catch(e:ActionRejectedException){finish(e.reason())}
    }
    private fun clearPending(s:Session,combat:MinecraftCombat,reason:String) {
        val actor=s.actor
        if(s.body.approaching && actor!=null && !combat.runtime().claimed(actor,"movement"))combat.stopMovement(actor)
        if(s.body.approaching)s.behaviorStage="idle"
        s.pending=null;s.body.approaching=false;s.body.approachGoal=null;s.body.pendingReason=""
        s.body.pendingTarget=null;s.body.targetAnchor=null
        if(reason.isNotEmpty())s.reason=reason
    }
    private fun beginManual(s:Session,combat:MinecraftCombat) {
        s.lastManual=combat.runtime().now();s.body.pendingReason=""
        if(s.body.intent=="work") {
            s.body.intent="follow";s.body.intentTarget=null;s.body.intentPoint=null
        }
    }
    private fun waitingReason(readiness:String)=if(readiness=="cooldown")"waiting-cooldown" else "waiting-action"
    private fun clearPosition(combat:MinecraftCombat,actor:ActorHandle,origin:Point,target:Point):Point? {
        val delta=target.minus(origin)
        val length=kotlin.math.sqrt(delta.x()*delta.x()+delta.z()*delta.z()).coerceAtLeast(.001)
        val side=Point(-delta.z()/length,0.0,delta.x()/length)
        for(distance in listOf(2.0,4.0))for(sign in listOf(1.0,-1.0)) {
            val candidate=origin.plus(side.scale(distance*sign))
            if(combat.clear(actor,candidate,target))return candidate
        }
        return null
    }
    private fun observed(s:Session,actor:ActorHandle,combat:MinecraftCombat):Boolean {
        val entity=combat.resolve(actor)?:return false
        return s.actor==actor || s.actor?.let { combat.visible(it,actor) }==true || s.player.hasLineOfSight(entity)
    }
    private fun observedAt(s:Session,actor:ActorHandle,point:Point,combat:MinecraftCombat):Boolean {
        if(observed(s,actor,combat))return true
        if(combat.resolve(actor)==null)return false
        val at=combat.closestPoint(actor,point)
        return s.player.serverLevel().clip(ClipContext(s.player.eyePosition,MinecraftCombat.vec(at),
            ClipContext.Block.COLLIDER,ClipContext.Fluid.NONE,s.player)).type==HitResult.Type.MISS
    }
    private fun execute(s: Session, command: ControlCommand, combat: MinecraftCombat, selected: ActionTarget) {
        try {
            val actor = s.actor ?: throw ActionRejectedException("actor-left")
            if (actor.entity() != command.actor() || actor.generation() != command.generation())
                throw ActionRejectedException("actor-changed")
            val binding = binding(actor, command)
            if (command.epoch() != s.epoch)
                throw ActionRejectedException("content-mismatch")
            val instance = combat.runtime().start(binding.id, actor, selected, s.player.uuid,
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
            val handle=combat.bind(entity)
            if(!entity.isAlive)throw ActionRejectedException("target-left")
            val pending=s.pending===command
            if(pending&&s.body.pendingTarget!=handle)throw ActionRejectedException("target-left")
            val aimed=if(pending&&s.body.targetAnchor!=null)combat.bounds(handle).at(s.body.targetAnchor!!) else combat.closestPoint(handle,command.point())
            val visible=observedAt(s,handle,aimed,combat)
            val point=if(visible)aimed
                else if(pending)s.body.lastTargetPoint?:throw ActionRejectedException("target-not-visible")
                else throw ActionRejectedException("target-not-visible")
            if(pending&&visible){s.body.lastTargetPoint=point;s.body.lastTargetSeen=s.player.server.tickCount.toLong()}
            val delta=s.actor?.let { point.minus(combat.position(it)) }
            ActionTarget.entity(handle,point,if(delta!=null&&delta.length()>.001)delta.unit() else command.direction())
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
            if (s.pending!=null && !s.body.approaching) s.body.pendingReason
                else if (requestState?.stage() == "cancelled" && s.reason == "accepted") requestState.reason() else s.reason,
            s.intent, s.tactics, s.permissions, s.chaseRange, if (s.intent == "protect") s.intentTarget?.entity() ?: s.player.uuid else ControlCommand.NONE, skills,
            s.members.values.sortedBy { it.slot }.mapNotNull { body ->
                val member = body.actor?.let { combat.resolve(it) as? PokemonEntity } ?: return@mapNotNull null
                ControlState.Member(body.slot, member.pokemon.uuid, member.displayName?.string?.take(128) ?: "", body.intent,
                    combat.runtime().state(body.actor)?.stage() ?: body.behaviorStage, body.slot >= 6)
            }, references.toString(), pendingToken(s).takeIf { it>0 } ?: if (actor == null) 0 else combat.runtime().inputToken(actor, s.player.uuid),
            (entity as? PokemonEntity)?.pokemon?.uuid ?: ControlCommand.NONE)
    }
    private fun pendingToken(s:Session):Long {
        val command=s.pending?:return 0
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
