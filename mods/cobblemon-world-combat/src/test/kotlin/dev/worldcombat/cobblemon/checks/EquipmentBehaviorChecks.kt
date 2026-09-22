package dev.worldcombat.cobblemon.checks

import com.cobblemon.mod.common.api.pokemon.Natures
import com.cobblemon.mod.common.api.pokemon.PokemonProperties
import com.mojang.authlib.GameProfile
import dev.worldcombat.cobblemon.script.PokemonView
import dev.worldcombat.core.checks.TestWorld
import dev.worldcombat.core.runtime.*
import dev.worldcombat.core.world.*
import net.minecraft.server.MinecraftServer
import net.minecraft.server.level.ClientInformation
import net.minecraft.server.level.ServerPlayer
import net.minecraft.world.item.ItemStack
import net.minecraft.world.item.Items
import net.neoforged.neoforge.common.NeoForge
import net.neoforged.neoforge.common.util.FakePlayerFactory
import top.theillusivec4.curios.api.CuriosApi
import top.theillusivec4.curios.api.SlotContext
import java.util.UUID
import java.util.function.Consumer

/** Real Curios storage/validation/active slots feed the shipped script behavior contribution. */
object EquipmentBehaviorChecks {
    private var age = 0
    private var done = false
    private lateinit var owner: ServerPlayer
    private var lease: AutoCloseable? = null
    private var observed = ""
    private var changes = 0
    private val listener = Consumer<CombatEquipmentChangedEvent> { if (::owner.isInitialized && it.entity === owner) changes++ }
    private lateinit var individual: com.cobblemon.mod.common.pokemon.Pokemon
    @JvmStatic fun result(value: String) { observed = value }
    @JvmStatic fun pokemon() = PokemonView.capture(individual)
    @JvmStatic fun natures() = Natures.all().map { it.name.path }.toTypedArray()
    private fun probe(server: MinecraftServer, radius: Int) {
        observed = ""
        val combat = CombatServices.get(server)
        combat.runtime().start("checks:equipment", combat.bind(owner), ActionTarget.point(Point(4.0, 100.0, 4.0), Point(1.0,0.0,0.0)), owner.uuid)
        val data = com.google.gson.JsonParser.parseString(observed).asJsonObject
        check(data["radius"].asInt == radius) { "Equipment did not change production exploration: $observed" }
        check(data["risk"].asDouble == -.2) { "Mint changed behavior nature: $observed" }
        check(data["covered"].asInt == Natures.all().size) { "A registered native nature has no behavior definition: $observed" }
    }
    private fun finish() { done = true; NeoForge.EVENT_BUS.unregister(listener); if (::owner.isInitialized) owner.discard(); lease?.close() }
    @JvmStatic fun tick(server: MinecraftServer) {
        if (done || !CombatServices.CONTENT.ready()) return
        try {
            age++
            when (age) {
                1 -> {
                    check(net.neoforged.fml.ModList.get().isLoaded("curios")) { "Use the pinned optional Curios test runtime" }
                    val level = TestWorld.prepare(server)
                    individual = PokemonProperties.parse("bulbasaur level=30 nature=timid").create()
                    val profile = GameProfile(UUID.randomUUID(), "P5EquipmentOwner")
                    owner = ServerPlayer(server, level, profile, ClientInformation.createDefault()).also {
                        it.connection = FakePlayerFactory.get(level, profile).connection
                        it.moveTo(4.0, 100.0, 4.0, 0F, 0F)
                    }
                    lease = TestWorld.mockOwner(server, owner); level.addNewPlayer(owner)
                    NeoForge.EVENT_BUS.addListener(listener)
                }
                20 -> {
                    probe(server, 5)
                    val inventory = CuriosApi.getCuriosInventory(owner).orElseThrow()
                    val slot = inventory.getStacksHandler("training_charm").orElseThrow()
                    val compass = ItemStack(Items.COMPASS)
                    check(CuriosApi.isStackValid(SlotContext("training_charm", owner, 0, false, true), compass))
                    check(!CuriosApi.isStackValid(SlotContext("training_charm", owner, 0, false, true), ItemStack(Items.STONE)))
                    slot.stacks.setStackInSlot(0, compass)
                }
                24 -> {
                    probe(server, 8); check(changes > 0) { "Native equip event was not bridged" }
                    individual.mintedNature = Natures.BRAVE
                    check(individual.effectiveNature == Natures.BRAVE && individual.nature == Natures.TIMID)
                    val slot = CuriosApi.getCuriosInventory(owner).orElseThrow().getStacksHandler("training_charm").orElseThrow()
                    slot.activeStates[0] = false
                    probe(server, 5)
                    slot.activeStates[0] = true
                    slot.stacks.setStackInSlot(0, ItemStack.EMPTY)
                    if (slot.hasCosmetic()) slot.cosmeticStacks.setStackInSlot(0, ItemStack(Items.COMPASS))
                }
                28 -> {
                    probe(server, 5)
                    val slot = CuriosApi.getCuriosInventory(owner).orElseThrow().getStacksHandler("training_charm").orElseThrow()
                    slot.stacks.setStackInSlot(0, ItemStack(Items.COMPASS))
                }
                32 -> {
                    probe(server, 8)
                    val inventory = CuriosApi.getCuriosInventory(owner).orElseThrow()
                    val saved = inventory.saveInventory(true)
                    probe(server, 5)
                    inventory.loadInventory(saved)
                }
                36 -> {
                    probe(server, 8)
                    val combat = CombatServices.get(server); val actor = combat.bind(owner)
                    var live = true
                    val scope = WorldAccess(combat.runtime(), actor, owner.uuid, { check(live) }, false, 0)
                    check(scope.equipment(actor).any { it.provider() == "curios" && it.item() == "minecraft:compass" })
                    live = false; check(runCatching { scope.equipment(actor) }.isFailure)
                    val charm = CuriosApi.getCuriosInventory(owner).orElseThrow().getStacksHandler("training_charm").orElseThrow()
                    charm.stacks.setStackInSlot(0, ItemStack(Items.COMPASS, 5))
                    val observed = NativeRegistryFacts.serializeStack(owner.registryAccess(), charm.stacks.getStackInSlot(0))
                    val partial = NativeEquipment.takeOp(combat, actor, "curios", "training_charm", 0, observed, 2)
                    check(partial.ok() && partial.count() == 2 && partial.reason().isEmpty()) { "Curios partial take: ${partial.json()}" }
                    check(charm.stacks.getStackInSlot(0).count == 3) { "Curios partial take lost the source remainder" }
                    val stale = NativeEquipment.takeOp(combat, actor, "curios", "training_charm", 0, observed, 1)
                    check(!stale.ok() && stale.reason() == "stale") { "A stale snapshot was not refused: ${stale.json()}" }
                    finish()
                    println("P5CHECK PASS equipment: actual Curios slot validation/equip/remove/active/cosmetic/NBT restoration and native event; partial CAS take keeps the remainder and a stale snapshot is refused; production exploration 5->8->5; 25 natures and minted numeric nature isolated")
                }
            }
        } catch (error: Throwable) { finish(); println("P5CHECK FAIL equipment at $age: ${error.message}"); error.printStackTrace() }
    }
}
