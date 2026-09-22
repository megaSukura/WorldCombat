package dev.worldcombat.cobblemon.network;

import java.util.function.Consumer;
import net.minecraft.server.level.ServerPlayer;
import net.neoforged.neoforge.network.event.RegisterPayloadHandlersEvent;
import dev.worldcombat.cobblemon.control.CompanionControl;

/** Client installs its consumer on client setup; no client classes are loaded by the dedicated server. */
public final class ControlNetwork {
    public static Consumer<ControlState> clientReceiver = ignored -> {};
    public static Consumer<ContentReply> contentReceiver = ignored -> {};
    public static Consumer<ContentInvalidation> contentInvalidationReceiver = ignored -> {};
    public static Consumer<ReviewState> reviewReceiver = ignored -> {};
    public static void register(RegisterPayloadHandlersEvent event) {
        // Current PP uses a wider native packet field; reject clients with the older wire format.
        var registrar = event.registrar("p5.pasture.1");
        registrar.playToServer(ControlCommand.TYPE, ControlCommand.CODEC,
            (packet, context) -> CompanionControl.INSTANCE.request((ServerPlayer) context.player(), packet));
        registrar.playToClient(ControlState.TYPE, ControlState.CODEC, (packet, context) -> clientReceiver.accept(packet));
        registrar.playToServer(ContentRequest.TYPE, ContentRequest.CODEC,
            (packet, context) -> dev.worldcombat.cobblemon.script.NativeContentChannels.INSTANCE.request((ServerPlayer) context.player(), packet));
        registrar.playToClient(ContentReply.TYPE, ContentReply.CODEC, (packet, context) -> contentReceiver.accept(packet));
        registrar.playToClient(ContentInvalidation.TYPE, ContentInvalidation.CODEC, (packet, context) -> contentInvalidationReceiver.accept(packet));
        registrar.playToServer(ReviewAction.TYPE, ReviewAction.CODEC,
            (packet, context) -> dev.worldcombat.cobblemon.review.ReviewTool.INSTANCE.handle((ServerPlayer) context.player(), packet.json()));
        registrar.playToClient(ReviewState.TYPE, ReviewState.CODEC, (packet, context) -> reviewReceiver.accept(packet));
    }
}
