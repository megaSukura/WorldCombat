package dev.worldcombat.core.client;

import com.mojang.blaze3d.vertex.PoseStack;
import dev.worldcombat.core.runtime.Appearance;
import dev.worldcombat.core.world.ScriptedBody;
import net.minecraft.client.renderer.MultiBufferSource;
import net.minecraft.client.renderer.entity.EntityRenderer;
import net.minecraft.client.renderer.entity.EntityRendererProvider;
import net.minecraft.client.renderer.texture.TextureAtlas;
import net.minecraft.resources.ResourceLocation;

/** Renders a scripted body's configured appearance (item, block or sprite) at its feet; undeclared bodies stay invisible. */
public final class BodyRenderer extends EntityRenderer<ScriptedBody> {
    public BodyRenderer(EntityRendererProvider.Context context) { super(context); }
    @Override public void render(ScriptedBody entity, float yaw, float partialTick, PoseStack pose, MultiBufferSource buffers, int light) {
        pose.pushPose();
        // Item and sprite appearances are drawn around the body centre; block appearances stand on the feet.
        var appearance = Appearance.of(entity.appearance());
        if (appearance.block().isEmpty()) pose.translate(0, entity.getBbHeight() / 2, 0);
        WorldVisuals.render(appearance, pose, buffers, light, entityRenderDispatcher, entity.level(), entity.getId());
        pose.popPose();
        super.render(entity, yaw, partialTick, pose, buffers, light);
    }
    @Override public ResourceLocation getTextureLocation(ScriptedBody entity) { return TextureAtlas.LOCATION_BLOCKS; }
}
