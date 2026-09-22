package dev.worldcombat.core.client.particles;

import com.google.gson.JsonObject;
import com.mojang.brigadier.CommandDispatcher;
import com.mojang.brigadier.arguments.BoolArgumentType;
import com.mojang.brigadier.arguments.IntegerArgumentType;
import com.mojang.brigadier.arguments.StringArgumentType;
import com.mojang.brigadier.context.CommandContext;
import net.minecraft.client.Minecraft;
import net.minecraft.commands.CommandSourceStack;
import net.minecraft.commands.Commands;
import net.minecraft.commands.arguments.ResourceLocationArgument;
import net.minecraft.network.chat.Component;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.phys.HitResult;
import net.minecraft.world.phys.Vec3;

/**
 * Client command {@code /wcparticle <id> [moment] [ticks] [here]}. Plays a registered definition at
 * the player's view target, or at the player when {@code here} is given. Owned by wave 4.
 *
 * <p>{@code /wcparticle stats} prints the engine chain (definitions, instances, sink counters,
 * particle engine totals, MadParticle switches); {@code /wcparticle oit <true|false>} switches
 * MadParticle's translucency method at runtime for comparison.
 */
public final class ParticleCommand {
    private static final int DEFAULT_TICKS = 60;
    private static final double VIEW_DISTANCE = 32;
    private static final double MISS_DISTANCE = 8;

    private ParticleCommand() {}

    /** Registers the client command; called from {@code CoreClient}. */
    public static void register(CommandDispatcher<CommandSourceStack> dispatcher) {
        dispatcher.register(Commands.literal("wcparticle")
            .then(Commands.literal("stats").executes(ParticleCommand::stats))
            .then(Commands.literal("oit")
                .then(Commands.argument("enabled", BoolArgumentType.bool()).executes(context -> {
                    boolean enabled = BoolArgumentType.getBool(context, "enabled");
                    MadParticleCompat.translucent(enabled);
                    context.getSource().sendSuccess(() -> Component.literal(MadParticleCompat.describe()), false);
                    return 1;
                })))
            .then(Commands.argument("id", ResourceLocationArgument.id())
                .executes(context -> play(context, "main", DEFAULT_TICKS, false))
                .then(Commands.literal("here")
                    .executes(context -> play(context, "main", DEFAULT_TICKS, true)))
                .then(Commands.argument("moment", StringArgumentType.string())
                    .executes(context -> play(context, moment(context), DEFAULT_TICKS, false))
                    .then(Commands.literal("here")
                        .executes(context -> play(context, moment(context), DEFAULT_TICKS, true)))
                    .then(Commands.argument("ticks", IntegerArgumentType.integer(0))
                        .executes(context -> play(context, moment(context), ticks(context), false))
                        .then(Commands.literal("here")
                            .executes(context -> play(context, moment(context), ticks(context), true)))))));
    }

    private static int stats(CommandContext<CommandSourceStack> context) {
        var mc = Minecraft.getInstance();
        var director = ParticleDirector.INSTANCE;
        var sink = MadParticleSink.INSTANCE;
        var lines = new java.util.ArrayList<String>();
        lines.add("definitions=" + director.definitionKeys().size() + " " + director.definitionKeys());
        lines.add("instances=" + director.instances().size() + " budgetLive=" + director.budget().live()
            + " sink=" + (director.sink() == ParticleSink.NONE ? "NONE" : director.sink().getClass().getSimpleName()));
        for (var instance : director.instances()) {
            lines.add(" - " + instance.key() + " moment=" + instance.momentName() + " phase=" + instance.phase()
                + " emitters=" + instance.emitters().size() + " retiring=" + instance.retiring().size()
                + " estimatedLive=" + instance.particleCount());
        }
        lines.add("sink spawnCalls=" + sink.spawnCalls() + " unknownTypes=" + sink.unknownTypes()
            + " failures=" + sink.failures() + " last=" + sink.lastParticle());
        lines.add("particleEngine=" + (mc.particleEngine == null ? "n/a" : mc.particleEngine.countParticles())
            + " instanced=" + cn.ussshenzhou.madparticle.particle.optimize.InstancedRenderManager.amount()
            + " particlesOption=" + mc.options.particles().get());
        lines.add(MadParticleCompat.describe());
        for (String line : lines) context.getSource().sendSuccess(() -> Component.literal(line), false);
        dev.worldcombat.core.WorldCombatCore.LOGGER.info("wcparticle stats\n{}", String.join("\n", lines));
        return 1;
    }

    private static int play(CommandContext<CommandSourceStack> context, String moment, int ticks, boolean here) {
        ResourceLocation id = ResourceLocationArgument.getId(context, "id");
        if (ParticleDirector.INSTANCE.definition(id.toString(), 1) == null) {
            context.getSource().sendFailure(Component.literal("Unknown particle definition: " + id + "@1"));
            return 0;
        }
        var mc = Minecraft.getInstance();
        if (mc.player == null) {
            context.getSource().sendFailure(Component.literal("No client player"));
            return 0;
        }
        var data = new JsonObject();
        data.addProperty("moment", moment);
        Vec3 position;
        if (here) {
            position = mc.player.position();
            data.addProperty("source", mc.player.getStringUUID());
        } else {
            HitResult hit = mc.player.pick(VIEW_DISTANCE, 0, false);
            position = hit.getType() == HitResult.Type.MISS
                ? mc.player.getEyePosition(0f).add(mc.player.getLookAngle().scale(MISS_DISTANCE))
                : hit.getLocation();
        }
        new ParticleScriptApi().local(id.toString(), 1, position.x, position.y, position.z, data.toString(), ticks);
        context.getSource().sendSuccess(() -> Component.literal(
            "Playing " + id + " (" + moment + ") at " + String.format("%.2f, %.2f, %.2f", position.x, position.y, position.z)), false);
        return 1;
    }

    private static String moment(CommandContext<CommandSourceStack> context) {
        return StringArgumentType.getString(context, "moment");
    }

    private static int ticks(CommandContext<CommandSourceStack> context) {
        return IntegerArgumentType.getInteger(context, "ticks");
    }
}
