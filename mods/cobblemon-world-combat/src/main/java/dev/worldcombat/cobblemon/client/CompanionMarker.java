package dev.worldcombat.cobblemon.client;

import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.Font;
import net.minecraft.client.renderer.LightTexture;
import net.neoforged.neoforge.client.event.RenderLivingEvent;

/** Draw with the entity's interpolated transform and its normal nameplate buffer lifetime. */
public final class CompanionMarker {
    public static void render(RenderLivingEvent.Post<?, ?> event) {
        var mc = Minecraft.getInstance();
        var state = CompanionInput.state();
        var actor = event.getEntity();
        var marker = dev.worldcombat.core.client.ClientPresentation.marker(actor.getUUID());
        if (state == null || !state.actor().equals(actor.getUUID()) || !actor.isAlive() || actor.isInvisible()
            || mc.screen != null || mc.options.hideGui || marker == null) return;
        var pose = event.getPoseStack();
        pose.pushPose();
        pose.translate(0, actor.getBoundingBox().getYsize() + 1.0, 0);
        pose.mulPose(mc.getEntityRenderDispatcher().cameraOrientation());
        // Keep Cobblemon's nameplate depth scale; only X/Y set the text size.
        pose.scale(0.022f, -0.022f, 1f);
        String label = marker.text();
        float x = -mc.font.width(label) / 2f;
        var matrix = pose.last().pose();
        var buffers = event.getMultiBufferSource();
        // The native nameplate underlay does not write depth, so its background cannot clip glyphs.
        mc.font.drawInBatch(label, x, 0, (marker.color() & 0x00FFFFFF) | 0x20000000, false, matrix,
            buffers, Font.DisplayMode.SEE_THROUGH, 0x70000000, LightTexture.FULL_BRIGHT);
        mc.font.drawInBatch(label, x, 0, marker.color(), false, matrix,
            buffers, Font.DisplayMode.NORMAL, 0, LightTexture.FULL_BRIGHT);
        pose.popPose();
    }
}
