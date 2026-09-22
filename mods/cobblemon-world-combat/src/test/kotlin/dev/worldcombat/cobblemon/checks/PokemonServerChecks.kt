package dev.worldcombat.cobblemon.checks

import com.cobblemon.mod.common.Cobblemon
import com.cobblemon.mod.common.api.Priority
import com.cobblemon.mod.common.api.events.CobblemonEvents
import com.cobblemon.mod.common.api.pokemon.PokemonProperties
import com.cobblemon.mod.common.api.pokemon.experience.SidemodExperienceSource
import com.cobblemon.mod.common.battles.*
import com.cobblemon.mod.common.entity.pokemon.PokemonEntity
import com.cobblemon.mod.common.pokemon.Pokemon
import com.mojang.authlib.GameProfile
import dev.worldcombat.cobblemon.LegacyBattleGate
import dev.worldcombat.cobblemon.PokemonCombatDomain
import dev.worldcombat.core.checks.TestWorld
import dev.worldcombat.core.runtime.ActorHandle
import dev.worldcombat.core.world.CombatCommands
import dev.worldcombat.core.world.CombatServices
import net.minecraft.nbt.NbtAccounter
import net.minecraft.nbt.NbtIo
import net.minecraft.server.MinecraftServer
import net.minecraft.world.level.storage.LevelResource
import net.minecraft.world.phys.Vec3
import net.neoforged.neoforge.common.util.FakePlayerFactory
import java.util.UUID
import kotlin.math.abs

object PokemonServerChecks {
    private var age = 0
    private var done = false
    private lateinit var victor: Pokemon
    private lateinit var foe: Pokemon
    private lateinit var actor: PokemonEntity
    private lateinit var target: PokemonEntity
    private lateinit var oldHandle: ActorHandle
    private val owner = UUID.randomUUID()
    private lateinit var player: net.minecraft.server.level.ServerPlayer
    private var mockOwner: AutoCloseable? = null
    private var experienceBefore = 0
    private var expectedReward = 0
    private var rewardEvents = 0
    private var reloadEpoch = 0L
    @Volatile private var reloadDone = false
    private const val ACTION = "cobblemon_world_combat:training_bolt"

    @JvmStatic
    fun tick(server: MinecraftServer) {
        if (done) return
        try {
            age++
            val combat = CombatServices.get(server)
            val level = server.overworld()
            if (age == 1) {
                TestWorld.prepare(server)
                check(LegacyBattleGate.prewarmSkipped.get() >= 1) { "Legacy prewarm observer still ran" }
                check(CombatServices.CONTENT.get(ACTION) != null) { "Domain script missing" }
                player = FakePlayerFactory.get(level, GameProfile(owner, "WorldCombatCheck"))
                player.moveTo(2.0, 100.0, 0.0, 0F, 0F)
                mockOwner = TestWorld.mockOwner(server, player)
                initializeTestData(owner)
                victor = PokemonProperties.parse("bulbasaur level=6").create()
                val party = Cobblemon.storage.getParty(owner, server.registryAccess())
                check(party.add(victor)) { "Could not add test partner to its original party store" }
                victor.addExperience(SidemodExperienceSource("worldcombat_check"), victor.getExperienceToNextLevel() - 1)
                actor = send(victor, server, 2.0)
                foe = PokemonProperties.parse("rattata level=3").create()
                target = send(foe, server, 9.0)
                val fake = FakePlayerFactory.get(level, GameProfile(owner, "WorldCombatCheck"))
                val outsider = FakePlayerFactory.get(level, GameProfile(UUID.randomUUID(), "OtherCheck"))
                check(PokemonCombatDomain().mayControl(actor, fake)) { "Owner control failed" }
                check(!PokemonCombatDomain().mayControl(actor, outsider)) { "Other player controls this partner" }
                check(actor.hurt(actor.damageSources().generic(), 2F)) { "Owned environment hit was rejected" }
                check(victor.currentHealth < victor.maxHealth) { "Owned HP did not update" }
                check(target.hurt(target.damageSources().generic(), 2F)) { "Wild environment hit was rejected" }
                check(foe.currentHealth < foe.maxHealth) { "Wild HP did not update" }
                checkProjection(actor); checkProjection(target)
                victor.heal()
                checkProjection(actor)
                foe.currentHealth = 1
                target.invulnerableTime = 0
                experienceBefore = victor.experience
                CobblemonEvents.EXPERIENCE_GAINED_EVENT_POST.subscribe {
                    if (it.pokemon === victor) { expectedReward += it.experience; rewardEvents++ }
                }
                checkProjection(target)
                oldEntries(server)
                mark("full ownership, environment damage, healing and legacy registry guard")
            }
            if (age == 10) cast(server)
            if (age == 40) {
                check(foe.isFainted()) { "Domain projectile did not defeat the wild target; HP=" + foe.currentHealth }
                check(rewardEvents == 1 && expectedReward > 0 && victor.experience == experienceBefore + expectedReward) { "Experience was missing or duplicated" }
                check(victor.level >= 7) { "Original level growth did not run" }
                val repeated = combat.damage(combat.bind(actor), combat.bind(target), null, 8.0)
                check(!repeated && victor.experience == experienceBefore + expectedReward) { "Defeated target paid another reward" }
                checkProjection(actor)
                TestWorld.clean(combat)
                mark("full one defeat, one reward and original level growth")
                foe = PokemonProperties.parse("rattata level=10").create()
                target = send(foe, server, 14.0)
            }
            if (age == 65) {
                val held = CombatCommands.cast(server.createCommandSourceStack().withEntity(player), "checks:hold", actor, target)
                check(held == 1)
                oldHandle = combat.bind(actor)
                val cancelledRecall = CobblemonEvents.POKEMON_RECALL_PRE.subscribe(Priority.HIGHEST) {
                    if (it.pokemon === victor) it.cancel()
                }
                try { victor.recall() } finally { cancelledRecall.unsubscribe() }
                check(victor.entity === actor && combat.valid(oldHandle)) { "Cancelled recall broke the binding" }
                check(combat.runtime().stats().instances() == 1) { "Cancelled recall released the action" }
                victor.recall()
                TestWorld.clean(combat)
                check(!combat.valid(oldHandle)) { "Recalled handle is still valid" }
                actor = send(victor, server, 2.0)
                check(combat.bind(actor) != oldHandle) { "A new entity reused the old handle" }
                mark("full cancelled recall, confirmed recall and new entity generation")
            }
            if (age == 80) cast(server)
            if (age == 88) {
                oldHandle = combat.bind(actor)
                check(combat.runtime().cooldown(oldHandle, ACTION) > 0) { "No committed cooldown" }
                victor.recall()
                TestWorld.clean(combat)
                actor = send(victor, server, 2.0)
                check(combat.runtime().cooldown(combat.bind(actor), ACTION) > 0) { "Recall reset cooldown" }
                check(CombatCommands.cast(server.createCommandSourceStack().withEntity(player), ACTION, actor, target) == 0) { "Cooldown was bypassed" }
            }
            if (age == 115) {
                check(foe.currentHealth == foe.maxHealth) { "Recalled action still damaged its target" }
                TestWorld.clean(combat)
                victor.recall()
                val path = server.getWorldPath(LevelResource.ROOT).resolve("worldcombat-check-pokemon.dat")
                NbtIo.writeCompressed(victor.saveToNBT(server.registryAccess()), path)
                val saved = NbtIo.readCompressed(path, NbtAccounter.unlimitedHeap())
                val restored = Pokemon().loadFromNBT(server.registryAccess(), saved)
                check(restored.uuid == victor.uuid && restored.currentHealth == victor.currentHealth &&
                    restored.experience == victor.experience && restored.level == victor.level) { "Saved individual changed after reading" }
                check(restored.entity == null) { "Save restored a transient action entity" }
                val expected = com.google.gson.JsonObject().also {
                    it.addProperty("owner", owner.toString()); it.addProperty("pokemon", victor.uuid.toString())
                    it.addProperty("health", victor.currentHealth); it.addProperty("experience", victor.experience)
                    it.addProperty("level", victor.level)
                }
                java.nio.file.Files.writeString(server.getWorldPath(LevelResource.ROOT).resolve("worldcombat-save-check.json"), expected.toString())
                mark("full committed recall cleanup and original NBT save/read")
                actor = send(victor, server, 2.0)
                check(CombatCommands.cast(server.createCommandSourceStack().withEntity(player), "checks:hold", actor, target) == 1)
                reloadEpoch = CombatServices.CONTENT.epoch()
                server.reloadResources(server.packRepository.selectedIds).thenRun { reloadDone = true }.exceptionally {
                    done = true; mark("FAIL full reload " + it); null
                }
            }
            if (age > 125 && reloadDone && CombatServices.CONTENT.epoch() > reloadEpoch && CombatServices.CONTENT.ready()) {
                TestWorld.clean(combat)
                val skipped = LegacyBattleGate.prewarmSkipped.get()
                var otherObserver = 0
                val observer = BagItems.observable.subscribe { otherObserver++ }
                try { BagItems.observable.emit(BagItems) } finally { observer.unsubscribe() }
                check(LegacyBattleGate.prewarmSkipped.get() == skipped + 1 && otherObserver == 1) {
                    "Prewarm guard missed a notification or affected another data observer"
                }
                victor.recall(); foe.recall(); mockOwner?.close(); mockOwner = null; done = true
                mark("PASS full: ownership, HP, defeat, growth, recall, save/read, reload, old registry entry")
            }
        } catch (error: Throwable) {
            done = true
            mockOwner?.close(); mockOwner = null
            error.printStackTrace()
            mark("FAIL full at tick " + age + ": " + error)
        }
    }

    private fun send(pokemon: Pokemon, server: MinecraftServer, x: Double): PokemonEntity =
        pokemon.sendOut(server.overworld(), Vec3(x, 100.0, 2.0), null) {
            it.setNoAi(true); it.setNoGravity(true); it.setPersistenceRequired()
        } ?: error("Send-out cancelled")

    private fun checkProjection(entity: PokemonEntity) {
        val pokemon = entity.pokemon
        check(abs(entity.health / entity.maxHealth - pokemon.currentHealth.toFloat() / pokemon.maxHealth) < 0.0001F) {
            "World and individual HP disagree"
        }
    }

    private fun cast(server: MinecraftServer) {
        val result = server.commands.dispatcher.execute("worldcombat companion " + ACTION + " " + target.uuid, server.createCommandSourceStack().withEntity(player))
        check(result == 1) { "Domain action was rejected" }
    }

    private fun oldEntries(server: MinecraftServer) {
        val before = LegacyBattleGate.rejected.get()
        for (preempt in listOf(true, false)) {
            val result = BattleRegistry.startBattle(BattleFormat.GEN_9_SINGLES, BattleSide(), BattleSide(), preempt)
            check(result is ErroredBattleStart && !result.isEmpty) { "Legacy start was accepted" }
        }
        check(LegacyBattleGate.rejected.get() == before + 2) { "One legacy path bypassed the registry hook" }
        guarded("wild challenge") { BattleBuilder.pve(player, target) }
        val other = FakePlayerFactory.get(server.overworld(), GameProfile(UUID.randomUUID(), "ChallengeCheck"))
        initializeTestData(other.uuid)
        TestWorld.mockOwner(server, other).use {
            val party = Cobblemon.storage.getParty(other.uuid, server.registryAccess())
            check(party.add(PokemonProperties.parse("squirtle level=6").create()))
            guarded("player challenge") { BattleBuilder.pvp1v1(player, other) }
            val functions = com.cobblemon.mod.common.api.molang.function.PlayerMoLangFunctions.attach(player)
            val params = com.bedrockk.molang.runtime.MoParams(
                com.bedrockk.molang.runtime.MoLangRuntime().environment,
                listOf(com.bedrockk.molang.runtime.value.StringValue(other.uuid.toString())))
            val calls = LegacyBattleGate.rejected.get()
            functions.getValue("start_battle")(params)
            check(LegacyBattleGate.rejected.get() == calls + 1) { "MoLang challenge bypassed registry guard" }
            mark("legacy MoLang challenge guarded")
        }
        val npc = com.cobblemon.mod.common.entity.npc.NPCEntity(server.overworld())
        initializeTestData(npc.uuid)
        npc.party = com.cobblemon.mod.common.api.storage.party.NPCPartyStore(npc).also {
            check(it.add(PokemonProperties.parse("charmander level=6").create()))
        }
        try { guarded("NPC challenge") { BattleBuilder.pvn(player, npc) } } finally { npc.discard() }
        check(BattleRegistry.getBattleByParticipatingPlayer(player) == null && actor.battleId == null && target.battleId == null)

    }
    private fun guarded(label: String, request: () -> BattleStartResult) {
        val count = LegacyBattleGate.rejected.get()
        check(request() is ErroredBattleStart && LegacyBattleGate.rejected.get() == count + 1) {
            "Legacy path did not reach its guarded entry: " + label
        }
        mark("legacy " + label + " guarded")
    }

    @Suppress("UNCHECKED_CAST")
    fun initializeTestData(id: UUID) {
        // Seed fresh mock-player files using the upstream defaults and serializer.
        // Its missing-file fallback otherwise logs a data-loss error for brand-new UUIDs.
        for (factory in Cobblemon.playerDataManager.factories.values) {
            val backend = (factory as? com.cobblemon.mod.common.api.storage.player.factory.CachedPlayerDataStoreFactory<*>)?.backend
                as? com.cobblemon.mod.common.api.storage.player.adapter.FileBasedPlayerDataStoreBackend<com.cobblemon.mod.common.api.storage.player.InstancedPlayerData>
                ?: continue
            if (!backend.filePath(id).exists()) backend.save(backend.defaultData(id))
        }
        Cobblemon.playerDataManager.saveExecutor.submit {}.get(5, java.util.concurrent.TimeUnit.SECONDS)
    }
    private fun mark(message: String) = TestWorld.mark(message)
}
