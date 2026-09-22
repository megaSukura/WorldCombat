package dev.worldcombat.cobblemon.checks

import com.cobblemon.mod.common.Cobblemon
import com.cobblemon.mod.common.CobblemonEntities
import com.cobblemon.mod.common.api.moves.Moves
import com.cobblemon.mod.common.api.pokemon.PokemonProperties
import com.cobblemon.mod.common.entity.pokemon.PokemonEntity
import com.google.gson.JsonParser
import com.mojang.authlib.GameProfile
import dev.worldcombat.cobblemon.control.CompanionControl
import dev.worldcombat.cobblemon.network.ControlCommand
import dev.worldcombat.cobblemon.review.ReviewTool
import dev.worldcombat.core.checks.TestWorld
import dev.worldcombat.core.runtime.Point
import dev.worldcombat.core.world.CombatServices
import net.minecraft.server.MinecraftServer
import net.minecraft.server.level.ServerPlayer
import net.minecraft.world.entity.Mob
import net.minecraft.world.entity.ai.attributes.Attributes
import net.neoforged.neoforge.common.util.FakePlayerFactory
import java.util.UUID

/** Native manual order, staged sword-type damage, displayed stats and control-only wild AI in one scene. */
object RuntimeReviewChecks {
    private var age=0;private var done=false
    private lateinit var player:ServerPlayer
    private lateinit var attacker:ServerPlayer
    private lateinit var subject:PokemonEntity
    private lateinit var target:Mob
    private lateinit var wild:PokemonEntity
    private var lease:AutoCloseable?=null
    private var attackerLease:AutoCloseable?=null
    private var damage=0f;private var pp=0;private var began=0.0;private var wildPp=0
    private fun command(op:String,slot:Int=0) {
        val s=CompanionControl.session(player);val snap=CompanionControl.snapshot(s);val body=s.actor!!
        val at=Point(target.x,target.y+target.bbHeight/2,target.z)
        CompanionControl.request(player,ControlCommand(s.id,s.gate.lastSequence()+1,s.epoch,player.server.tickCount.toLong(),body.entity(),body.generation(),s.partySlot,op,slot,target.uuid,at,Point(1.0,0.0,0.0),snap.skills()[slot].version(),"{}"))
    }
    private fun stats(entity:net.minecraft.world.entity.LivingEntity,json:String):com.google.gson.JsonObject {
        val combat=CombatServices.get(player.server);val actor=combat.bind(entity)
        return JsonParser.parseString(combat.runtime().event("checks:review/stats",actor,null,json,true).data()).asJsonObject
    }
    @JvmStatic fun tick(server:MinecraftServer) {
        if(done||!CombatServices.CONTENT.ready())return
        try {
            when(age++) {
                0 -> {
                    player=FakePlayerFactory.get(server.overworld(),GameProfile(UUID.randomUUID(),"CoreReview"));lease=TestWorld.mockOwner(server,player)
                    attacker=FakePlayerFactory.get(server.overworld(),GameProfile(UUID.randomUUID(),"MeleeOpponent"));attackerLease=TestWorld.mockOwner(server,attacker)
                    PokemonServerChecks.initializeTestData(player.uuid);server.playerList.op(player.gameProfile)
                    ReviewTool.handle(player,"""{"op":"setup","move":"tackle","mode":"free","variant":"mob","species":"bulbasaur","level":50,"setup":{}}""")
                }
                50 -> {
                    subject=Cobblemon.storage.getParty(player).first{it.persistentData.getBoolean("WorldCombatReviewFixture")}.entity!!
                    target=server.overworld().getEntitiesOfClass(Mob::class.java,subject.boundingBox.inflate(25.0)).first{it!==subject}
                    CompanionControl.advance(CompanionControl.session(player));command("hold")
                    val before=subject.health;subject.invulnerableTime=0;subject.hurt(attacker.damageSources().playerAttack(attacker),8f);damage=before-subject.health;check(damage>0) { "Native enemy-player melee was rejected, beam=${subject.beamMode}" }
                    ReviewTool.heal(subject)
                    val result=stats(subject,"""{"stat":"def","amount":2}""")
                    check(result.get("defence").asDouble==subject.pokemon.defence*2.0) { "Panel does not include stages: $result" }
                    check(result.get("formulaDefence").asDouble==result.get("defence").asDouble) { "Formula and panel disagree: $result" }
                    val raised=subject.health;subject.invulnerableTime=0;subject.hurt(attacker.damageSources().playerAttack(attacker),8f)
                    check(raised-subject.health<damage) { "Defence stages did not reduce the same native melee hit" }
                    ReviewTool.heal(subject)
                    val attack=target.getAttributeValue(Attributes.ATTACK_DAMAGE)
                    check(stats(target,"""{"stat":"atk","amount":2}""").getAsJsonObject("stages").get("atk").asInt==2)
                    check(target.getAttributeValue(Attributes.ATTACK_DAMAGE)>attack) { "Non-Pokemon stage did not reach MC attributes" }
                    println("REVIEWCHECK native damage, live panel/formula stages and ordinary-mob attribute stages passed")
                    target.moveTo(subject.x+12,subject.y,subject.z);began=subject.x;pp=subject.pokemon.moveSet.get(0)!!.currentPp
                    command("cast")
                    check(CompanionControl.session(player).body.approaching) { "Out-of-range manual cast did not queue approach: ${CompanionControl.session(player).reason}" }
                    check(subject.pokemon.moveSet.get(0)!!.currentPp==pp) { "Approach spent PP before casting" }
                }
                205 -> {
                    check(subject.x>began+1) { "Manual order did not move the companion" }
                    check(subject.pokemon.moveSet.get(0)!!.currentPp<pp && target.health<target.maxHealth) { "Approach never completed its cast: ${CompanionControl.session(player).reason}" }
                    target.moveTo(subject.x+14,subject.y,subject.z);command("cast");command("cancel-cast")
                    check(CompanionControl.session(player).pending==null && !CompanionControl.session(player).body.approaching)
                    val pokemon=PokemonProperties.parse("whismur level=50").create();pokemon.moveSet.clear();pokemon.moveSet.setMove(0,Moves.getByName("screech")!!.create())
                    wild=PokemonEntity(server.overworld(),pokemon,CobblemonEntities.POKEMON);wild.moveTo(target.x+3,target.y,target.z);server.overworld().addFreshEntity(wild)
                    wild.target=target;wildPp=pokemon.moveSet.get(0)!!.currentPp;CombatServices.get(server).bind(wild)
                    println("REVIEWCHECK approach -> cast -> damage, deferred PP cost and cancellation passed")
                }
                335 -> {
                    check(wild.pokemon.moveSet.get(0)!!.currentPp<wildPp) { "Control-only wild loadout never used its move against the native AI target" }
                    println("REVIEWCHECK PASS: manual approach/cast/cancel, native melee protection, live stats and formulas, MC attribute boosts, native hostility and control-only wild casting")
                    done=true;ReviewTool.clearFixtures();wild.discard();attackerLease?.close();lease?.close();server.commands.performPrefixedCommand(server.createCommandSourceStack(),"stop")
                }
            }
            if(!done&&::player.isInitialized)CompanionControl.advance(CompanionControl.session(player))
        }catch(e:Throwable){done=true;e.printStackTrace();println("REVIEWCHECK FAIL at $age: $e");attackerLease?.close();lease?.close();server.commands.performPrefixedCommand(server.createCommandSourceStack(),"stop")}
    }
}
