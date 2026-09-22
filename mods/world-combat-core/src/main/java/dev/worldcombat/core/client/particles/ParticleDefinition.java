package dev.worldcombat.core.client.particles;

import java.util.List;
import java.util.Map;
import org.joml.Vector2f;
import org.joml.Vector3f;

/**
 * Immutable authored particle model produced by {@link DefinitionParser} and consumed by the engine.
 *
 * <p>Units: time is ticks, positions are blocks, velocities blocks/tick, angles authored in degrees
 * (stored as authored), colours are {@code 0xRRGGBB}, alpha is 0..1 and curve abscissae are the
 * particle's normalized lifetime 0..1. An emitter or child may carry a {@link ColorGradient}
 * ({@code colorRamp}); a gradient is sampled over the owning moment's progress at each spawn.
 * The record fields are read-only by convention; callers must not mutate the contained vectors.
 *
 * <p>The parser resolves all defaults listed on the nested records, so an instance always carries
 * concrete values. Fields that may be absent are nullable and documented as such. Authoring format
 * v2 maps every particle onto MadParticle's {@code MadParticleOption}; the comments on
 * {@link EmitterSpec} name the corresponding MadParticle field.
 */
public record ParticleDefinition(Map<String, Moment> moments, ExitMode interrupt, DefinitionBindings bindings) {
    public ParticleDefinition(Map<String, Moment> moments, ExitMode interrupt) { this(moments, interrupt, null); }

    public ParticleDefinition {
        moments = moments == null ? Map.of() : Map.copyOf(moments);
        interrupt = interrupt == null ? ExitMode.DRAIN : interrupt;
    }

    /** Returns the moment with this name, or null when the definition does not declare it. */
    public Moment moment(String name) { return moments.get(name); }

    /** Resolves payload numeric leaves; static definitions retain their original model. */
    public ParticleDefinition resolve(com.google.gson.JsonObject data) {
        return bindings == null ? this : bindings.resolve(data);
    }

    /** Which anchor an emitter follows. {@code PATH} follows the vertices listed in {@code data.path}. */
    public enum Bind { SOURCE, TARGET, PROJECTILE, POINT, PATH }
    /** BODY scales offsets, shapes, sizes, speeds and trail spacing by the bound body; NONE keeps authored blocks. */
    public enum Fit { BODY, NONE }
    /**
     * How the shape's local frame is turned each tick. {@code FIXED} keeps the authored rotation; the others
     * turn local +Y toward {@code data.direction}, the target anchor, or the anchor's own motion.
     */
    public enum Orient { FIXED, DIRECTION, TOWARD, VELOCITY }

    /**
     * Initial velocity direction policy. {@code FIXED} uses {@link EmitterSpec#fixedDirection()};
     * all other values are relative to the emitter's anchor or shape.
     */
    public enum Direction { SHAPE, UP, DOWN, OUTWARD, INWARD, TOWARD, AWAY, VELOCITY, FIXED }

    /** Built-in particle render layer. Maps to MadParticle's {@code ParticleRenderTypes}. */
    public enum RenderMode { INSTANCED, TRANSLUCENT, OPAQUE, LIT }

    /** How a scale/alpha segment is interpolated over life. Maps to MadParticle's {@code ChangeMode}. */
    public enum ChangeMode { LINEAR, INDEX, SIN }

    /** Which sprite of a multi-texture particle type is shown. Maps to MadParticle's {@code SpriteFrom}. */
    public enum SpriteFrom { RANDOM, AGE }

    /** Particle lighting source. */
    public enum LightKind { WORLD, FULL, EXPR }

    /** How an instance leaves when the server releases the key. */
    public enum ExitMode { DRAIN, HIDE }

    /** What triggers a child emitter group. */
    public enum ChildTrigger { BIRTH, EVENT }

    /**
     * One authored phase. {@code duration} is in ticks; {@code 0} means "until the server releases
     * the key". {@code stop} is the tick at which emission stops (default {@code duration}), and
     * {@code drain} is how many further ticks to wait for surviving particles (default 40).
     */
    public record Moment(int duration, int stop, int drain, List<EmitterSpec> emitters, List<ChildSpec> children) {
        public Moment {
            duration = Math.max(0, duration);
            stop = Math.max(0, stop);
            drain = Math.max(0, drain);
            emitters = emitters == null ? List.of() : List.copyOf(emitters);
            children = children == null ? List.of() : List.copyOf(children);
        }

        /** True when this moment runs until the server releases the key. */
        public boolean indefinite() { return duration == 0; }
    }

    /**
     * A burst/repeat pattern. {@code count} particles fire at {@code at + n * interval} for
     * {@code repeats} times; {@code interval} defaults to 1, {@code repeats} to 1 and {@code at}
     * to 0. All values are ticks.
     */
    public record BurstSpec(int count, int interval, int repeats, int at) {
        public BurstSpec {
            count = Math.max(0, count);
            interval = Math.max(1, interval);
            repeats = Math.max(1, repeats);
            at = Math.max(0, at);
        }
    }

    /**
     * Per-axis velocity expressions in blocks/tick. Each nullable axis is an exp4j expression whose
     * only variable is {@code t}, the particle's normalized lifetime 0..1; a declared axis overrides
     * gravity, drag and deflection on that axis. Null means "no expression on this axis".
     */
    public record VelocityExprSpec(String x, String y, String z) {
        public VelocityExprSpec {
            if (x == null && y == null && z == null)
                throw new IllegalArgumentException("Velocity expressions require at least one axis");
        }

        public boolean hasX() { return x != null; }
        public boolean hasY() { return y != null; }
        public boolean hasZ() { return z != null; }
    }

    /**
     * Collision behaviour, mapped to MadParticle's collision fields. {@code bounces} is the number of
     * bounces before the particle disappears (MadParticle {@code bounceTime}); zero disables
     * collision. {@code disappearAt} maps to MadParticle's {@code DISAPPEAR_ON_COLLISION} meta and
     * uses the same convention: 0 means "never disappear on collision".
     */
    public record CollisionSpec(
        int bounces,
        double horizontalSpread,
        double verticalBounce,
        double dragAfter,
        double gravityAfter,
        Vector2f deflectionAfter,
        int disappearAt
    ) {
        public CollisionSpec {
            if (bounces < 0) throw new IllegalArgumentException("Collision bounces must be at least 0, got " + bounces);
            if (!Double.isFinite(horizontalSpread) || horizontalSpread < 0)
                throw new IllegalArgumentException("Collision horizontalSpread must be a finite value >= 0, got " + horizontalSpread);
            if (!Double.isFinite(verticalBounce) || verticalBounce < 0 || verticalBounce > 1)
                throw new IllegalArgumentException("Collision verticalBounce must be in 0..1, got " + verticalBounce);
            if (!Double.isFinite(dragAfter) || dragAfter < 0 || dragAfter > 1)
                throw new IllegalArgumentException("Collision dragAfter must be in 0..1, got " + dragAfter);
            if (!Double.isFinite(gravityAfter))
                throw new IllegalArgumentException("Collision gravityAfter must be finite, got " + gravityAfter);
            if (disappearAt < 0) throw new IllegalArgumentException("Collision disappearAt must be at least 0, got " + disappearAt);
            deflectionAfter = deflectionAfter == null ? null : new Vector2f(deflectionAfter);
        }
    }

    /**
     * Near-entity motion response. Maps to MadParticle's {@code interactWithEntity} horizontal and
     * vertical factors; a particle using it ticks on the main thread.
     */
    public record InteractSpec(double horizontal, double vertical) {
        public InteractSpec {
            if (!Double.isFinite(horizontal) || !Double.isFinite(vertical))
                throw new IllegalArgumentException("Interact factors must be finite, got [" + horizontal + ", " + vertical + "]");
        }
    }

    /** Particle lighting: world light, full bright, or an exp4j expression 0..15 in {@code t}. */
    public record LightSpec(LightKind kind, String expr) {
        public LightSpec {
            kind = kind == null ? LightKind.WORLD : kind;
            if (kind == LightKind.EXPR && (expr == null || expr.isBlank()))
                throw new IllegalArgumentException("Expression light requires a non-blank expression");
        }

        public static LightSpec world() { return new LightSpec(LightKind.WORLD, null); }
        public static LightSpec full() { return new LightSpec(LightKind.FULL, null); }
        public static LightSpec expression(String expr) { return new LightSpec(LightKind.EXPR, expr); }

        public boolean isExpression() { return kind == LightKind.EXPR; }
    }

    /**
     * A child particle spawned by MadParticle when the parent dies. Every field is nullable to mean
     * "inherit from the parent"; nested {@code child} is nullable and may nest arbitrarily. Field
     * names match {@link EmitterSpec}'s particle-side fields so inheritance reads naturally.
     */
    public record ChildParticleSpec(
        String particle,
        SpriteFrom spriteFrom,
        Integer lifetime,
        Integer lifeJitter,
        Double sizeBegin,
        Double sizeEnd,
        ChangeMode sizeMode,
        Integer color,
        Double alphaBegin,
        Double alphaEnd,
        ChangeMode alphaMode,
        Double spin,
        Double gravity,
        Double drag,
        Vector2f deflection,
        VelocityExprSpec velocityExpr,
        CollisionSpec collision,
        RenderMode render,
        LightSpec light,
        Double bloom,
        Integer amount,
        Vector3f positionJitter,
        Vector3f velocityJitter,
        ChildParticleSpec child,
        ColorGradient colorRamp
    ) {
        public ChildParticleSpec {
            if (particle != null && particle.isBlank())
                throw new IllegalArgumentException("Child particle id must not be blank");
            if (lifetime != null && lifetime < 1)
                throw new IllegalArgumentException("Child particle lifetime must be at least 1, got " + lifetime);
            if (lifeJitter != null && (lifeJitter < 0 || lifeJitter > 100))
                throw new IllegalArgumentException("Child particle lifeJitter must be in 0..100, got " + lifeJitter);
            if (sizeBegin != null && (!Double.isFinite(sizeBegin) || sizeBegin < 0))
                throw new IllegalArgumentException("Child particle sizeBegin must be finite and >= 0, got " + sizeBegin);
            if (sizeEnd != null && (!Double.isFinite(sizeEnd) || sizeEnd < 0))
                throw new IllegalArgumentException("Child particle sizeEnd must be finite and >= 0, got " + sizeEnd);
            if (alphaBegin != null && (!Double.isFinite(alphaBegin) || alphaBegin < 0 || alphaBegin > 1))
                throw new IllegalArgumentException("Child particle alphaBegin must be in 0..1, got " + alphaBegin);
            if (alphaEnd != null && (!Double.isFinite(alphaEnd) || alphaEnd < 0 || alphaEnd > 1))
                throw new IllegalArgumentException("Child particle alphaEnd must be in 0..1, got " + alphaEnd);
            if (drag != null && (!Double.isFinite(drag) || drag < 0 || drag > 1))
                throw new IllegalArgumentException("Child particle drag must be in 0..1, got " + drag);
            if (amount != null && amount < 1)
                throw new IllegalArgumentException("Child particle amount must be at least 1, got " + amount);
            if (color != null) color &= 0xFFFFFF;
            positionJitter = positionJitter == null ? null : new Vector3f(positionJitter);
            velocityJitter = velocityJitter == null ? null : new Vector3f(velocityJitter);
            deflection = deflection == null ? null : new Vector2f(deflection);
        }
    }

    /**
     * A child emitter group. {@code on} selects the trigger, {@code of} optionally restricts it to
     * one emitter name and {@code event} names a manual {@code event.name}. The {@code emit}
     * emitters spawn once at the triggering particle's position.
     */
    public record ChildSpec(ChildTrigger on, String of, String event, List<EmitterSpec> emit) {
        public ChildSpec {
            on = on == null ? ChildTrigger.BIRTH : on;
            emit = emit == null ? List.of() : List.copyOf(emit);
        }
    }

    /**
     * One emitter definition, v2. Defaults: {@code spriteFrom} age (multi-frame types play across the lifetime), {@code bind} source,
     * {@code height} 0.5, {@code start} 0, {@code stop} the owning moment's stop, {@code amount} 1,
     * {@code lifeJitter} 0, {@code sizeMode}/{@code alphaMode} linear, {@code color} 0xFFFFFF,
     * {@code alpha} 1, {@code spin} 0, {@code gravity} 0, {@code drag} 1, {@code render} instanced,
     * {@code light} world, {@code bloom} 0, {@code maxParticles} unlimited.
     *
     * <p>The record's Javadoc on each field names the MadParticle option it maps to on the client.
     * Nullable: {@code trailMinDistance}, {@code rate}, {@code burst}, {@code speed}, {@code spread},
     * {@code fixedDirection}, {@code positionJitter}, {@code velocityJitter}, {@code roll},
     * {@code deflection}, {@code velocityExpr}, {@code collision}, {@code interact}, {@code child}.
     */
    public record EmitterSpec(
        String name,
        String particle,
        SpriteFrom spriteFrom,
        Bind bind,
        Vector3f offset,
        double height,
        Fit fit,
        Orient orient,
        Double trailMinDistance,
        int start,
        int stop,
        Value rate,
        BurstSpec burst,
        Shape shape,
        Value speed,
        Value spread,
        Direction direction,
        Vector3f fixedDirection,
        int amount,
        Vector3f positionJitter,
        Vector3f velocityJitter,
        Value lifetime,
        int lifeJitter,
        double sizeBegin,
        double sizeEnd,
        ChangeMode sizeMode,
        int color,
        double alphaBegin,
        double alphaEnd,
        ChangeMode alphaMode,
        Value roll,
        double spin,
        double gravity,
        double drag,
        Vector2f deflection,
        VelocityExprSpec velocityExpr,
        CollisionSpec collision,
        InteractSpec interact,
        RenderMode render,
        LightSpec light,
        boolean alwaysRender,
        double bloom,
        boolean preCalculate,
        boolean reverse,
        ChildParticleSpec child,
        int maxParticles,
        ColorGradient colorRamp
    ) {
        public EmitterSpec {
            if (name == null || name.isBlank()) throw new IllegalArgumentException("Emitter requires a name");
            if (particle == null || particle.isBlank())
                throw new IllegalArgumentException("Emitter '" + name + "' requires a particle id");
            if (lifetime == null) throw new IllegalArgumentException("Emitter '" + name + "' requires a lifetime");
            spriteFrom = spriteFrom == null ? SpriteFrom.AGE : spriteFrom;
            bind = bind == null ? Bind.SOURCE : bind;
            // Entity-bound emitters follow the body by default; point- and path-bound ones are world geometry.
            fit = fit == null ? (bind == Bind.POINT || bind == Bind.PATH ? Fit.NONE : Fit.BODY) : fit;
            orient = orient == null ? Orient.FIXED : orient;
            offset = offset == null ? new Vector3f() : new Vector3f(offset);
            direction = direction == null ? Direction.SHAPE : direction;
            fixedDirection = fixedDirection == null ? null : new Vector3f(fixedDirection);
            if (amount < 1) throw new IllegalArgumentException("Emitter '" + name + "' field amount must be at least 1, got " + amount);
            if (lifeJitter < 0 || lifeJitter > 100)
                throw new IllegalArgumentException("Emitter '" + name + "' field lifeJitter must be in 0..100, got " + lifeJitter);
            if (!Double.isFinite(sizeBegin) || sizeBegin < 0)
                throw new IllegalArgumentException("Emitter '" + name + "' field sizeBegin must be finite and >= 0, got " + sizeBegin);
            if (!Double.isFinite(sizeEnd) || sizeEnd < 0)
                throw new IllegalArgumentException("Emitter '" + name + "' field sizeEnd must be finite and >= 0, got " + sizeEnd);
            sizeMode = sizeMode == null ? ChangeMode.LINEAR : sizeMode;
            color &= 0xFFFFFF;
            if (!Double.isFinite(alphaBegin) || alphaBegin < 0 || alphaBegin > 1)
                throw new IllegalArgumentException("Emitter '" + name + "' field alphaBegin must be in 0..1, got " + alphaBegin);
            if (!Double.isFinite(alphaEnd) || alphaEnd < 0 || alphaEnd > 1)
                throw new IllegalArgumentException("Emitter '" + name + "' field alphaEnd must be in 0..1, got " + alphaEnd);
            alphaMode = alphaMode == null ? ChangeMode.LINEAR : alphaMode;
            if (!Double.isFinite(spin)) throw new IllegalArgumentException("Emitter '" + name + "' field spin must be finite, got " + spin);
            if (!Double.isFinite(gravity)) throw new IllegalArgumentException("Emitter '" + name + "' field gravity must be finite, got " + gravity);
            if (!Double.isFinite(drag) || drag < 0 || drag > 1)
                throw new IllegalArgumentException("Emitter '" + name + "' field drag must be in 0..1, got " + drag);
            positionJitter = positionJitter == null ? null : new Vector3f(positionJitter);
            velocityJitter = velocityJitter == null ? null : new Vector3f(velocityJitter);
            deflection = deflection == null ? null : new Vector2f(deflection);
            render = render == null ? RenderMode.INSTANCED : render;
            light = light == null ? LightSpec.world() : light;
            if (!Double.isFinite(bloom)) throw new IllegalArgumentException("Emitter '" + name + "' field bloom must be finite, got " + bloom);
            if (maxParticles < 0) throw new IllegalArgumentException("Emitter '" + name + "' field maxParticles must be at least 0, got " + maxParticles);
        }

        /** True when this emitter spawns along the anchor's recorded path instead of at the anchor. */
        public boolean trails() { return trailMinDistance != null; }

        /** True when this emitter may spawn continuously (as opposed to burst-only). */
        public boolean continuous() { return rate != null; }

        /** True when the particle cap is active. */
        public boolean capped() { return maxParticles > 0; }
    }
}
