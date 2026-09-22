package dev.worldcombat.core.client.particles;

import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import dev.worldcombat.core.client.ClientFrame;
import dev.worldcombat.core.client.ClientPresentation;
import java.util.Collection;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import net.minecraft.client.Minecraft;
import net.neoforged.neoforge.client.event.ClientTickEvent;

/**
 * Singleton engine entry point. Owns the {@code id@version -> definition} registry and the live
 * instance table, and wires itself into {@link ClientPresentation}. Owned by wave 3.
 *
 * <p>Simulation runs on the client tick (20 Hz); the scene handler only marks instances as touched
 * and updates per-frame overrides. Instances that stop being touched are interrupted.
 */
public final class ParticleDirector {
    /** Process-wide instance. */
    public static final ParticleDirector INSTANCE = new ParticleDirector();

    private static final long STALE_TICKS = 10;

    private final Map<String, ParticleDefinition> definitions = new LinkedHashMap<>();
    private final Map<String, ParticleInstance> instances = new LinkedHashMap<>();
    private final ParticleBudget budget = new ParticleBudget();
    private ParticleSink sink = ParticleSink.NONE;
    private long tick;

    private ParticleDirector() {}

    public static ParticleDirector get() { return INSTANCE; }

    /** The sink that receives newly spawned particle states; defaults to {@link ParticleSink#NONE}. */
    public ParticleSink sink() { return sink; }

    /** Injects the runtime sink (the MadParticle implementation, or a test sink). */
    public void sink(ParticleSink value) { sink = value == null ? ParticleSink.NONE : value; }

    /** The shared budget gate consulted by every emitter. */
    public ParticleBudget budget() { return budget; }

    /**
     * Parses and registers a definition, then attaches the scene handler that touches its instances.
     * Called by {@link ParticleScriptApi#scene(String, int, Object)} and by content reload.
     *
     * @throws IllegalArgumentException when the definition is invalid
     */
    public void register(String id, int version, JsonElement json) {
        var definition = DefinitionParser.parse(id, version, json);
        ClientPresentation.register("scene", id, version, frame -> touch(id, version, frame));
        definitions.put(id + "@" + version, definition);
    }

    /** The parsed definition, or null when that id/version was never registered. */
    public ParticleDefinition definition(String id, int version) {
        return definitions.get(id + "@" + version);
    }

    /** Live instances, keyed by scene key. */
    public Collection<ParticleInstance> instances() { return Collections.unmodifiableCollection(instances.values()); }

    /** Registered {@code id@version} keys. */
    public Collection<String> definitionKeys() { return Collections.unmodifiableCollection(definitions.keySet()); }

    /** Clears definitions and instances; invoked from {@link ClientPresentation#reset()}. */
    public void reset() {
        for (ParticleInstance instance : List.copyOf(instances.values())) instance.interrupt();
        definitions.clear();
        instances.clear();
        budget.refresh(List.of());
        tick = 0;
    }

    /** NeoForge client-tick bridge registered by {@code CoreClient}. */
    public static void onClientTick(ClientTickEvent.Post event) { INSTANCE.tick(); }

    /** Scene handler: mark the instance touched and refresh its per-frame overrides. */
    void touch(String id, int version, ClientFrame frame) {
        ParticleDefinition definition = definitions.get(id + "@" + version);
        if (definition == null) return;
        JsonObject entry = JsonParser.parseString(frame.data()).getAsJsonObject();
        String key = entry.has("key") && !entry.get("key").isJsonNull()
            ? entry.get("key").getAsString() : id + "@" + version;
        ParticleInstance instance = instances.get(key);
        if (instance == null) {
            try {
                instance = new ParticleInstance(key, definition, entry, ClientPresentation::reportFailure);
                instances.put(key, instance);
            } catch (RuntimeException failure) {
                ClientPresentation.reportFailure(key, failure.getMessage());
                return;
            }
        }
        try {
            instance.touch(entry, tick);
        } catch (RuntimeException failure) {
            instances.remove(key);
            instance.interrupt();
            ClientPresentation.reportFailure(key, failure.getMessage());
        }
    }

    /** Advances simulation and interrupts instances that were not touched since the previous tick. */
    public void tick() {
        tick++;
        MadParticleCompat.ensure();
        Minecraft mc = Minecraft.getInstance();
        if (mc == null || mc.level == null) {
            for (ParticleInstance instance : List.copyOf(instances.values())) instance.interrupt();
            instances.clear();
            budget.refresh(List.of());
            return;
        }
        if (mc.isPaused()) return;

        budget.refresh(instances.values());
        double cameraX = mc.gameRenderer.getMainCamera().getPosition().x;
        double cameraY = mc.gameRenderer.getMainCamera().getPosition().y;
        double cameraZ = mc.gameRenderer.getMainCamera().getPosition().z;
        for (var iterator = instances.entrySet().iterator(); iterator.hasNext(); ) {
            ParticleInstance instance = iterator.next().getValue();
            double lod = budget.lodFactor(mc.options.particles().get(),
                instance.distanceToSource(cameraX, cameraY, cameraZ));
            instance.tick(tick, lod, budget, sink);
            if (tick - instance.lastTouched() > STALE_TICKS) {
                if (instance.phase() != ParticleInstance.Phase.DONE) instance.interrupt();
                if (instance.phase() == ParticleInstance.Phase.DONE) iterator.remove();
            }
        }
    }
}
