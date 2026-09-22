package dev.worldcombat.core.world;

import com.mojang.brigadier.CommandDispatcher;
import net.minecraft.commands.*;
import net.minecraft.commands.arguments.EntityArgument;
import net.minecraft.network.chat.Component;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.commands.arguments.ResourceLocationArgument;
import static net.minecraft.commands.Commands.*;

public final class CombatCommands {
    private CombatCommands() {}
    public static void register(CommandDispatcher<CommandSourceStack> dispatcher) {
        dispatcher.register(literal("worldcombat").requires(source -> source.hasPermission(2))
            .then(literal("status").executes(context -> {
                var service = CombatServices.get(context.getSource().getServer());
                context.getSource().sendSuccess(() -> Component.literal("WorldCombat ready=" + CombatServices.CONTENT.ready()
                    + " actions=" + CombatServices.CONTENT.ids() + " " + service.runtime().stats()), false);
                return 1;
            }))
            // Script time since the last call, heaviest callbacks first; the window resets each time.
            .then(literal("profile").executes(context -> {
                double window = dev.worldcombat.core.runtime.ScriptProfile.windowNanos() / 1e6;
                var entries = dev.worldcombat.core.runtime.ScriptProfile.report(true);
                var text = new StringBuilder(String.format("WorldCombat script profile over %.1f s:", window / 1000));
                double total = 0; for (var entry : entries) total += entry.nanos() / 1e6;
                text.append(String.format(" total %.0f ms (%.1f%% of wall)", total, 100 * total / Math.max(1, window)));
                for (int i = 0; i < Math.min(25, entries.size()); i++) {
                    var entry = entries.get(i);
                    text.append(String.format("\n%7.0f ms %6d calls %6.2f ms/call  %s", entry.nanos() / 1e6, entry.calls(), entry.nanos() / 1e6 / entry.calls(), entry.key()));
                }
                dev.worldcombat.core.WorldCombatCore.LOGGER.info(text.toString());
                context.getSource().sendSuccess(() -> Component.literal(text.toString()), false);
                return 1;
            }))
            .then(literal("cast").then(argument("action", ResourceLocationArgument.id())
                .suggests((context, builder) -> SharedSuggestionProvider.suggest(CombatServices.CONTENT.ids(), builder))
                .then(argument("actor", EntityArgument.entity()).then(argument("target", EntityArgument.entity())
                .executes(context -> {
                    var actor = EntityArgument.getEntity(context, "actor");
                    var target = EntityArgument.getEntity(context, "target");
                    if (!(actor instanceof LivingEntity living) || !(target instanceof LivingEntity victim)) {
                        context.getSource().sendFailure(Component.literal("Actor and target must be living entities"));
                        return 0;
                    }
                    return cast(context.getSource(), ResourceLocationArgument.getId(context, "action").toString(), living, victim);
                })))))
            .then(literal("cancel").then(argument("actor", EntityArgument.entity()).executes(context -> {
                var source = context.getSource();
                if (!(EntityArgument.getEntity(context, "actor") instanceof LivingEntity actor)) return 0;
                var service = CombatServices.get(source.getServer());
                var handle = service.bind(actor);
                var player = source.getPlayer();
                if (!service.mayAct(handle, player == null ? null : player.getUUID())) {
                    source.sendFailure(Component.literal("You do not control this actor"));
                    return 0;
                }
                service.runtime().cancelActor(handle, "command-cancelled");
                return 1;
            }))));
    }

    public static int cast(CommandSourceStack source, String action, LivingEntity actor, LivingEntity target) {
        var service = CombatServices.get(source.getServer());
        if (actor.level() != target.level()) {
            source.sendFailure(Component.literal("Actor and target must be in the same dimension"));
            return 0;
        }
        try {
            var player = source.getPlayer();
            long instance = service.runtime().start(action, service.bind(actor), service.bind(target),
                player == null ? null : player.getUUID());
            source.sendSuccess(() -> Component.literal("WorldCombat action " + instance + " accepted"), false);
            return 1;
        } catch (IllegalArgumentException | IllegalStateException error) {
            source.sendFailure(Component.literal(error.getMessage()));
            return 0;
        }
    }
}
