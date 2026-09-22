package dev.worldcombat.core.world;

import com.google.gson.JsonObject;
import dev.worldcombat.core.runtime.*;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.damagesource.DamageSource;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.player.Player;
import java.util.UUID;

/**
 * Script-defined persistent bodies. A body is created together with its brain, a persistent world effect whose
 * source and target are the body; the body lives as long as that effect exists (active or saved for later restore).
 * Ownership for friendliness follows the summoner while it exists, then the summoner's controlling player.
 */
public final class WorldBodies {
    public static final String INTERACT = "world_combat:body_interact", TOUCH = "world_combat:body_touch",
        BLOCKED = "world_combat:body_blocked", DIED = "world_combat:body_died";
    private final MinecraftCombat combat;
    WorldBodies(MinecraftCombat combat) { this.combat = combat; }

    public ActorHandle spawn(ActorHandle summoner, UUID controller, Point point, String body, String definition, String data, int ticks) {
        var actor = combat.resolve(summoner);
        if (actor == null) throw new ActionInactiveException("Body summoner unavailable");
        var level = (ServerLevel) actor.level();
        var entity = CombatWorldContent.BODY.get().create(level);
        if (entity == null) throw new IllegalStateException("Body creation failed");
        entity.moveTo(point.x(), point.y(), point.z(), actor.getYRot(), 0);
        if (!level.hasChunkAt(entity.blockPosition()) || !level.getWorldBorder().isWithinBounds(entity.getBoundingBox())) throw new ActionRejectedException("space-occupied");
        entity.configure(body);
        entity.addTag("world_combat:body");
        UUID owner = controller != null ? controller : ownerOf(actor);
        entity.identity(definition, 0, actor.getUUID(), owner);
        if (!level.addFreshEntity(entity)) throw new ActionRejectedException("body-refused");
        var handle = combat.bind(entity);
        long brain;
        try { brain = combat.runtime().effects().create(definition, handle, handle, null, 0, data, ticks); }
        catch (RuntimeException failure) { entity.discard(); throw failure; }
        entity.identity(definition, brain, actor.getUUID(), owner);
        if (!combat.runtime().effects().exists(brain)) entity.discard();
        return handle;
    }
    private static UUID ownerOf(LivingEntity actor) {
        return actor instanceof Player player ? player.getUUID() : actor instanceof ScriptedBody body ? body.owner() : CombatServices.domain(actor).owner(actor);
    }
    public boolean alive(ScriptedBody body) {
        if (body.brain() == 0) return body.definition().isEmpty();
        return combat.runtime().effects().exists(body.brain());
    }
    public ScriptedBody body(ActorHandle actor) { return combat.resolve(actor) instanceof ScriptedBody body ? body : null; }
    /** The actor whose allegiance a body inherits: its summoner while present, otherwise its controlling player. */
    public ActorHandle principal(ActorHandle actor) {
        var body = body(actor);
        if (body == null) return null;
        var level = (ServerLevel) body.level();
        if (body.summoner() != null && level.getEntity(body.summoner()) instanceof LivingEntity summoner && !(summoner instanceof ScriptedBody)
            && CombatServices.domain(summoner).available(summoner)) return combat.bind(summoner);
        if (body.owner() != null) { var player = combat.server().getPlayerList().getPlayer(body.owner()); if (player != null) return combat.bind(player); }
        return null;
    }
    public String info(ActorHandle actor) {
        var body = body(actor);
        if (body == null) return "";
        var json = new JsonObject();
        json.addProperty("definition", body.definition()); json.addProperty("brain", body.brain());
        json.addProperty("summoner", body.summoner() == null ? "" : body.summoner().toString());
        json.addProperty("owner", body.owner() == null ? "" : body.owner().toString());
        json.add("config", com.google.gson.JsonParser.parseString(body.config()));
        return json.toString();
    }
    public boolean configure(ActorHandle actor, String json) {
        var body = body(actor);
        if (body == null) return false;
        body.configure(json); return true;
    }
    /** Ends the brain; the body leaves on its next tick. Allowed for the body itself, its summoner or its controlling player. */
    public boolean dismiss(ActorHandle caller, ActorHandle actor) {
        var body = body(actor);
        if (body == null) return false;
        var callerEntity = combat.resolve(caller);
        boolean permitted = callerEntity == body || callerEntity != null && (callerEntity.getUUID().equals(body.summoner()) || callerEntity.getUUID().equals(body.owner()));
        if (!permitted) return false;
        combat.runtime().effects().dismiss(body.brain());
        body.discard();
        return true;
    }
    boolean interact(ScriptedBody body, Player player, InteractionHand hand) {
        if (!combat.runtime().content().hooks().has(INTERACT)) return false;
        var stack = player.getItemInHand(hand);
        var data = new JsonObject();
        data.addProperty("hand", hand == InteractionHand.MAIN_HAND ? "main" : "off");
        data.addProperty("item", stack.isEmpty() ? "" : BuiltInRegistries.ITEM.getKey(stack.getItem()).toString());
        data.addProperty("count", stack.getCount());
        data.addProperty("sneaking", player.isShiftKeyDown());
        data.addProperty("consumed", false);
        var result = combat.runtime().event(INTERACT, combat.bind(body), combat.bind(player), data.toString(), true);
        if (!result.rejection().isEmpty()) return false;
        try { return com.google.gson.JsonParser.parseString(result.data()).getAsJsonObject().get("consumed").getAsBoolean(); }
        catch (RuntimeException ignored) { return false; }
    }
    void touched(ScriptedBody body, LivingEntity other) {
        if (!combat.runtime().content().hooks().has(TOUCH) || !CombatServices.domain(other).available(other)) return;
        var data = new JsonObject();
        var motion = body.getDeltaMovement();
        data.addProperty("speed", motion.length());
        combat.runtime().event(TOUCH, combat.bind(body), combat.bind(other), data.toString(), true);
    }
    void blocked(ScriptedBody body) {
        if (!combat.runtime().content().hooks().has(BLOCKED)) return;
        var data = new JsonObject();
        data.addProperty("horizontal", body.horizontalCollision); data.addProperty("vertical", body.verticalCollision);
        var below = body.blockPosition().below();
        data.addProperty("block", BuiltInRegistries.BLOCK.getKey(body.level().getBlockState(body.onGround() ? below : body.blockPosition()).getBlock()).toString());
        combat.runtime().event(BLOCKED, combat.bind(body), null, data.toString(), true);
    }
    void died(ScriptedBody body, DamageSource source) {
        var killer = source.getEntity() instanceof LivingEntity living ? combat.bind(living) : null;
        var data = new JsonObject();
        data.addProperty("cause", source.getMsgId());
        if (combat.runtime().content().hooks().has(DIED)) combat.runtime().event(DIED, combat.bind(body), killer, data.toString(), true);
        combat.runtime().effects().dismiss(body.brain());
    }
}
