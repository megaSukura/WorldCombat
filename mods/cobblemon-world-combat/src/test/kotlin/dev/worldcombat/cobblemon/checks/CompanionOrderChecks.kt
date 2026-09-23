package dev.worldcombat.cobblemon.checks

import com.cobblemon.mod.common.Cobblemon
import com.cobblemon.mod.common.api.moves.Moves
import com.cobblemon.mod.common.api.pokemon.PokemonProperties
import com.cobblemon.mod.common.entity.pokemon.PokemonEntity
import com.mojang.authlib.GameProfile
import dev.worldcombat.cobblemon.control.CompanionControl
import dev.worldcombat.cobblemon.network.ControlCommand
import dev.worldcombat.core.checks.TestWorld
import dev.worldcombat.core.runtime.Point
import dev.worldcombat.core.world.CombatServices
import net.minecraft.core.BlockPos
import net.minecraft.server.MinecraftServer
import net.minecraft.server.level.ServerPlayer
import net.minecraft.world.entity.EntityType
import net.minecraft.world.entity.Mob
import net.minecraft.world.entity.ai.attributes.Attributes
import net.minecraft.world.level.block.Blocks
import net.minecraft.world.phys.Vec3
import net.neoforged.neoforge.common.util.FakePlayerFactory
import java.util.UUID

/** Full companion composition, a large native flyer and a distant ordinary target. */
object CompanionOrderChecks {
    private var age=0; private var phase=0; private var since=0; private var done=false
    private lateinit var player:ServerPlayer; private lateinit var subject:PokemonEntity; private lateinit var target:Mob
    private lateinit var session:CompanionControl.Session
    private var lease:AutoCloseable?=null
    private val station=Point(4.5,101.0,8.5)
    private var originalDistance=0.0
    private fun next(value:Int){phase=value;since=age}
    private fun request(operation:String,point:Point=station) {
        val actor=checkNotNull(session.actor)
        CompanionControl.request(player,ControlCommand(session.id,session.gate.lastSequence()+1,session.epoch,
            player.server.tickCount.toLong(),actor.entity(),actor.generation(),session.partySlot,operation,0,
            if(operation=="focus")target.uuid else ControlCommand.NONE,point,Point(1.0,0.0,0.0),"","{}"))
    }
    @JvmStatic fun tick(server:MinecraftServer) {
        if(done||!CombatServices.CONTENT.ready())return
        try {
            check(++age<600){"Order check timed out: phase=$phase reason=${if(::session.isInitialized)session.reason else "init"}"}
            val combat=CombatServices.get(server)
            if(phase==0) {
                val level=TestWorld.prepare(server)
                for(cx in 0..2)for(cz in 0..1)level.setChunkForced(cx,cz,true)
                for(x in 0..36)for(z in 0..22) {
                    level.setBlockAndUpdate(BlockPos(x,99,z),Blocks.STONE.defaultBlockState())
                    for(y in 100..108)level.setBlockAndUpdate(BlockPos(x,y,z),Blocks.AIR.defaultBlockState())
                }
                player=FakePlayerFactory.get(level,GameProfile(UUID.randomUUID(),"CompanionOrders"))
                player.moveTo(4.0,100.0,9.0,0f,0f);lease=TestWorld.mockOwner(server,player)
                PokemonServerChecks.initializeTestData(player.uuid)
                val pokemon=PokemonProperties.parse("charizard level=50").create()
                pokemon.moveSet.clear();pokemon.moveSet.setMove(0,checkNotNull(Moves.getByName("aerialace")).create())
                check(Cobblemon.storage.getParty(player).add(pokemon))
                subject=checkNotNull(pokemon.sendOut(level,Vec3(4.0,100.0,6.0),null))
                target=TestWorld.mob(EntityType.IRON_GOLEM,level,25.0)
                target.moveTo(25.0,100.0,6.0,0f,0f)
                target.getAttribute(Attributes.MAX_HEALTH)!!.baseValue=1000.0;target.health=1000f
                session=CompanionControl.session(player);next(1)
            }
            CompanionControl.advance(session)
            when(phase) {
                1 -> if(age-since>=50) {
                    request("stay");check(session.intent=="stay")
                    originalDistance=subject.distanceTo(target).toDouble()
                    request("focus",Point(target.x,target.y+1,target.z))
                    check(session.intent=="focus"){"Distant focus rejected: ${session.reason}"};next(2)
                }
                2 -> {
                    check(age-since<250){"Large flyer never closed range: ${session.reason}; ${subject.position()}"}
                    if(combat.runtime().cooldown(session.actor,"world_combat:aerialace")>0) {
                        check(subject.distanceTo(target)<originalDistance-5){"Cast happened without native pursuit"}
                        target.kill();next(3)
                    }
                }
                3 -> if(age-since>=12) {
                    check(session.intent=="stay" && session.intentTarget==null && session.intentPoint==station) {
                        "Dead focus did not restore original command: ${session.intent}, ${session.reason}"
                    }
                    next(4)
                }
                4 -> if(subject.position().distanceTo(Vec3(station.x(),subject.y,station.z()))<3.5) {
                    println("P5CHECK PASS companion orders: large native flyer pursued beyond move AI range, cast in range, target death restored previous station and returned")
                    done=true;subject.discard();target.discard();lease?.close();server.halt(false)
                }
            }
        }catch(error:Throwable) {
            done=true;println("P5CHECK FAIL companion orders phase=$phase age=$age: $error")
            error.printStackTrace();runCatching{lease?.close()};server.halt(false)
        }
    }
}
