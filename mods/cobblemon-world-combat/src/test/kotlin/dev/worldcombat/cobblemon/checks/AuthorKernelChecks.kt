package dev.worldcombat.cobblemon.checks

import com.cobblemon.mod.common.Cobblemon
import com.cobblemon.mod.common.api.pokemon.PokemonProperties
import com.google.gson.JsonObject
import com.google.gson.JsonParser
import com.mojang.authlib.GameProfile
import dev.worldcombat.core.checks.TestWorld
import dev.worldcombat.core.world.CombatServices
import dev.worldcombat.core.world.NativeEquipment
import dev.worldcombat.core.world.NativeRegistryFacts
import dev.worldcombat.core.world.WorldEquipment
import net.minecraft.core.BlockPos
import net.minecraft.core.component.DataComponents
import net.minecraft.network.chat.Component
import net.minecraft.server.MinecraftServer
import net.minecraft.world.entity.EntityType
import net.minecraft.world.entity.EquipmentSlot
import net.minecraft.world.entity.LivingEntity
import net.minecraft.world.entity.ai.attributes.Attributes
import net.minecraft.world.item.ItemStack
import net.minecraft.world.item.Items
import net.minecraft.world.level.block.Blocks
import net.minecraft.world.phys.Vec3
import net.neoforged.neoforge.common.util.FakePlayerFactory
import java.util.UUID

/** Exercises native state and script integration in one private server; no client window. */
object AuthorKernelChecks {
    private var age = 0
    private var done = false
    private lateinit var body: LivingEntity
    private var ownerLease: AutoCloseable? = null
    private var baseAttack = 0.0
    private var leasedBlock = BlockPos.ZERO
    private fun run(server: MinecraftServer, actor: LivingEntity, json: String): JsonObject {
        val combat = CombatServices.get(server)
        return JsonParser.parseString(combat.runtime().event("checks:author/kernel", combat.bind(actor), null, json, true).data()).asJsonObject
    }
    private fun close(a: Double, b: Double) { check(kotlin.math.abs(a-b)<1e-5) { "$a != $b" } }
    @JvmStatic fun tick(server: MinecraftServer) {
        if(done || !CombatServices.CONTENT.ready()) return
        try {
            val level=server.overworld(); val combat=CombatServices.get(server)
            when(age++) {
                0 -> {
                    level.getChunk(0,0)
                    body=EntityType.ZOMBIE.create(level)!!; body.moveTo(0.5,-60.0,0.5); (body as net.minecraft.world.entity.Mob).isNoAi=true
                    level.addFreshEntity(body); combat.bind(body)
                    baseAttack=body.getAttributeValue(Attributes.ATTACK_DAMAGE)
                    run(server,body,"""{"op":"window","amount":1,"ticks":8}""")
                    run(server,body,"""{"op":"window","amount":1,"ticks":30}""")
                    check(run(server,body,"""{"op":"inspect"}""").get("stage").asInt==2)
                    close(body.getAttributeValue(Attributes.ATTACK_DAMAGE),baseAttack*2)
                    run(server,body,"""{"op":"base","amount":1}""")
                    close(body.getAttributeValue(Attributes.ATTACK_DAMAGE),baseAttack*2.5)
                    check(run(server,body,"""{"op":"native"}""").get("unknown").asBoolean)
                    leasedBlock=BlockPos(3,-61,0)
                    check(level.getBlockState(leasedBlock).`is`(Blocks.GRASS_BLOCK))
                    val terrain=run(server,body,"""{"op":"terrain","cells":[{"x":3,"y":-61,"z":0,"block":"minecraft:stone"},{"x":3,"y":-61,"z":0,"block":"minecraft:dirt"},{"x":0,"y":-60,"z":0,"block":"minecraft:stone"}]}""")
                    check(terrain.getAsJsonArray("placed").size()==1) { "Partial terrain: $terrain" }
                    check(terrain.getAsJsonArray("skipped").size()>=1)
                    check(level.getBlockState(leasedBlock).`is`(Blocks.STONE))
                    inventory(server)
                    val carrier=EntityType.PIG.create(level)!!;carrier.moveTo(8.0,-60.0,0.0);level.addFreshEntity(carrier)
                    run(server,carrier,"""{"op":"detached"}""");carrier.discard()
                    check(run(server,body,"""{"op":"areas"}""").get("count").asInt==1)
                    println("REVIEWCHECK overlapping native stage projection, partial terrain, resource sound and inventory passed")
                }
                12 -> {
                    check(run(server,body,"""{"op":"inspect"}""").get("stage").asInt==2)
                    close(body.getAttributeValue(Attributes.ATTACK_DAMAGE),baseAttack*2)
                    check(level.getBlockState(leasedBlock).`is`(Blocks.GRASS_BLOCK))
                    run(server,body,"""{"op":"reset"}""")
                    close(body.getAttributeValue(Attributes.ATTACK_DAMAGE),baseAttack)
                    check(run(server,body,"""{"op":"inspect"}""").get("stage").asInt==0)
                    party(server)
                    check(run(server,body,"""{"op":"areas"}""").get("count").asInt==1)
                }
                40 -> {
                    close(body.getAttributeValue(Attributes.ATTACK_DAMAGE),baseAttack)
                    check(run(server,body,"""{"op":"areas"}""").get("count").asInt==0)
                    println("REVIEWCHECK PASS: native stage windows sum/expire/reset, terrain partial/duplicate/restore, resource sound, equipment CAS and native party revive/switch")
                    done=true;ownerLease?.close();server.halt(false)
                }
            }
        } catch(e:Throwable) { done=true;e.printStackTrace();println("REVIEWCHECK FAIL at $age: $e");ownerLease?.close();server.halt(false) }
    }
    private fun inventory(server:MinecraftServer) {
        val level=server.overworld();val combat=CombatServices.get(server)
        val other=EntityType.ZOMBIE.create(level)!!;other.moveTo(6.0,-60.0,0.0);other.isNoAi=true;level.addFreshEntity(other)
        val a=combat.bind(body);val b=combat.bind(other)
        val stack=ItemStack(Items.APPLE,4);stack.set(DataComponents.CUSTOM_NAME,Component.literal("Component kept"));body.setItemSlot(EquipmentSlot.MAINHAND,stack)
        val expected=NativeRegistryFacts.stack(level.registryAccess(),stack).serialized()
        val swap=NativeEquipment.exchangeOp(combat,a,"minecraft","mainhand",0,expected,b,"minecraft","mainhand",0,"")
        check(swap.ok());check(body.mainHandItem.isEmpty);check(ItemStack.matches(other.mainHandItem,stack))
        check(!NativeEquipment.takeOp(combat,a,"minecraft","mainhand",0,expected).ok())
        val moved=NativeEquipment.takeOp(combat,b,"minecraft","mainhand",0,expected,1)
        check(moved.ok()&&moved.count()==1&&other.mainHandItem.count==3)
        check(other.mainHandItem.get(DataComponents.CUSTOM_NAME)?.string=="Component kept")
        var live=ItemStack(Items.DIAMOND)
        val stock=live.copy()
        val slot=object:WorldEquipment.Slot {
            override fun stock()=stock.copy()
            override fun fresh()=ItemStack.matches(stock,live)
            override fun preflight(incoming:ItemStack,incomingDroppable:Boolean):String? { live=ItemStack(Items.GOLD_INGOT);return null }
            override fun commit(finalStack:ItemStack):Boolean { live=finalStack;return true }
            override fun settle(finalStack:ItemStack){live=finalStack}
        }
        check(!WorldEquipment.takeFrom(slot).ok());check(live.`is`(Items.GOLD_INGOT)) { "Pre-event mutation was overwritten" }
    }
    private fun party(server:MinecraftServer) {
        val owner=FakePlayerFactory.get(server.overworld(),GameProfile(UUID.randomUUID(),"KernelParty"))
        ownerLease=TestWorld.mockOwner(server,owner);PokemonServerChecks.initializeTestData(owner.uuid)
        owner.moveTo(20.0,-60.0,0.0)
        val store=Cobblemon.storage.getParty(owner)
        val first=PokemonProperties.parse("rattata level=20").create();val second=PokemonProperties.parse("rattata level=20").create()
        store.add(first);store.add(second)
        val entity=first.sendOut(server.overworld(),Vec3(16.5,-60.0,0.5),null)!!
        CombatServices.get(server).bind(entity)
        val combat=CombatServices.get(server);val a=combat.bind(body);val b=combat.bind(entity)
        val apples=ItemStack(Items.APPLE,32);apples.set(DataComponents.CUSTOM_NAME,Component.literal("One of thirty-two"));body.setItemSlot(EquipmentSlot.MAINHAND,apples)
        val expected=NativeRegistryFacts.stack(server.registryAccess(),apples).serialized()
        check(!NativeEquipment.exchangeOp(combat,a,"minecraft","mainhand",0,expected,b,"cobblemon","held",0,"").ok())
        check(body.mainHandItem.count==32&&first.heldItem().isEmpty)
        check(NativeEquipment.exchangeOp(combat,a,"minecraft","mainhand",0,expected,b,"cobblemon","held",0,"",1).ok())
        check(body.mainHandItem.count==31&&first.heldItem().count==1)
        check(first.heldItem().get(DataComponents.CUSTOM_NAME)?.string=="One of thirty-two")
        second.currentHealth=0
        check(run(server,entity,"""{"op":"revive","slot":1}""").get("ok").asBoolean)
        check(second.currentHealth==(second.maxHealth/2.0).let{ kotlin.math.ceil(it).toInt() })
        val switched=run(server,entity,"""{"op":"switch","slot":1}""")
        check(switched.get("ok").asBoolean) { "Native switch: $switched" }
        check(first.entity==null || first.entity!!.isRemoved);check(second.entity!=null)
    }
}
