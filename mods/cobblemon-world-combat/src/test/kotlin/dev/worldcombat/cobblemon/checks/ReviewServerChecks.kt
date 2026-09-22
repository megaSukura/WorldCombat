package dev.worldcombat.cobblemon.checks

import com.cobblemon.mod.common.Cobblemon
import com.cobblemon.mod.common.entity.pokemon.PokemonEntity
import com.mojang.authlib.GameProfile
import dev.worldcombat.cobblemon.control.CompanionControl
import dev.worldcombat.cobblemon.review.ReviewTool
import dev.worldcombat.cobblemon.script.NativeContentData
import dev.worldcombat.core.checks.TestWorld
import dev.worldcombat.core.world.CombatServices
import net.minecraft.server.MinecraftServer
import net.minecraft.server.level.ServerPlayer
import net.minecraft.world.InteractionHand
import net.minecraft.world.entity.Mob
import net.minecraft.world.level.GameType
import net.neoforged.neoforge.common.util.FakePlayerFactory
import net.neoforged.neoforge.event.entity.player.PlayerInteractEvent
import java.nio.file.Files
import java.util.UUID
import com.google.gson.*

/** One private server run for the changed review flow; UI feel and move quality are judged in play. */
object ReviewServerChecks {
    private var age=0
    private var done=false
    private lateinit var player: ServerPlayer
    private var lease: AutoCloseable?=null
    private var first: UUID?=null
    private fun request(json:String)=ReviewTool.handle(player,json)
    private fun saved()=JsonParser.parseString(Files.readString(player.server.serverDirectory.resolve("config/worldcombat/review.json"))).asJsonObject
    private fun fixture(): PokemonEntity = Cobblemon.storage.getParty(player).first { it.persistentData.getBoolean("WorldCombatReviewFixture") }.entity ?: error("Review fixture is recalled")
    @JvmStatic fun tick(server: MinecraftServer) {
        if(done || !CombatServices.CONTENT.ready()) return
        try {
            when(age++) {
                0 -> {
                    player=FakePlayerFactory.get(server.overworld(),GameProfile(UUID.randomUUID(),"ReviewCheck"))
                    lease=TestWorld.mockOwner(server,player); PokemonServerChecks.initializeTestData(player.uuid)
                    server.playerList.op(player.gameProfile)
                    request("""{"op":"ready"}""")
                    check(ReviewTool.mode()=="free")
                    check(player.inventory.items.any(ReviewTool::tool))
                    player.inventory.selected=8
                    val click=PlayerInteractEvent.RightClickItem(player,InteractionHand.MAIN_HAND)
                    ReviewTool.interact(click);check(click.isCanceled) { "Review handbook did not consume right-click" }
                    request("""{"op":"setup","move":"tackle","mode":"free","variant":"mob","species":"bulbasaur","level":35,"moves":"protect,growl","setup":{"count":1,"mob":"minecraft:iron_golem","targetSpecies":"blissey","targetLevel":50,"targetMoves":"tackle"}}""")
                }
                55 -> {
                    val entity=fixture();first=entity.uuid
                    check(!ReviewTool.hold(entity)) { "Free play suppresses companion commands" }
                    check(entity.ownerUUID==player.uuid && entity.pokemon.level==35)
                    check(entity.pokemon.moveSet.get(0)?.name=="tackle" && entity.pokemon.moveSet.get(1)?.name=="protect")
                    check(server.overworld().getEntitiesOfClass(Mob::class.java,entity.boundingBox.inflate(20.0)).any{it!==entity && it.isNoAi})
                    check(NativeContentData.compare(entity.pokemon,mapOf("checks:preferences/workflow" to NativeContentData.Change(null,"{\"flag\":true}"))))
                    CompanionControl.advance(CompanionControl.session(player));check(CompanionControl.session(player).actor?.entity()==entity.uuid)
                    request("""{"op":"player-mode","value":"survival"}""")
                    request("""{"op":"kit"}""")
                    request("""{"op":"feedback","move":"tackle","id":"source","text":"多行反馈\n可以编辑","remember":true}""")
                    request("""{"op":"feedback","move":"absorb","id":"copy","text":"多行反馈\n已经调整","remember":true}""")
                    request("""{"op":"mark","status":"issue"}""")
                    val data=saved();check(data.get("cursor").asString=="tackle") { "Feedback advanced the move" }
                    check(data.getAsJsonObject("moves").getAsJsonObject("tackle").getAsJsonArray("feedback")[0].asJsonObject.get("text").asString.endsWith("可以编辑"))
                    check(data.getAsJsonArray("feedbackLibrary").size()==2)
                    request("""{"op":"arena","action":"add-target","variant":"pokemon","setup":{"targetSpecies":"blissey","targetLevel":50,"targetMoves":"tackle"}}""")
                }
                70 -> {
                    check(player.gameMode.gameModeForPlayer==GameType.SURVIVAL) { "Runtime forced the player back into observation mode" }
                    check(server.overworld().getEntitiesOfClass(PokemonEntity::class.java,fixture().boundingBox.inflate(30.0)).any{it!==fixture() && it.pokemon.species.name.equals("Blissey",true)})
                    request("""{"op":"repeat"}""")
                }
                115 -> {
                    check(fixture().uuid!=first)
                    check(NativeContentData.read(fixture().pokemon,"checks:preferences/workflow")=="{\"flag\":true}")
                    check(Cobblemon.storage.getParty(player).count{it.persistentData.getBoolean("WorldCombatReviewFixture")}==1)
                    request("""{"op":"setup","move":"tackle","mode":"duel","species":"bulbasaur","level":20,"setup":{}}""")
                }
                155 -> {
                    check(Cobblemon.storage.getParty(player).none{it.persistentData.getBoolean("WorldCombatReviewFixture")}) { "Player duel left an owned test companion" }
                    check(player.gameMode.gameModeForPlayer==GameType.SURVIVAL)
                    check(server.overworld().getEntitiesOfClass(PokemonEntity::class.java,player.boundingBox.inflate(30.0)).any{it.ownerUUID==null && it.target===player})
                    request("""{"op":"setup","move":"absorb","mode":"free","variant":"pokemon","species":"bulbasaur","level":35,"setup":{"friendly":true}}""")
                }
                200 -> {
                    check(fixture().pokemon.moveSet.get(0)?.name=="absorb")
                    check(!ReviewTool.hold(fixture()))
                    val data=saved();check(data.getAsJsonObject("moves").getAsJsonObject("absorb").getAsJsonArray("feedback")[0].asJsonObject.get("text").asString.endsWith("已经调整"))
                    request("""{"op":"feedback","move":"absorb","id":"copy","delete":true}""")
                    check(saved().getAsJsonObject("moves").getAsJsonObject("absorb").getAsJsonArray("feedback").isEmpty)
                    ReviewTool.clearFixtures();lease?.close();lease=null;done=true
                    println("REVIEWCHECK PASS: right-click tool, free owned companion/control, target replacement without reset, free player/duel, loadout/preferences retention, editable feedback copy isolation and no forced advancement")
                    server.commands.performPrefixedCommand(server.createCommandSourceStack(),"stop")
                }
            }
            if(!done && ::player.isInitialized) CompanionControl.advance(CompanionControl.session(player))
        } catch(e:Throwable) {
            done=true;e.printStackTrace();println("REVIEWCHECK FAIL at $age: $e");lease?.close();lease=null
            server.commands.performPrefixedCommand(server.createCommandSourceStack(),"stop")
        }
    }
}
