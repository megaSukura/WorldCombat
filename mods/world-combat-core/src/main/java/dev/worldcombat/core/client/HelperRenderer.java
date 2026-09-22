package dev.worldcombat.core.client;

import com.mojang.blaze3d.vertex.PoseStack;
import dev.worldcombat.core.runtime.Appearance;
import dev.worldcombat.core.world.HelperActor;
import net.minecraft.client.renderer.MultiBufferSource;
import net.minecraft.client.renderer.entity.EntityRenderer;
import net.minecraft.client.renderer.entity.EntityRendererProvider;
import net.minecraft.client.renderer.texture.TextureAtlas;
import net.minecraft.resources.ResourceLocation;

/** Renders the appearance declared in helper data; undeclared bodies stay invisible. */
public final class HelperRenderer extends EntityRenderer<HelperActor> {
    public HelperRenderer(EntityRendererProvider.Context context) { super(context); }
    @Override public void render(HelperActor entity, float yaw, float partialTick, PoseStack pose, MultiBufferSource buffers, int light) {
        WorldVisuals.render(Appearance.of(entity.appearance()), pose, buffers, light, entityRenderDispatcher, entity.level(), entity.getId());
    }
    @Override public ResourceLocation getTextureLocation(HelperActor entity) { return TextureAtlas.LOCATION_BLOCKS; }
}
