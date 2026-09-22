package dev.worldcombat.cobblemon

import com.cobblemon.mod.common.Cobblemon
import com.mojang.brigadier.CommandDispatcher
import net.minecraft.commands.arguments.ResourceLocationArgument
import dev.worldcombat.core.world.CombatCommands
import dev.worldcombat.core.world.CombatServices
import net.minecraft.commands.CommandSourceStack
import net.minecraft.commands.Commands
import net.minecraft.commands.SharedSuggestionProvider
import net.minecraft.commands.arguments.EntityArgument
import net.minecraft.network.chat.Component
import net.minecraft.world.entity.LivingEntity

object CompanionCommands {
    fun register(dispatcher: CommandDispatcher<CommandSourceStack>) {
        dispatcher.register(Commands.literal("worldcombat").requires { it.hasPermission(2) }
            .then(Commands.literal("companion")
                .then(Commands.argument("action", ResourceLocationArgument.id())
                    .suggests { _, builder -> SharedSuggestionProvider.suggest(CombatServices.CONTENT.ids(), builder) }
                    .then(Commands.argument("target", EntityArgument.entity())
                        .executes { context ->
                            val player = context.source.playerOrException
                            val actor = Cobblemon.storage.getParty(player).firstNotNullOfOrNull { it.entity }
                            val target = EntityArgument.getEntity(context, "target") as? LivingEntity
                            if (actor == null || target == null) {
                                context.source.sendFailure(Component.literal("Send out a partner and choose a living target"))
                                0
                            } else CombatCommands.cast(context.source,
                                ResourceLocationArgument.getId(context, "action").toString(), actor, target)
                        }))))
    }
}
