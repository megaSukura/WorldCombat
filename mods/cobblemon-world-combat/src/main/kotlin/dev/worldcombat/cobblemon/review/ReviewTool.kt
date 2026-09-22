package dev.worldcombat.cobblemon.review

import com.cobblemon.mod.common.Cobblemon
import com.cobblemon.mod.common.api.moves.Moves
import com.cobblemon.mod.common.api.pokemon.PokemonProperties
import com.cobblemon.mod.common.api.pokemon.PokemonSpecies
import com.cobblemon.mod.common.entity.pokemon.PokemonEntity
import com.cobblemon.mod.common.pokemon.Pokemon
import com.google.gson.*
import dev.worldcombat.cobblemon.control.CompanionControl
import dev.worldcombat.cobblemon.network.ReviewState
import dev.worldcombat.cobblemon.script.NativeContentData
import dev.worldcombat.core.world.CombatServices
import net.minecraft.server.MinecraftServer
import net.minecraft.server.level.ServerPlayer
import net.minecraft.world.entity.LivingEntity
import net.minecraft.world.level.GameType
import net.minecraft.world.phys.Vec3
import net.minecraft.world.entity.Mob
import net.minecraft.world.item.Items
import net.minecraft.world.item.ItemStack
import net.minecraft.core.component.DataComponents
import net.minecraft.world.item.component.CustomData
import net.minecraft.nbt.CompoundTag
import net.minecraft.network.chat.Component
import net.minecraft.world.InteractionResult
import net.neoforged.neoforge.event.entity.player.PlayerInteractEvent
import net.neoforged.neoforge.network.PacketDistributor
import java.nio.file.Files
import java.nio.file.StandardOpenOption
import java.util.UUID
import java.util.function.Consumer

/** Dedicated review-instance fixtures, free play configuration and user-authored feedback. */
object ReviewTool {
    private val gson = GsonBuilder().setPrettyPrinting().create()
    private var loaded: JsonObject? = null
    private var driver: Consumer<String>? = null
    private val scenarios = linkedSetOf<String>()
    private var reviewer: UUID? = null
    private var server: MinecraftServer? = null
    private var primary: LivingEntity? = null
    private var partyFixture: Pokemon? = null
    private var telemetry = JsonObject()
    private var dirty = false
    private var lastSent = 0
    private var serial = 0
    private var mode = "free"
    private var variant = "mob"
    private var setup = JsonObject()
    private val idleTargets = mutableSetOf<LivingEntity>()
    private var levelOverride = 0
    private var speciesOverride = ""
    private var extras = listOf<String>()
    private var message = ""
    private var autoplay = false
    private var advanceAt = -1
    private val joined = mutableSetOf<UUID>()
    private val cases = setOf("free", "duel", "ai", "manual", "companion", "details")
    @JvmStatic fun enabled() = java.lang.Boolean.getBoolean("worldcombat.review")
    private fun reviewWorld(s: MinecraftServer) = enabled() && s.worldData.levelName == "review-world"
    @JvmStatic fun bind(callback: Consumer<String>) { if (enabled()) driver = callback }
    @JvmStatic fun registerScenario(id: String) { if (enabled()) scenarios.add(id) }
    @JvmStatic fun manual() = mode == "manual" || mode == "details"
    @JvmStatic fun mode() = mode
    @JvmStatic fun freePlay() = mode == "free" || mode == "duel"
    @JvmStatic fun player(): ServerPlayer? { val id = reviewer ?: return null; return server?.playerList?.getPlayer(id) }
    private fun file(s: MinecraftServer) = s.serverDirectory.resolve("config/worldcombat/review.json")
    private fun state(s: MinecraftServer): JsonObject {
        loaded?.let { return it }
        val path = file(s)
        val data = if (Files.exists(path)) runCatching { JsonParser.parseString(Files.readString(path)).asJsonObject }.getOrNull() else null
        return (data ?: JsonObject()).also {
            if (!it.has("moves")) it.add("moves", JsonObject())
            if (!it.has("feedbackLibrary")) it.add("feedbackLibrary", JsonArray())
            serial = it.get("serial")?.asInt ?: 0
            mode = if (it.get("workbenchVersion")?.asInt == 2) it.get("mode")?.asString?.takeIf(cases::contains) ?: "free" else "free"
            variant = it.get("variant")?.asString?.takeIf { value -> value in setOf("mob", "pokemon", "player", "authored") } ?: "mob"
            if (mode == "free" && variant == "authored") variant = "mob"
            setup = it.getAsJsonObject("setup")?.deepCopy() ?: JsonObject()
            levelOverride = (it.get("level")?.asInt ?: 0).coerceIn(0,100)
            speciesOverride = it.get("species")?.asString ?: ""
            extras = it.getAsJsonArray("extras")?.map { value -> value.asString } ?: emptyList()
            loaded = it
        }
    }
    private fun save() {
        val s = server ?: return; val path = file(s); Files.createDirectories(path.parent)
        state(s).addProperty("mode", mode); state(s).addProperty("serial", serial)
        state(s).addProperty("workbenchVersion", 2); state(s).add("setup",setup.deepCopy())
        state(s).addProperty("variant",variant); state(s).addProperty("level",levelOverride); state(s).addProperty("species",speciesOverride)
        state(s).add("extras",JsonArray().also { list -> extras.forEach(list::add) })
        Files.writeString(path, gson.toJson(state(s)))
    }
    fun moves(): List<String> = CombatServices.CONTENT.ids().asSequence().filter { it.startsWith("world_combat:") }
        .map { it.substringAfter(':') }.filter { Moves.getByName(it) != null }.sorted().toList()
    private fun cursor() = server?.let { state(it).get("cursor")?.asString } ?: ""
    private fun entry(id: String): JsonObject {
        val all = state(server!!).getAsJsonObject("moves")
        return all.getAsJsonObject(id) ?: JsonObject().also { it.add("cases", JsonObject()); all.add(id, it) }
    }
    private fun caseKey() = mode + "/" + variant
    private fun reviewed(id: String): String = entry(id).getAsJsonObject("cases")?.getAsJsonObject(caseKey())?.get("status")?.asString ?: "pending"
    private fun next(): String? {
        val all = moves().filter { reviewed(it) == "pending" }
        return all.firstOrNull { it > cursor() } ?: all.firstOrNull()
    }
    private fun evidence(kind: String, data: JsonObject) {
        val s = server ?: return
        data.addProperty("kind", kind); data.addProperty("move", cursor()); data.addProperty("case", caseKey())
        data.addProperty("run", serial); data.addProperty("time", java.time.Instant.now().toString())
        val path = s.serverDirectory.resolve("config/worldcombat/review-events.jsonl"); Files.createDirectories(path.parent)
        Files.writeString(path, data.toString() + "\n", StandardOpenOption.CREATE, StandardOpenOption.APPEND)
    }
    private fun capturePreferences() {
        val pokemon = partyFixture ?: return
        val content = pokemon.persistentData.getCompound("WorldCombat").getCompound("Content")
        val values = JsonObject()
        content.allKeys.filter { it.substringAfter(':').startsWith("preferences/") }.forEach { key ->
            NativeContentData.read(pokemon,key)?.let { values.addProperty(key,it) }
        }
        state(server!!).add("preferences",values)
    }
    private fun mark(status: String, note: String, capture: String = "") {
        if (cursor().isBlank() || status !in setOf("ok", "issue", "pending")) return
        capturePreferences()
        val root = entry(cursor()); val records = root.getAsJsonObject("cases") ?: JsonObject().also { root.add("cases", it) }
        val record = JsonObject().also {
            it.addProperty("status", status); it.addProperty("note", note); it.addProperty("capture", capture); it.addProperty("run", serial)
            it.add("observed", telemetry.deepCopy()); it.add("preferences",state(server!!).getAsJsonObject("preferences")?.deepCopy() ?: JsonObject()); it.addProperty("level", levelOverride); it.addProperty("species", speciesOverride)
            it.addProperty("time", java.time.Instant.now().toString())
        }
        records.add(caseKey(), record); evidence("human-verdict", record.deepCopy()); save()
    }
    /** Entries belong to a move. Reusing one copies its text; editing never changes another move's entry. */
    private fun feedback(req: JsonObject) {
        val id = req.get("move")?.asString ?: cursor(); require(id in moves())
        val root = entry(id)
        val entries = root.getAsJsonArray("feedback") ?: JsonArray().also { root.add("feedback", it) }
        val key = req.get("id")?.asString?.takeIf { it.isNotBlank() } ?: UUID.randomUUID().toString()
        val at = entries.indexOfFirst { it.asJsonObject.get("id").asString == key }
        if (req.get("delete")?.asBoolean == true) { if (at >= 0) entries.remove(at) }
        else {
            val text = req.get("text")?.asString ?: ""
            val row = JsonObject().also { it.addProperty("id",key); it.addProperty("text",text); it.addProperty("case",caseKey()); it.addProperty("time",java.time.Instant.now().toString()); it.addProperty("run",serial) }
            if (at >= 0) entries.set(at,row) else entries.add(row)
            if (req.get("remember")?.asBoolean == true && text.isNotBlank()) {
                val library = state(server!!).getAsJsonArray("feedbackLibrary")
                val old=library.indexOfFirst { it.asJsonObject.get("id")?.asString==key && it.asJsonObject.get("move")?.asString==id }
                val copy=row.deepCopy().also { it.addProperty("move",id) }
                if(old>=0) library.set(old,copy) else if (library.none { it.asJsonObject.get("text").asString == text }) library.add(copy)
            }
        }
        save(); message = "反馈条目已保存"
    }
    @JvmStatic fun freeSpec(): String {
        val id = cursor(); val template = Moves.getByName(id)!!
        val learner = PokemonSpecies.species.filter { it.implemented }.sortedBy { it.nationalPokedexNumber }.firstOrNull {
            template in it.moves.getLevelUpMovesUpTo(100) || template in it.moves.tmMoves || template in it.moves.tutorMoves || template in it.moves.eggMoves
        }
        return setup.deepCopy().also {
            it.addProperty("species", speciesOverride.ifBlank { learner?.resourceIdentifier?.path ?: "pikachu" })
            it.addProperty("level", levelOverride.takeIf { it > 0 } ?: 50)
            it.addProperty("variant",variant)
        }.toString()
    }
    @JvmStatic fun targetBehavior(entity: LivingEntity, active: Boolean) {
        if (active) idleTargets.remove(entity) else idleTargets.add(entity)
        server?.let { CombatServices.get(it).controlled(CombatServices.get(it).bind(entity),!active) }
        (entity as? Mob)?.isNoAi = !active
    }
    @JvmStatic fun tool(stack: ItemStack) = stack.get(DataComponents.CUSTOM_DATA)?.copyTag()?.getBoolean("WorldCombatReviewTool") == true
    @JvmStatic fun interact(event: PlayerInteractEvent) {
        if (!enabled() || !tool(event.itemStack)) return
        if (event !is PlayerInteractEvent.RightClickItem && event !is PlayerInteractEvent.RightClickBlock && event !is PlayerInteractEvent.EntityInteract && event !is PlayerInteractEvent.EntityInteractSpecific) return
        if (event.entity is ServerPlayer && !reviewWorld((event.entity as ServerPlayer).server)) return
        (event as net.neoforged.bus.api.ICancellableEvent).isCanceled = true
        when(event) {
            is PlayerInteractEvent.RightClickItem -> event.cancellationResult=InteractionResult.SUCCESS
            is PlayerInteractEvent.RightClickBlock -> event.cancellationResult=InteractionResult.SUCCESS
            is PlayerInteractEvent.EntityInteract -> event.cancellationResult=InteractionResult.SUCCESS
            is PlayerInteractEvent.EntityInteractSpecific -> event.cancellationResult=InteractionResult.SUCCESS
        }
        (event.entity as? ServerPlayer)?.let { handle(it,"{\"op\":\"open\"}") }
    }
    private fun ensureTool(p: ServerPlayer) {
        if (p.inventory.items.any(::tool) || p.inventory.offhand.any(::tool)) return
        val item = ItemStack(Items.BLAZE_ROD).also {
            it.set(DataComponents.CUSTOM_NAME,Component.translatable("worldcombat.review.tool"))
            it.set(DataComponents.CUSTOM_DATA,CustomData.of(CompoundTag().also { tag -> tag.putBoolean("WorldCombatReviewTool",true) }))
        }
        if (p.inventory.getItem(8).isEmpty) p.inventory.setItem(8,item) else p.inventory.add(item)
    }
    private fun kit(p: ServerPlayer, equip: Boolean = false) {
        for(item in listOf(Items.IRON_SWORD,Items.BOW,Items.SHIELD,Items.COOKED_BEEF,Items.ARROW))
            if(!p.inventory.contains(ItemStack(item))) p.inventory.add(ItemStack(item,if(item==Items.ARROW||item==Items.COOKED_BEEF) 64 else 1))
        if(equip) {
            (0..7).firstOrNull { p.inventory.getItem(it).`is`(Items.IRON_SWORD) }?.let { p.inventory.selected=it }
            if(p.offhandItem.isEmpty) (0..35).firstOrNull { p.inventory.getItem(it).`is`(Items.SHIELD) }?.let {
                p.setItemSlot(net.minecraft.world.entity.EquipmentSlot.OFFHAND,p.inventory.removeItemNoUpdate(it))
            }
        }
    }
    private fun start(id: String) {
        require(id in moves()) { "Unknown move: $id" }
        require(driver != null && (freePlay() || id in scenarios)) { "该招场景尚未装入验收包" }
        state(server!!).addProperty("cursor", id); serial++; save()
        telemetry = JsonObject(); telemetry.addProperty("phase", "preparing"); message = "正在准备场地与个体"; advanceAt = -1
        val command = JsonObject().also {
            it.addProperty("op", "start"); it.addProperty("move", id); it.addProperty("mode", mode)
            it.addProperty("variant", variant); it.addProperty("serial", serial); it.addProperty("level", levelOverride)
            it.addProperty("species", speciesOverride)
        }
        driver!!.accept(command.toString()); dirty = true
    }
    /** Called once each server tick, never opens an application or starts a test in a normal play instance. */
    @JvmStatic fun tick(s: MinecraftServer) {
        if (!reviewWorld(s)) return
        server = s
        if (!CombatServices.CONTENT.ready() || driver == null || scenarios.isEmpty()) return
        for (p in s.playerList.players) if (joined.add(p.uuid)) {
            if (reviewer == null || s.playerList.getPlayer(reviewer!!) == null) {
                reviewer = p.uuid; state(s)
                val data = Cobblemon.playerDataManager.getGenericData(p)
                data.starterPrompted = true; data.starterSelected = true
                Cobblemon.playerDataManager.syncAllToPlayer(p)
                ensureTool(p)
                telemetry = JsonObject().also { it.addProperty("phase", "awaiting-client") }
                message = "等待客户端进入世界"
            }
            send(p, true)
        }
        joined.retainAll(s.playerList.players.map { it.uuid }.toSet())
        if (player() == null) return
        if (s.tickCount % 20 == 0) player()?.let(::ensureTool)
        if (autoplay && advanceAt >= 0 && s.tickCount >= advanceAt) {
            advanceAt = -1
            val all = moves(); val at = all.indexOf(cursor()); if (at + 1 < all.size) start(all[at + 1]) else autoplay = false
            player()?.let { send(it, true) }
        }
        if (dirty && s.tickCount - lastSent >= 10) { player()?.let { send(it, false) }; dirty = false; lastSent = s.tickCount }
    }
    fun handle(p: ServerPlayer, json: String) {
        server = p.server
        val req = runCatching { JsonParser.parseString(json).asJsonObject }.getOrNull() ?: return
        val op = req.get("op")?.asString ?: "sync"
        if (!reviewWorld(p.server)) { message = "请使用专用「启动验收」入口；普通存档只查看目录。"; send(p, true); return }
        if (!p.hasPermissions(2) && !p.server.isSingleplayer) return
        if (reviewer != null && reviewer != p.uuid && p.server.playerList.getPlayer(reviewer!!) != null) return
        reviewer = p.uuid
        state(p.server)
        if (op !in setOf("sync", "ready", "open", "feedback") && req.has("expectedRun") && (req.get("expectedRun").asInt != serial || req.get("expectedMove")?.asString != cursor())) { send(p,true); return }
        try {
            when (op) {
                "sync", "open" -> {}
                "ready" -> { ensureTool(p); message = "右键验收手册，任选招式开始；玩家可自由行动"; telemetry.addProperty("phase","ready") }
                "feedback" -> feedback(req)
                "setup" -> {
                    req.get("mode")?.asString?.let { require(it in cases); mode=it }
                    req.get("variant")?.asString?.let { require(it in setOf("mob","pokemon","player","authored")); variant=it }
                    req.get("level")?.asInt?.let { require(it in 1..100); levelOverride=it }
                    req.get("species")?.asString?.let { speciesOverride=it.trim(); if(speciesOverride.isNotBlank()) require(PokemonSpecies.getByName(speciesOverride)!=null) { "未知宝可梦：$speciesOverride" } }
                    req.getAsJsonObject("setup")?.let { setup=it.deepCopy() }
                    req.get("moves")?.asString?.let { extras=it.split(',').map(String::trim).filter { v -> v.isNotEmpty() && v != req.get("move")?.asString }.distinct().take(3);require(extras.all { v -> v in moves() }) }
                    validateSetup()
                    save(); start(req.get("move")?.asString ?: cursor())
                }
                "player-mode" -> { val value=req.get("value").asString; setup.addProperty("playerMode",value);save();p.setGameMode(if(value=="survival") GameType.SURVIVAL else GameType.CREATIVE); p.abilities.flying=false; p.onUpdateAbilities() }
                "kit" -> { kit(p); message="武器、盾、箭与食物已放入背包" }
                "restore-player" -> { heal(p); p.foodData.foodLevel=20; p.removeAllEffects() }
                "select" -> start(req.get("move").asString)
                "repeat" -> start(cursor())
                "next" -> {
                    req.get("status")?.asString?.let { mark(it, req.get("note")?.asString ?: "", req.get("capture")?.asString ?: "") }
                    val id = next(); if (id != null) start(id) else message = "当前检验项目没有待审招式"
                }
                "mark" -> mark(req.get("status")?.asString ?: "pending", req.get("note")?.asString ?: "", req.get("capture")?.asString ?: "")
                "mode" -> { mode = req.get("mode").asString.also { require(it in cases) }; start(cursor()) }
                "variant" -> { variant = req.get("variant").asString.also { require(it in setOf("authored", "mob", "pokemon", "player")) }; start(cursor()) }
                "level" -> { levelOverride = req.get("level").asInt.also { require(it in 0..100) }; start(cursor()) }
                "original" -> { levelOverride = 0; speciesOverride = ""; extras = emptyList(); start(cursor()) }
                "species" -> {
                    val template = Moves.getByName(cursor())!!
                    val learners = PokemonSpecies.species.filter { it.implemented && (template in it.moves.getLevelUpMovesUpTo(100) || template in it.moves.tmMoves || template in it.moves.tutorMoves || template in it.moves.eggMoves) }.sortedBy { it.nationalPokedexNumber }
                    if (learners.isNotEmpty()) { val current = speciesOverride.ifBlank { partyFixture?.species?.resourceIdentifier?.path ?: "" }; val i = learners.indexOfFirst { it.resourceIdentifier.path == current }; speciesOverride = learners[(i + 1) % learners.size].resourceIdentifier.path }
                    start(cursor())
                }
                "loadout" -> { extras = req.get("moves").asString.split(',').map(String::trim).filter { it.isNotEmpty() && it != cursor() }.distinct().take(3); require(extras.all { it in moves() }); start(cursor()) }
                "arena" -> {
                    req.get("variant")?.asString?.let { require(it in setOf("mob","pokemon","player")); variant=it }
                    req.getAsJsonObject("setup")?.let { setup=it.deepCopy(); validateSetup(); save() }
                    driver?.accept(req.toString())
                }
                "condition" -> { driver?.accept(req.toString()); message = "场景条件已调整" }
                "autoplay" -> { autoplay = !autoplay; message = if (autoplay) "自动巡览：观察记录会保存，体验判定仍由你填写" else "自动巡览已停"; if (autoplay && telemetry.has("verdict")) advanceAt = p.server.tickCount + 60 }
                "pause" -> { driver?.accept(req.toString()); message = "已切换场景运行状态" }
                else -> return
            }
        } catch (e: Exception) { message = "未完成：${e.message}"; dev.worldcombat.cobblemon.CobblemonWorldCombat.LOGGER.warn("Review operation {}", op, e) }
        if (op == "open" || op == "ready") PacketDistributor.sendToPlayer(p,ReviewState(snapshot(true).also { it.addProperty("open",true) }.toString())) else send(p, true)
    }
    /** Test-only party members are labelled and removed individually; existing party entries are never deleted. */
    private fun validateSetup() {
        require((setup.get("count")?.asInt ?: 1)>0) { "目标数量应大于零" }
        require((setup.get("targetLevel")?.asInt ?: 50) in 1..100) { "等级应在 1–100 之间" }
        require(PokemonSpecies.getByName(setup.get("targetSpecies")?.asString ?: "blissey")!=null) { "未知目标宝可梦" }
        require((setup.get("targetMoves")?.asString ?: "tackle").split(',').filter { it.isNotBlank() }.all { Moves.getByName(it.trim())!=null }) { "未知目标招式" }
        val mob=net.minecraft.resources.ResourceLocation.parse(setup.get("mob")?.asString ?: "minecraft:iron_golem")
        require(net.minecraft.core.registries.BuiltInRegistries.ENTITY_TYPE.containsKey(mob)) { "未知 MC 实体" }
    }
    @JvmStatic fun label(entity: LivingEntity): String = if (entity is PokemonEntity) "${entity.pokemon.species.name}@${entity.pokemon.level}" else if (entity is ServerPlayer) "Player: ${entity.name.string}" else net.minecraft.core.registries.BuiltInRegistries.ENTITY_TYPE.getKey(entity.type).toString()
    @JvmStatic fun isPlayer(entity: net.minecraft.world.entity.Entity) = entity is ServerPlayer
    @JvmStatic fun clearArea(x: Double, y: Double, z: Double) {
        player()?.serverLevel()?.getEntitiesOfClass(net.minecraft.world.entity.Entity::class.java, net.minecraft.world.phys.AABB(x-60,y-20,z-60,x+60,y+80,z+60))?.filter { it !is ServerPlayer }?.forEach { it.discard() }
    }
    @JvmStatic fun clearFixtures() {
        val p = player() ?: return
        capturePreferences(); save()
        val party = Cobblemon.storage.getParty(p)
        party.toList().filter { it.persistentData.getBoolean("WorldCombatReviewFixture") }.forEach { it.recall(); party.remove(it) }
        primary = null; partyFixture = null; idleTargets.clear()
    }
    @JvmStatic fun owned(pokemon: Pokemon, x: Double, y: Double, z: Double): PokemonEntity {
        val p = player() ?: error("Reviewer unavailable")
        pokemon.persistentData.putBoolean("WorldCombatReviewFixture", true)
        state(p.server).getAsJsonObject("preferences")?.let { saved ->
            val changes = saved.entrySet().associate { it.key to NativeContentData.Change(NativeContentData.read(pokemon,it.key),it.value.asString) }
            check(NativeContentData.compare(pokemon,changes)) { "Review preferences changed during fixture setup" }
        }
        val party = Cobblemon.storage.getParty(p)
        check(party.add(pokemon)) { "验收队伍已满，请移出个人成员" }
        extras.forEachIndexed { index, id -> pokemon.moveSet.setMove(index + 1, Moves.getByName(id)!!.create()) }
        partyFixture = pokemon
        val result = pokemon.sendOut(p.serverLevel(), Vec3(x, y, z), null) ?: error("Cannot send out review subject")
        result.setPersistenceRequired()
        CompanionControl.session(p).partySlot = party.indexOfFirst { it.uuid == pokemon.uuid }
        return result
    }
    @JvmStatic fun focus(entity: LivingEntity) {
        primary = entity
        if (freePlay()) { dirty=true; return }
        val p = player() ?: return
        p.moveTo(entity.x - 5, entity.y + 2, entity.z + 7, -145f, 10f)
        p.teleportTo(entity.x - 5, entity.y + 2, entity.z + 7)
        p.yRot = -145f; p.xRot = 10f
        if (p.gameMode.gameModeForPlayer == GameType.CREATIVE) { p.abilities.flying = true; p.onUpdateAbilities() }
        dirty = true
    }
    @JvmStatic fun heal(entity: LivingEntity) { if (entity is PokemonEntity) entity.pokemon.heal(); entity.health = entity.maxHealth }
    @JvmStatic fun look(entity: LivingEntity) { if(!freePlay()) player()?.lookAt(net.minecraft.commands.arguments.EntityAnchorArgument.Anchor.EYES, entity.boundingBox.center) }
    @JvmStatic fun scenePosition(x: Double, y: Double, z: Double) {
        val p = player() ?: return
        if (freePlay()) {
            p.setGameMode(if(mode=="duel" || setup.get("playerMode")?.asString=="survival") GameType.SURVIVAL else GameType.CREATIVE)
            p.health=p.maxHealth;p.foodData.foodLevel=20
            if(mode=="duel")kit(p,true)
            p.abilities.flying=false; p.onUpdateAbilities()
            p.moveTo(x-5,y,z+7,-145f,0f);p.teleportTo(x-5,y,z+7)
            p.setRespawnPosition(p.serverLevel().dimension(),net.minecraft.core.BlockPos.containing(x-5,y,z+7),-145f,true,false)
            return
        }
        p.setGameMode(if (variant == "player") GameType.SURVIVAL else GameType.CREATIVE)
        p.health = p.maxHealth; p.foodData.foodLevel = 20; p.removeAllEffects()
        p.moveTo(x - 5, y + 2, z + 7, -145f, 10f)
        p.teleportTo(x - 5, y + 2, z + 7)
        p.setRespawnPosition(p.serverLevel().dimension(), net.minecraft.core.BlockPos.containing(x, y, z + 10), 0f, true, false)
    }
    @JvmStatic fun inspectPokemon(): String = partyFixture?.uuid?.toString() ?: ""
    @JvmStatic fun event(json: String) {
        val event = JsonParser.parseString(json).asJsonObject
        if (event.get("kind")?.asString == "state") telemetry.add("actors", event.get("actors"))
        else {
            telemetry.add("last", event)
            if (event.get("kind")?.asString == "start") { telemetry.addProperty("phase", "running"); message = "场景就绪；各项结果分别记录" }
            if (event.get("kind")?.asString == "verdict") {
                telemetry.addProperty("phase", "finished"); telemetry.addProperty("verdict", event.get("verdict").asString)
                telemetry.add("checks", event); evidence("scenario-result", event.deepCopy())
                if (autoplay && !manual()) advanceAt = (server?.tickCount ?: 0) + 80
            }
            if (event.get("kind")?.asString in setOf("fail", "note")) {
                val notes = telemetry.getAsJsonArray("notes") ?: JsonArray().also { telemetry.add("notes", it) }
                notes.add(event); while (notes.size() > 8) notes.remove(0)
            }
        }
        dirty = true
    }
    @JvmStatic fun hold(entity: LivingEntity): Boolean = enabled() && manual() && primary === entity
    @JvmStatic fun tickHeld() {
        val p = player() ?: return
        idleTargets.removeIf { !it.isAlive }; idleTargets.forEach { CombatServices.get(p.server).controlled(CombatServices.get(p.server).bind(it),true) }
        val entity = primary ?: return
        if (!manual() || !entity.isAlive) return
        val combat = CombatServices.get(p.server); combat.controlled(combat.bind(entity), true)
    }
    private fun send(p: ServerPlayer, full: Boolean) { PacketDistributor.sendToPlayer(p, ReviewState(snapshot(full).toString())) }
    private fun snapshot(full: Boolean): JsonObject = JsonObject().also { out ->
        out.addProperty("patch", !full); out.addProperty("enabled", server?.let(::reviewWorld) == true); out.addProperty("cursor", cursor())
        out.addProperty("mode", mode); out.addProperty("variant", variant); out.addProperty("message", message)
        out.addProperty("level", levelOverride); out.addProperty("species", speciesOverride); out.addProperty("run", serial)
        out.addProperty("pokemon", inspectPokemon()); out.addProperty("autoplay", autoplay)
        out.add("setup",setup.deepCopy()); out.addProperty("playerMode",player()?.gameMode?.gameModeForPlayer?.name?.lowercase() ?: "creative")
        out.add("telemetry", telemetry.deepCopy())
        if(cursor().isNotBlank()) { val preview = CombatServices.CONTENT.preview("world_combat:" + cursor()).input(); out.addProperty("inputSteps", preview.steps().size); out.addProperty("sustained", preview.sustained()) }
        if (full) {
            val list = JsonArray()
            moves().forEach { id -> list.add(JsonObject().also { row ->
                row.addProperty("id", id); row.addProperty("status", reviewed(id)); row.addProperty("scenario", id in scenarios)
                row.addProperty("caseCount", entry(id).getAsJsonObject("cases")?.size() ?: 0)
                val template=Moves.getByName(id)!!; row.addProperty("type",template.elementalType.showdownId()); row.addProperty("category",template.damageCategory.name.lowercase())
                row.addProperty("feedbackCount",entry(id).getAsJsonArray("feedback")?.size() ?: 0)
            }) }; out.add("moves", list)
            out.add("feedback",if(cursor().isNotBlank()) entry(cursor()).getAsJsonArray("feedback")?.deepCopy() ?: JsonArray() else JsonArray())
            out.add("feedbackLibrary",server?.let { state(it).getAsJsonArray("feedbackLibrary").deepCopy() } ?: JsonArray())
            out.add("extras",JsonArray().also { list -> extras.forEach(list::add) })
        }
    }
    fun reset() {
        if (server?.let(::reviewWorld) == true && partyFixture != null) runCatching { capturePreferences(); save() }
            .onFailure { dev.worldcombat.cobblemon.CobblemonWorldCombat.LOGGER.warn("Could not save review preferences", it) }
        loaded = null; driver = null; scenarios.clear(); reviewer = null; server = null; primary = null; partyFixture = null; telemetry = JsonObject(); joined.clear(); idleTargets.clear(); autoplay = false; advanceAt = -1 }
}
