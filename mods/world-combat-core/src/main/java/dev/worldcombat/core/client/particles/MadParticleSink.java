package dev.worldcombat.core.client.particles;

import cn.ussshenzhou.madparticle.api.AddParticleHelper;
import cn.ussshenzhou.madparticle.command.inheritable.InheritableBoolean;
import cn.ussshenzhou.madparticle.particle.MadParticleOption;
import cn.ussshenzhou.madparticle.particle.enums.ChangeMode;
import cn.ussshenzhou.madparticle.particle.enums.MetaKeys;
import cn.ussshenzhou.madparticle.particle.enums.ParticleRenderTypes;
import cn.ussshenzhou.madparticle.particle.enums.SpriteFrom;
import dev.worldcombat.core.client.ClientPresentation;
import java.util.function.ToIntFunction;
import net.minecraft.client.Minecraft;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.resources.ResourceLocation;
import org.joml.Vector2f;
import org.joml.Vector3f;

/**
 * {@link ParticleSink} implementation that translates each spawn into a MadParticle option and adds
 * it to the client particle queue. MadParticle simulates and renders from there, so this class reads
 * the spawn description once and holds no per-particle state.
 *
 * <p>The mapping is factored into pure static methods ({@link #option}, {@link #childOption},
 * {@link #meta}) so the conversions can be checked without a Minecraft level. Only {@link #spawn}
 * touches the client level and the particle queue.
 *
 * <p>Units follow the authored model: gravity and horizontal deflection are divided by MadParticle's
 * {@code 0.04} per-tick gravity unit, spin degrees/tick become roll revolutions/tick, and block
 * sizes become quad-scale multiples of MadParticle's roughly 0.15-block base quad.
 */
public final class MadParticleSink implements ParticleSink {
    public static final MadParticleSink INSTANCE = new MadParticleSink();

    /** MadParticle's initial quad size is randomised around 0.15 blocks; block sizes map by this. */
    static final double BASE_QUAD_SIZE = 0.15;
    /** MadParticle applies {@code yd -= 0.04 * gravity} per tick. */
    static final double MAD_GRAVITY_UNIT = 0.04;

    private MadParticleSink() {}

    private long spawnCalls;
    private long unknownTypes;
    private long failures;
    private String lastParticle = "";

    /** Number of spawn calls handed to MadParticle since startup; read by {@code /wcparticle stats}. */
    public long spawnCalls() { return spawnCalls; }

    /** Spawns dropped because the emitter's particle id is not a registered type. */
    public long unknownTypes() { return unknownTypes; }

    /** Spawns that threw while building or adding the MadParticle option. */
    public long failures() { return failures; }

    /** The particle id of the most recent spawn. */
    public String lastParticle() { return lastParticle; }

    @Override
    public void spawn(EmitterRuntime emitter, ParticleState state) {
        if (emitter == null) throw new IllegalArgumentException("MadParticleSink.spawn requires an emitter");
        if (state == null) throw new IllegalArgumentException("MadParticleSink.spawn requires a particle state");
        Minecraft minecraft = Minecraft.getInstance();
        if (minecraft == null || minecraft.level == null) return;
        ParticleDefinition.EmitterSpec spec = emitter.spec();
        String id = spec.particle();
        try {
            int target = resolveParticleId(id);
            if (target < 0) {
                unknownTypes++;
                ClientPresentation.reportFailure("particles/" + id, "unknown particle type '" + id + "'");
                return;
            }
            MadParticleOption option = option(spec, state, target, MadParticleSink::resolveParticleId);
            if (state.roll != 0f) {
                AddParticleHelper.addParticleClientAsync2Async(option, (float) Math.toRadians(state.roll));
            } else {
                AddParticleHelper.addParticleClient(option);
            }
            spawnCalls++;
            lastParticle = id;
        } catch (RuntimeException failure) {
            failures++;
            ClientPresentation.reportFailure("particles/" + id, failure.getMessage());
        }
    }

    /** Resolves a registered particle type id to its registry id, or -1 when unknown or malformed. */
    static int resolveParticleId(String id) {
        if (id == null || id.isBlank()) return -1;
        ResourceLocation key = ResourceLocation.tryParse(id);
        if (key == null || !BuiltInRegistries.PARTICLE_TYPE.containsKey(key)) return -1;
        return BuiltInRegistries.PARTICLE_TYPE.getId(BuiltInRegistries.PARTICLE_TYPE.get(key));
    }

    /**
     * Builds the MadParticle option for one spawn. Pure: the caller supplies the already-resolved
     * target registry id and a resolver for nested child particle ids.
     */
    static MadParticleOption option(ParticleDefinition.EmitterSpec spec, ParticleState state, int targetParticle,
                                    ToIntFunction<String> particleResolver) {
        if (spec == null) throw new IllegalArgumentException("MadParticle mapping requires an emitter spec");
        if (state == null) throw new IllegalArgumentException("MadParticle mapping requires a particle state");
        if (targetParticle < 0)
            throw new IllegalArgumentException("MadParticle mapping requires a resolved target particle, got " + targetParticle);
        if (particleResolver == null)
            throw new IllegalArgumentException("MadParticle mapping requires a child particle resolver");

        ParticleDefinition.CollisionSpec collision = spec.collision();
        ParticleDefinition.InteractSpec interact = spec.interact();
        boolean collide = collision != null && collision.bounces() > 0;

        int bounceTime = collide ? collision.bounces() : 0;
        float horizontalCollisionDiffuse = collide ? (float) collision.horizontalSpread() : 0f;
        float verticalCollisionBounce = collide ? (float) collision.verticalBounce() : 0f;
        float afterCollisionFriction = collide ? (float) collision.dragAfter() : 0f;
        float afterCollisionGravity = collide ? gravityToMad(collision.gravityAfter()) : 0f;
        float xDeflectionAfterCollision = collide && collision.deflectionAfter() != null
            ? deflectionToMad(collision.deflectionAfter().x) : 0f;
        float zDeflectionAfterCollision = collide && collision.deflectionAfter() != null
            ? deflectionToMad(collision.deflectionAfter().y) : 0f;

        Vector2f deflection = spec.deflection();
        float xDeflection = deflection == null ? 0f : deflectionToMad(deflection.x);
        float zDeflection = deflection == null ? 0f : deflectionToMad(deflection.y);

        Vector3f positionJitter = spec.positionJitter();
        Vector3f velocityJitter = spec.velocityJitter();

        boolean hasChild = spec.child() != null;
        MadParticleOption child = hasChild
            ? childOption(spec.child(), spec, state, targetParticle, particleResolver) : null;

        return new MadParticleOption(
            targetParticle,
            spriteFrom(spec.spriteFrom()),
            state.lifetime,
            InheritableBoolean.wrap(spec.alwaysRender()),
            spec.amount(),
            state.position.x, state.position.y, state.position.z,
            positionJitter == null ? 0f : positionJitter.x,
            positionJitter == null ? 0f : positionJitter.y,
            positionJitter == null ? 0f : positionJitter.z,
            state.velocity.x, state.velocity.y, state.velocity.z,
            velocityJitter == null ? 0f : velocityJitter.x,
            velocityJitter == null ? 0f : velocityJitter.y,
            velocityJitter == null ? 0f : velocityJitter.z,
            (float) spec.drag(),
            gravityToMad(spec.gravity()),
            InheritableBoolean.wrap(collide),
            bounceTime,
            horizontalCollisionDiffuse,
            verticalCollisionBounce,
            afterCollisionFriction,
            afterCollisionGravity,
            InheritableBoolean.wrap(interact != null),
            interact == null ? 0f : (float) interact.horizontal(),
            interact == null ? 0f : (float) interact.vertical(),
            renderType(spec.render()),
            red(state.color), green(state.color), blue(state.color),
            state.alpha,
            (float) spec.alphaEnd(),
            changeMode(spec.alphaMode()),
            sizeToScale(state.size),
            endScale(spec, state),
            changeMode(spec.sizeMode()),
            hasChild,
            child,
            spinToRollSpeed(spec.spin()),
            xDeflection,
            xDeflectionAfterCollision,
            zDeflection,
            zDeflectionAfterCollision,
            (float) spec.bloom(),
            meta(spec));
    }

    /**
     * Builds the child option MadParticle inherits from when the parent dies. Fields that
     * {@code MadParticleOption.inheritOrContinue} substitutes keep the documented sentinels
     * ({@code Integer.MAX_VALUE}, {@code Double.MAX_VALUE}, {@code Float.MAX_VALUE},
     * {@code InheritableBoolean.INHERIT}, {@code SpriteFrom.INHERIT}, {@code ChangeMode.INHERIT});
     * fields MadParticle copies verbatim (alpha, scale, friction, gravity, render, jitter) fall back
     * to the parent's concrete values so the child visually continues the parent.
     */
    static MadParticleOption childOption(ParticleDefinition.ChildParticleSpec child, ParticleDefinition.EmitterSpec parent,
                                         ParticleState state, int parentTargetParticle, ToIntFunction<String> particleResolver) {
        if (child == null) throw new IllegalArgumentException("MadParticle child mapping requires a child spec");
        if (parent == null) throw new IllegalArgumentException("MadParticle child mapping requires a parent spec");
        if (state == null) throw new IllegalArgumentException("MadParticle child mapping requires a particle state");
        if (parentTargetParticle < 0)
            throw new IllegalArgumentException("MadParticle child mapping requires a resolved parent particle, got " + parentTargetParticle);
        if (particleResolver == null)
            throw new IllegalArgumentException("MadParticle child mapping requires a particle resolver");

        int target = parentTargetParticle;
        if (child.particle() != null) {
            int resolved = particleResolver.applyAsInt(child.particle());
            if (resolved >= 0) target = resolved;
        }

        ParticleDefinition.CollisionSpec childCollision = child.collision();
        ParticleDefinition.CollisionSpec parentCollision = parent.collision();
        boolean hasCollision = childCollision != null;
        float parentAfterFriction = parentCollision != null ? (float) parentCollision.dragAfter() : (float) parent.drag();
        float parentAfterGravity = parentCollision != null
            ? gravityToMad(parentCollision.gravityAfter()) : gravityToMad(parent.gravity());
        float parentBeginScale = sizeToScale(state.size);
        float parentEndScale = endScale(parent, state);
        float parentBeginAlpha = state.alpha;
        float parentEndAlpha = (float) parent.alphaEnd();

        Vector3f positionJitter = child.positionJitter();
        Vector3f velocityJitter = child.velocityJitter();
        Vector2f deflection = child.deflection();
        Integer childColor = child.colorRamp() != null ? Integer.valueOf(child.colorRamp().rgb(0)) : child.color();

        boolean hasChild = child.child() != null;
        MadParticleOption nested = hasChild
            ? childOption(child.child(), parent, state, target, particleResolver) : null;

        return new MadParticleOption(
            target,
            child.spriteFrom() == null ? SpriteFrom.INHERIT : spriteFrom(child.spriteFrom()),
            child.lifetime() == null ? Integer.MAX_VALUE : child.lifetime(),
            InheritableBoolean.INHERIT,
            child.amount() == null ? 1 : child.amount(),
            Double.MAX_VALUE, Double.MAX_VALUE, Double.MAX_VALUE,
            positionJitter == null ? 0f : positionJitter.x,
            positionJitter == null ? 0f : positionJitter.y,
            positionJitter == null ? 0f : positionJitter.z,
            Double.MAX_VALUE, Double.MAX_VALUE, Double.MAX_VALUE,
            velocityJitter == null ? 0f : velocityJitter.x,
            velocityJitter == null ? 0f : velocityJitter.y,
            velocityJitter == null ? 0f : velocityJitter.z,
            child.drag() == null ? (float) parent.drag() : (float) (double) child.drag(),
            child.gravity() == null ? gravityToMad(parent.gravity()) : gravityToMad(child.gravity()),
            hasCollision ? InheritableBoolean.TRUE : InheritableBoolean.INHERIT,
            hasCollision ? childCollision.bounces() : Integer.MAX_VALUE,
            hasCollision ? (float) childCollision.horizontalSpread() : Float.MAX_VALUE,
            hasCollision ? (float) childCollision.verticalBounce() : Float.MAX_VALUE,
            hasCollision ? (float) childCollision.dragAfter() : parentAfterFriction,
            hasCollision ? gravityToMad(childCollision.gravityAfter()) : parentAfterGravity,
            InheritableBoolean.INHERIT,
            Float.MAX_VALUE, Float.MAX_VALUE,
            child.render() == null ? renderType(parent.render()) : renderType(child.render()),
            childColor == null ? Float.MAX_VALUE : red(childColor),
            childColor == null ? Float.MAX_VALUE : green(childColor),
            childColor == null ? Float.MAX_VALUE : blue(childColor),
            child.alphaBegin() == null ? parentBeginAlpha : (float) (double) child.alphaBegin(),
            child.alphaEnd() == null ? parentEndAlpha : (float) (double) child.alphaEnd(),
            child.alphaMode() == null ? ChangeMode.INHERIT : changeMode(child.alphaMode()),
            child.sizeBegin() == null ? parentBeginScale : sizeToScale(child.sizeBegin()),
            child.sizeEnd() == null ? parentEndScale : sizeToScale(child.sizeEnd()),
            child.sizeMode() == null ? ChangeMode.INHERIT : changeMode(child.sizeMode()),
            hasChild,
            nested,
            child.spin() == null ? Float.MAX_VALUE : spinToRollSpeed(child.spin()),
            deflection == null ? 0f : deflectionToMad(deflection.x),
            hasCollision && childCollision.deflectionAfter() != null
                ? deflectionToMad(childCollision.deflectionAfter().x) : 0f,
            deflection == null ? 0f : deflectionToMad(deflection.y),
            hasCollision && childCollision.deflectionAfter() != null
                ? deflectionToMad(childCollision.deflectionAfter().y) : 0f,
            child.bloom() == null ? Float.MAX_VALUE : (float) (double) child.bloom(),
            childMeta(child, parent));
    }

    /** Builds the MadParticle {@code meta} tag from the emitter's expressions, light and flags. */
    static CompoundTag meta(ParticleDefinition.EmitterSpec spec) {
        if (spec == null) throw new IllegalArgumentException("MadParticle meta requires an emitter spec");
        CompoundTag meta = new CompoundTag();
        ParticleDefinition.VelocityExprSpec velocity = spec.velocityExpr();
        if (velocity != null) {
            if (velocity.hasX()) meta.putString(MetaKeys.DX.get(), velocity.x());
            if (velocity.hasY()) meta.putString(MetaKeys.DY.get(), velocity.y());
            if (velocity.hasZ()) meta.putString(MetaKeys.DZ.get(), velocity.z());
        }
        writeLight(meta, spec.light());
        meta.putInt(MetaKeys.LIFE_ERROR.get(), spec.lifeJitter());
        if (spec.collision() != null && spec.collision().disappearAt() > 0)
            meta.putInt(MetaKeys.DISAPPEAR_ON_COLLISION.get(), spec.collision().disappearAt());
        if (spec.preCalculate()) meta.putBoolean(MetaKeys.PRE_CAL.get(), true);
        if (spec.reverse()) meta.putBoolean(MetaKeys.TENET.get(), true);
        return meta;
    }

    static CompoundTag childMeta(ParticleDefinition.ChildParticleSpec child, ParticleDefinition.EmitterSpec parent) {
        if (child == null) throw new IllegalArgumentException("MadParticle child meta requires a child spec");
        if (parent == null) throw new IllegalArgumentException("MadParticle child meta requires a parent spec");
        CompoundTag meta = new CompoundTag();
        ParticleDefinition.VelocityExprSpec velocity = child.velocityExpr();
        if (velocity != null) {
            if (velocity.hasX()) meta.putString(MetaKeys.DX.get(), velocity.x());
            if (velocity.hasY()) meta.putString(MetaKeys.DY.get(), velocity.y());
            if (velocity.hasZ()) meta.putString(MetaKeys.DZ.get(), velocity.z());
        }
        writeLight(meta, child.light() == null ? parent.light() : child.light());
        meta.putInt(MetaKeys.LIFE_ERROR.get(), child.lifeJitter() == null ? parent.lifeJitter() : child.lifeJitter());
        if (child.collision() != null && child.collision().disappearAt() > 0)
            meta.putInt(MetaKeys.DISAPPEAR_ON_COLLISION.get(), child.collision().disappearAt());
        return meta;
    }

    private static void writeLight(CompoundTag meta, ParticleDefinition.LightSpec light) {
        if (light == null) return;
        switch (light.kind()) {
            case FULL -> meta.putString(MetaKeys.LIGHT.get(), "15");
            case EXPR -> meta.putString(MetaKeys.LIGHT.get(), light.expr());
            case WORLD -> { }
        }
    }

    static float gravityToMad(double gravity) { return (float) (gravity / MAD_GRAVITY_UNIT); }

    static float deflectionToMad(double deflection) { return (float) (deflection / MAD_GRAVITY_UNIT); }

    static float spinToRollSpeed(double spin) { return (float) (spin / 360.0); }

    static float sizeToScale(double blocks) { return (float) (blocks / BASE_QUAD_SIZE); }

    static float red(int color) { return ((color >> 16) & 0xFF) / 255f; }

    static float green(int color) { return ((color >> 8) & 0xFF) / 255f; }

    static float blue(int color) { return (color & 0xFF) / 255f; }

    /** Maps the authored size segment end onto a scale, keeping the director's scale multiplier. */
    static float endScale(ParticleDefinition.EmitterSpec spec, ParticleState state) {
        double begin = spec.sizeBegin();
        if (begin <= 0) return sizeToScale(state.size);
        return sizeToScale(spec.sizeEnd() * (state.size / begin));
    }

    static SpriteFrom spriteFrom(ParticleDefinition.SpriteFrom from) {
        return switch (from) {
            case RANDOM -> SpriteFrom.RANDOM;
            case AGE -> SpriteFrom.AGE;
        };
    }

    static ChangeMode changeMode(ParticleDefinition.ChangeMode mode) {
        return switch (mode) {
            case LINEAR -> ChangeMode.LINEAR;
            case INDEX -> ChangeMode.INDEX;
            case SIN -> ChangeMode.SIN;
        };
    }

    static ParticleRenderTypes renderType(ParticleDefinition.RenderMode mode) {
        return switch (mode) {
            case INSTANCED -> ParticleRenderTypes.INSTANCED;
            case TRANSLUCENT -> ParticleRenderTypes.PARTICLE_SHEET_TRANSLUCENT;
            case OPAQUE -> ParticleRenderTypes.PARTICLE_SHEET_OPAQUE;
            case LIT -> ParticleRenderTypes.PARTICLE_SHEET_LIT;
        };
    }
}
