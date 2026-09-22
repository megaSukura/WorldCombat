package dev.worldcombat.core.client.particles;

import cn.ussshenzhou.madparticle.command.inheritable.InheritableBoolean;
import cn.ussshenzhou.madparticle.particle.MadParticleOption;
import cn.ussshenzhou.madparticle.particle.enums.ChangeMode;
import cn.ussshenzhou.madparticle.particle.enums.MetaKeys;
import cn.ussshenzhou.madparticle.particle.enums.ParticleRenderTypes;
import cn.ussshenzhou.madparticle.particle.enums.SpriteFrom;
import com.google.gson.JsonParser;
import java.util.function.ToIntFunction;
import net.minecraft.nbt.CompoundTag;

/**
 * Pure-logic checks for the {@link MadParticleSink} mapping. Parses authored JSON into emitter specs
 * and asserts the converted MadParticle fields without touching a Minecraft level. Owned by the
 * sink-types module.
 */
public final class MadParticleMappingChecks {
    private MadParticleMappingChecks() {}

    private static final int PARENT_PARTICLE = 7;
    private static final ToIntFunction<String> RESOLVER = id -> switch (id) {
        case "world_combat_core:cobblemon/balls/afterspark" -> 42;
        case "world_combat_core:cobblemon/invisible" -> 43;
        default -> -1;
    };

    public static void main(String[] args) {
        gravity();
        drag();
        spin();
        scale();
        colour();
        collision();
        deflection();
        renderTypes();
        meta();
        childSentinels();
        childOverrides();
        unknownChildFallsBackToParent();
        System.out.println("MadParticleMappingChecks PASS");
    }

    private static void gravity() {
        MadParticleOption option = option(basic("\"gravity\":0.04"));
        near(option.gravity(), 1f, "gravity 0.04 should map to MadParticle gravity 1");
        near(MadParticleSink.gravityToMad(-0.08), -2f, "negative gravity should scale");
    }

    private static void drag() {
        MadParticleOption option = option(basic("\"drag\":0.5"));
        near(option.friction(), 0.5f, "drag should pass through as friction");
    }

    private static void spin() {
        MadParticleOption option = option(basic("\"spin\":360"));
        near(option.rollSpeed(), 1f, "360 degrees/tick should map to one revolution/tick");
        near(MadParticleSink.spinToRollSpeed(90), 0.25f, "90 degrees/tick should map to 0.25");
    }

    private static void scale() {
        var spec = emitter(FIELDS.replace("\"size\":0.15", "\"size\":[0.15,0.3]"));
        var state = state(20, 0.15, 0xFFFFFF, 1f);
        MadParticleOption option = MadParticleSink.option(spec, state, PARENT_PARTICLE, RESOLVER);
        near(option.beginScale(), 1f, "0.15 blocks should map to scale 1");
        near(option.endScale(), 2f, "0.3 blocks should map to scale 2");

        near(MadParticleSink.sizeToScale(0.3), 2f, "sizeToScale 0.3");
        var single = state(20, 0.3, 0xFFFFFF, 1f);
        near(MadParticleSink.option(basic(""), single, PARENT_PARTICLE, RESOLVER).beginScale(), 2f, "state size 0.3");
    }

    private static void colour() {
        // The director folds the emitter colour and instance tint into state.color before the sink.
        MadParticleOption option =
            MadParticleSink.option(basic(""), state(20, 0.15, 0x336699, 1f), PARENT_PARTICLE, RESOLVER);
        near(option.r(), 0x33 / 255f, "red channel");
        near(option.g(), 0x66 / 255f, "green channel");
        near(option.b(), 0x99 / 255f, "blue channel");
    }

    private static void collision() {
        MadParticleOption option = option(basic(
            "\"collision\":{\"bounces\":2,\"horizontalSpread\":1.5,\"verticalBounce\":0.5,\"dragAfter\":0.25,\"gravityAfter\":0.08}"));
        if (option.collision() != InheritableBoolean.TRUE) throw new AssertionError("collision should be enabled");
        if (option.bounceTime() != 2) throw new AssertionError("bounceTime should be 2, got " + option.bounceTime());
        near(option.horizontalRelativeCollisionDiffuse(), 1.5f, "horizontal spread");
        near(option.verticalRelativeCollisionBounce(), 0.5f, "vertical bounce");
        near(option.afterCollisionFriction(), 0.25f, "after-collision friction");
        near(option.afterCollisionGravity(), 2f, "collision gravityAfter 0.08 should become 2");

        MadParticleOption disabled = option(basic(""));
        if (disabled.collision() != InheritableBoolean.FALSE) throw new AssertionError("collision should default to false");
        if (disabled.bounceTime() != 0) throw new AssertionError("bounceTime should default to 0");
    }

    private static void deflection() {
        MadParticleOption option = option(basic("\"deflection\":[0.04,-0.08]"));
        near(option.xDeflection(), 1f, "x deflection");
        near(option.zDeflection(), -2f, "z deflection");
    }

    private static void renderTypes() {
        if (option(basic("")).renderType() != ParticleRenderTypes.INSTANCED)
            throw new AssertionError("default render should be instanced");
        if (option(basic("\"render\":\"translucent\"")).renderType() != ParticleRenderTypes.PARTICLE_SHEET_TRANSLUCENT)
            throw new AssertionError("translucent render mapping");
        if (option(basic("\"render\":\"opaque\"")).renderType() != ParticleRenderTypes.PARTICLE_SHEET_OPAQUE)
            throw new AssertionError("opaque render mapping");
        if (option(basic("\"render\":\"lit\"")).renderType() != ParticleRenderTypes.PARTICLE_SHEET_LIT)
            throw new AssertionError("lit render mapping");
        if (option(basic("\"spriteFrom\":\"age\"")).spriteFrom() != SpriteFrom.AGE)
            throw new AssertionError("age sprite mapping");
    }

    private static void meta() {
        MadParticleOption option = option(basic(
            "\"light\":\"full\",\"lifeJitter\":25,\"preCalculate\":true,\"reverse\":true,\"velocity\":{\"x\":\"t\"},"
                + "\"collision\":{\"bounces\":1,\"disappearAt\":3}"));
        CompoundTag meta = option.meta();
        if (!meta.contains(MetaKeys.DX.get()) || !"t".equals(meta.getString(MetaKeys.DX.get())))
            throw new AssertionError("DX expression should be present");
        if (meta.contains(MetaKeys.DY.get())) throw new AssertionError("DY expression should be absent");
        if (!"15".equals(meta.getString(MetaKeys.LIGHT.get()))) throw new AssertionError("full light should be 15");
        if (meta.getInt(MetaKeys.LIFE_ERROR.get()) != 25) throw new AssertionError("life jitter should be written");
        if (!meta.getBoolean(MetaKeys.PRE_CAL.get())) throw new AssertionError("preCalculate should set PRE_CAL");
        if (!meta.getBoolean(MetaKeys.TENET.get())) throw new AssertionError("reverse should set TENET");
        if (meta.getInt(MetaKeys.DISAPPEAR_ON_COLLISION.get()) != 3)
            throw new AssertionError("disappearAt should set DISAPPEAR_ON_COLLISION");

        CompoundTag world = option(basic("")).meta();
        if (world.contains(MetaKeys.LIGHT.get())) throw new AssertionError("world light should not write LIGHT");
        if (world.getInt(MetaKeys.LIFE_ERROR.get()) != 0) throw new AssertionError("default life jitter should be 0");
    }

    private static void childSentinels() {
        MadParticleOption child = option(basic("\"child\":{}")).child();
        if (child == null) throw new AssertionError("child option should exist");
        if (child.lifeTime() != Integer.MAX_VALUE) throw new AssertionError("child lifeTime should inherit");
        if (child.bounceTime() != Integer.MAX_VALUE) throw new AssertionError("child bounceTime should inherit");
        if (child.px() != Double.MAX_VALUE || child.vx() != Double.MAX_VALUE)
            throw new AssertionError("child position/velocity should inherit");
        if (child.spriteFrom() != SpriteFrom.INHERIT) throw new AssertionError("child spriteFrom should inherit");
        if (child.alphaMode() != ChangeMode.INHERIT) throw new AssertionError("child alphaMode should inherit");
        if (child.scaleMode() != ChangeMode.INHERIT) throw new AssertionError("child scaleMode should inherit");
        if (child.collision() != InheritableBoolean.INHERIT) throw new AssertionError("child collision should inherit");
        if (child.interactWithEntity() != InheritableBoolean.INHERIT)
            throw new AssertionError("child interact should inherit");
        if (child.r() != Float.MAX_VALUE || child.g() != Float.MAX_VALUE || child.b() != Float.MAX_VALUE)
            throw new AssertionError("child colour should inherit");
        if (child.rollSpeed() != Float.MAX_VALUE) throw new AssertionError("child rollSpeed should inherit");
        if (child.bloomFactor() != Float.MAX_VALUE) throw new AssertionError("child bloom should inherit");
        if (child.targetParticle() != PARENT_PARTICLE) throw new AssertionError("child without a particle should reuse the parent type");
    }

    private static void childOverrides() {
        MadParticleOption child = option(basic(
            "\"child\":{\"particle\":\"world_combat_core:cobblemon/invisible\",\"lifetime\":7,\"size\":0.3,"
                + "\"color\":\"#FF0000\",\"spin\":180,\"amount\":2}")).child();
        if (child == null) throw new AssertionError("child option should exist");
        if (child.targetParticle() != 43) throw new AssertionError("child should resolve its own particle id");
        if (child.lifeTime() != 7) throw new AssertionError("child lifetime override");
        near(child.beginScale(), 2f, "child size override");
        near(child.r(), 1f, "child red override");
        near(child.g(), 0f, "child green override");
        near(child.rollSpeed(), 0.5f, "child spin override");
        if (child.amount() != 2) throw new AssertionError("child amount override");
    }

    private static void unknownChildFallsBackToParent() {
        MadParticleOption child = option(basic("\"child\":{\"particle\":\"world_combat_core:missing\"}")).child();
        if (child == null) throw new AssertionError("child option should exist");
        if (child.targetParticle() != PARENT_PARTICLE)
            throw new AssertionError("unresolved child particle should fall back to the parent type");
    }

    // --- helpers -------------------------------------------------------------------------------

    private static final String FIELDS =
        "\"name\":\"spark\",\"particle\":\"world_combat_core:cobblemon/balls/afterspark\",\"lifetime\":20,\"rate\":1,\"size\":0.15";

    private static ParticleDefinition.EmitterSpec basic(String extra) {
        return emitter(extra.isEmpty() ? FIELDS : FIELDS + "," + extra);
    }

    private static ParticleDefinition.EmitterSpec emitter(String fields) {
        String json = "{\"moments\":{\"idle\":{\"emitters\":[{" + fields + "}]}}}";
        ParticleDefinition definition = DefinitionParser.parse("world_combat:test", 1, JsonParser.parseString(json));
        return definition.moment("idle").emitters().get(0);
    }

    private static MadParticleOption option(ParticleDefinition.EmitterSpec spec) {
        return MadParticleSink.option(spec, state(20, 0.15, 0xFFFFFF, 1f), PARENT_PARTICLE, RESOLVER);
    }

    private static ParticleState state(double lifetime, double size, int color, float alpha) {
        ParticleState state = new ParticleState(0, 0.5, (int) lifetime);
        state.size = (float) size;
        state.color = color;
        state.alpha = alpha;
        return state;
    }

    private static void near(float actual, float expected, String label) {
        if (Math.abs(actual - expected) > 1e-5f)
            throw new AssertionError(label + ": expected " + expected + ", got " + actual);
    }
}
