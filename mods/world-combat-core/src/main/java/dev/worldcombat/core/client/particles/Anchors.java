package dev.worldcombat.core.client.particles;

import com.google.gson.JsonObject;
import java.util.UUID;
import net.minecraft.client.Minecraft;
import org.joml.Vector3d;
import org.joml.Vector3f;

/**
 * Anchor factory and the two concrete bindings. Owned by wave 3. Entity anchors look the entity up
 * once and keep the reference while it stays in the level, so per-tick resolution is O(1).
 */
public final class Anchors {
    private Anchors() {}

    /** The default height fraction used when a binding has no explicit height. */
    public static final double DEFAULT_HEIGHT = 0.5;

    /**
     * Builds the base anchor for a binding from a server entry.
     *
     * @param bind       the emitter's binding kind
     * @param data       the entry's {@code data} object ({@code target}, {@code projectile}, {@code point})
     * @param sourceRef  the entry's {@code source} reference, used for {@link ParticleDefinition.Bind#SOURCE}
     * @return an anchor that resolves the bound point with no emitter offset applied
     */
    public static Anchor of(ParticleDefinition.Bind bind, JsonObject data, String sourceRef) {
        return switch (bind) {
            case SOURCE -> entity(uuid(sourceRef), new Vector3f(), DEFAULT_HEIGHT);
            case TARGET -> entity(uuid(string(data, "target")), new Vector3f(), DEFAULT_HEIGHT);
            case PROJECTILE -> entity(uuid(string(data, "projectile")), new Vector3f(), DEFAULT_HEIGHT);
            case POINT -> {
                var point = vector(data, "point", new Vector3f());
                yield new PointAnchor(point.x, point.y, point.z);
            }
            case PATH -> path(data, sourceRef, new Vector3f(), DEFAULT_HEIGHT);
        };
    }

    /** An entity anchor with an emitter offset and body-height fraction; the offset stays in blocks. */
    public static Anchor entity(UUID id, Vector3f offset, double heightFraction) {
        return new EntityAnchor(id, offset, heightFraction, false);
    }

    /** An entity anchor whose offset is scaled by the body factor when {@code fit} is set. */
    public static Anchor entity(UUID id, Vector3f offset, double heightFraction, boolean fit) {
        return new EntityAnchor(id, offset, heightFraction, fit);
    }

    /** Reference body of a medium combatant; factor 1 for it, clamped to 0.4..4 for others. */
    public static final double REFERENCE_WIDTH = 0.9, REFERENCE_HEIGHT = 1.4;
    public static double bodyFactor(double width, double height) {
        if (!(width > 0) && !(height > 0)) return 1;
        return Math.clamp((width + height) / (REFERENCE_WIDTH + REFERENCE_HEIGHT), 0.4, 4.0);
    }

    /** A fixed world point. */
    public static Anchor point(double x, double y, double z) {
        return new PointAnchor(x, y, z);
    }

    /**
     * Vertices for a {@code path} binding from {@code data.path}: each element is an entity reference
     * ({@code "source"}, {@code "target"}, {@code "projectile"} or a UUID) or a {@code [x, y, z]} point.
     * Entity vertices sit at {@code heightFraction} of the body plus {@code offset}; points get the offset.
     * Returns null when the payload has no usable path.
     */
    public static PathAnchor path(JsonObject data, String sourceRef, Vector3f offset, double heightFraction) {
        var vertices = vertices(data, sourceRef, offset, heightFraction);
        return vertices == null ? null : new PathAnchor(vertices);
    }

    static java.util.List<Anchor> vertices(JsonObject data, String sourceRef, Vector3f offset, double heightFraction) {
        if (data == null || !data.has("path") || !data.get("path").isJsonArray()) return null;
        var list = new java.util.ArrayList<Anchor>();
        for (var element : data.getAsJsonArray("path")) {
            if (element.isJsonArray() && element.getAsJsonArray().size() == 3) {
                var a = element.getAsJsonArray();
                list.add(new PointAnchor(a.get(0).getAsDouble() + offset.x, a.get(1).getAsDouble() + offset.y, a.get(2).getAsDouble() + offset.z));
            } else if (element.isJsonPrimitive() && element.getAsJsonPrimitive().isString()) {
                String reference = element.getAsString();
                UUID id = switch (reference) {
                    case "source" -> uuid(sourceRef);
                    case "target" -> uuid(string(data, "target"));
                    case "projectile" -> uuid(string(data, "projectile"));
                    default -> uuid(reference);
                };
                if (id != null) list.add(new EntityAnchor(id, offset, heightFraction, false));
            }
        }
        return list.isEmpty() ? null : list;
    }

    /**
     * The entity UUID a binding refers to, or null when the entry never supplied it. Point binds have
     * no entity and always return null.
     */
    public static UUID uuidOf(ParticleDefinition.Bind bind, JsonObject data, String sourceRef) {
        if (bind == null) return null;
        return switch (bind) {
            case SOURCE -> uuid(sourceRef);
            case TARGET -> uuid(string(data, "target"));
            case PROJECTILE -> uuid(string(data, "projectile"));
            case POINT, PATH -> null;
        };
    }

    /**
     * Builds a point anchor from {@code data.point}, falling back to the entry {@code position}, then
     * the origin. Used by {@link ParticleDefinition.Bind#POINT} when the server only sent a position.
     */
    public static Anchor pointOf(JsonObject data, JsonObject entry) {
        Vector3f value = vector(data, "point", null);
        if (value == null) value = vector(entry, "position", null);
        if (value == null) return new PointAnchor(0, 0, 0);
        return new PointAnchor(value.x, value.y, value.z);
    }

    private static UUID uuid(String reference) {
        if (reference == null || reference.isBlank()) return null;
        try { return UUID.fromString(reference.split("/", 2)[0]); }
        catch (IllegalArgumentException ignored) { return null; }
    }

    private static String string(JsonObject data, String key) {
        return data != null && data.has(key) && !data.get(key).isJsonNull() ? data.get(key).getAsString() : null;
    }

    private static Vector3f vector(JsonObject data, String key, Vector3f fallback) {
        if (data == null || !data.has(key) || !data.get(key).isJsonArray()) return fallback;
        var values = data.getAsJsonArray(key);
        if (values.size() != 3) return fallback;
        return new Vector3f(values.get(0).getAsFloat(), values.get(1).getAsFloat(), values.get(2).getAsFloat());
    }

    /** Follows an entity UUID, interpolated per render frame. */
    public static final class EntityAnchor implements Anchor {
        private final UUID id;
        private final Vector3f offset;
        private final double heightFraction;
        private final boolean fit;
        private EntityRef cached;

        public EntityAnchor(UUID id, Vector3f offset, double heightFraction, boolean fit) {
            this.id = id;
            this.offset = offset == null ? new Vector3f() : new Vector3f(offset);
            this.heightFraction = heightFraction;
            this.fit = fit;
        }

        @Override
        public boolean resolve(float partialTick, Vector3d out) {
            var mc = Minecraft.getInstance();
            if (id == null || mc == null || mc.level == null) { cached = null; return false; }
            var found = cached != null && !cached.entity.isRemoved() && cached.entity.level() == mc.level ? cached.entity : null;
            if (found == null) {
                // Level.getEntities() is not public on the client; iterate once and keep the reference.
                for (var entity : mc.level.entitiesForRendering()) {
                    if (entity.getUUID().equals(id) && !entity.isRemoved()) { found = entity; break; }
                }
                if (found == null) { cached = null; return false; }
                cached = new EntityRef(found);
            }
            var position = found.getPosition((float) Math.clamp(partialTick, 0, 1));
            double body = found.getBbHeight();
            double factor = fit ? cached.bodyFactor() : 1;
            out.set(position.x + offset.x * factor, position.y + body * heightFraction + offset.y * factor, position.z + offset.z * factor);
            return true;
        }

        @Override
        public double height() { return cached == null ? 0 : cached.height(); }

        @Override
        public double bodyFactor() { return cached == null ? 1 : cached.bodyFactor(); }

        @Override
        public boolean valid() { return cached != null; }
    }

    /** Fixed world point. */
    public record PointAnchor(double x, double y, double z) implements Anchor {
        @Override public boolean resolve(float partialTick, Vector3d out) { out.set(x, y, z); return true; }
        @Override public double height() { return 0; }
        @Override public boolean valid() { return true; }
    }

    /**
     * An ordered set of vertices. Resolves to their centroid; {@link #vertices} hands the resolved
     * positions to path shapes. Vertices that cannot be resolved this frame are left out.
     */
    public static final class PathAnchor implements Anchor {
        private java.util.List<Anchor> vertices;
        private Vector3d[] scratch = new Vector3d[0];
        private int resolved;

        PathAnchor(java.util.List<Anchor> vertices) { this.vertices = vertices; }

        /** Replaces the vertex list when a later payload carries a different {@code data.path}. */
        public void update(java.util.List<Anchor> vertices) { if (vertices != null) this.vertices = vertices; }

        /** Resolves every vertex; returns how many resolved and fills {@code centroid} with their mean. */
        public int vertices(Vector3d centroid) {
            if (scratch.length < vertices.size()) {
                var grown = new Vector3d[vertices.size()];
                for (int i = 0; i < grown.length; i++) grown[i] = i < scratch.length ? scratch[i] : new Vector3d();
                scratch = grown;
            }
            resolved = 0; centroid.set(0, 0, 0);
            for (var vertex : vertices) if (vertex.resolve(1f, scratch[resolved])) { centroid.add(scratch[resolved]); resolved++; }
            if (resolved > 0) centroid.div(resolved);
            return resolved;
        }

        /** Positions filled by the last {@link #vertices} call, valid up to the returned count. */
        public Vector3d[] positions() { return scratch; }

        @Override public boolean resolve(float partialTick, Vector3d out) { return vertices(out) > 0; }
        @Override public double height() { return 0; }
        @Override public boolean valid() { return resolved > 0; }
    }

    /** Snapshot of a resolved entity, so {@link #height()} and {@link #valid()} stay stable. */
    private record EntityRef(net.minecraft.world.entity.Entity entity) {
        double height() { return entity.isRemoved() ? 0 : entity.getBbHeight(); }
        double bodyFactor() { return entity.isRemoved() ? 1 : Anchors.bodyFactor(entity.getBbWidth(), entity.getBbHeight()); }
    }
}
