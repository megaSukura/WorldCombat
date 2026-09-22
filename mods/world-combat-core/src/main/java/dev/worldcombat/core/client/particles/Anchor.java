package dev.worldcombat.core.client.particles;

import org.joml.Vector3d;

/**
 * A runtime binding resolved to a world position each frame. Implementations may be backed by an
 * entity or a fixed world point. Pure interface; no Minecraft dependency (see {@link Anchors}).
 */
public interface Anchor {
    /**
     * Resolves the current world position.
     *
     * @param partialTick render interpolation factor 0..1
     * @param out         receives the position in blocks
     * @return false when the anchor is currently unresolvable (for example, the entity is gone)
     */
    boolean resolve(float partialTick, Vector3d out);

    /** The bound entity's height in blocks, or 0 for point anchors. */
    double height();

    /**
     * Body scale relative to a medium combatant (about 0.9 blocks wide and 1.4 tall), clamped to
     * 0.4..4. Emitters with {@code fit: "body"} multiply their offsets, shapes, sizes and speeds by it,
     * so one definition reads the same on a small and on a huge body. Point anchors return 1.
     */
    default double bodyFactor() { return 1; }

    /** True while the anchor can still resolve. */
    boolean valid();
}
