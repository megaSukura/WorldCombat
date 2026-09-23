package dev.worldcombat.core.client;

import com.mojang.blaze3d.vertex.PoseStack;
import com.mojang.blaze3d.vertex.VertexConsumer;
import dev.worldcombat.core.client.particles.ParticleTypes;
import dev.worldcombat.core.runtime.Appearance;
import net.minecraft.client.Minecraft;
import net.minecraft.client.renderer.LightTexture;
import net.minecraft.client.renderer.MultiBufferSource;
import net.minecraft.client.renderer.RenderType;
import net.minecraft.client.renderer.entity.EntityRenderDispatcher;
import net.minecraft.client.renderer.texture.OverlayTexture;
import net.minecraft.client.renderer.texture.TextureAtlas;
import net.minecraft.client.renderer.texture.TextureAtlasSprite;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.item.ItemDisplayContext;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.Items;
import net.minecraft.world.level.Level;
import org.joml.Matrix4f;

/** Draws authored helper/projectile appearances from the client's existing atlases and item models. */
public final class WorldVisuals {
    private WorldVisuals() {}
    public static void render(Appearance appearance, PoseStack pose, MultiBufferSource buffers, int packedLight,
                              EntityRenderDispatcher dispatcher, Level level, int seed) {
        if (appearance == null || appearance.empty()) return;
        if (!appearance.block().isEmpty()) { block(appearance, pose, buffers, packedLight, level, seed); return; }
        if (!appearance.item().isEmpty()) { item(appearance, pose, buffers, packedLight, level, seed); return; }
        sprite(appearance, pose, buffers, packedLight, dispatcher, level, seed);
    }
    private static float spin(Appearance appearance, Level level, int seed) {
        if (!appearance.spin()) return 0f;
        float partial = Minecraft.getInstance().getTimer().getGameTimeDeltaPartialTick(false);
        return ((level.getGameTime() + seed) % 360 + partial) * 4f;
    }
    private static void block(Appearance appearance, PoseStack pose, MultiBufferSource buffers, int packedLight, Level level, int seed) {
        var id = ResourceLocation.tryParse(appearance.block());
        if (id == null) return;
        var block = BuiltInRegistries.BLOCK.getOptional(id).orElse(null);
        if (block == null || block == net.minecraft.world.level.block.Blocks.AIR) return;
        pose.pushPose();
        float scale = appearance.scale();
        pose.mulPose(com.mojang.math.Axis.YP.rotationDegrees(spin(appearance, level, seed)));
        pose.scale(scale, scale, scale);
        pose.translate(-0.5, 0, -0.5);
        Minecraft.getInstance().getBlockRenderer().renderSingleBlock(block.defaultBlockState(), pose, buffers,
            appearance.glow() ? LightTexture.FULL_BRIGHT : packedLight, OverlayTexture.NO_OVERLAY);
        pose.popPose();
    }
    private static void item(Appearance appearance, PoseStack pose, MultiBufferSource buffers, int packedLight, Level level, int seed) {
        var id = ResourceLocation.tryParse(appearance.item());
        if (id == null) return;
        var item = BuiltInRegistries.ITEM.get(id);
        if (item == null || item == Items.AIR) return;
        pose.pushPose();
        pose.mulPose(com.mojang.math.Axis.YP.rotationDegrees(spin(appearance, level, seed)));
        pose.scale(appearance.scale(), appearance.scale(), appearance.scale());
        Minecraft.getInstance().getItemRenderer().renderStatic(new ItemStack(item), ItemDisplayContext.GROUND,
            appearance.glow() ? LightTexture.FULL_BRIGHT : packedLight, OverlayTexture.NO_OVERLAY, pose, buffers, level, seed);
        pose.popPose();
    }
    /** Client ticks each flipbook frame stays on screen; Cobblemon flipbooks read well at 10 fps. */
    private static final int TICKS_PER_FRAME = 2;
    private static void sprite(Appearance appearance, PoseStack pose, MultiBufferSource buffers, int packedLight,
                               EntityRenderDispatcher dispatcher, Level level, int seed) {
        var requested = ResourceLocation.tryParse(appearance.sprite());
        if (requested == null) return;
        var found = resolve(requested, level, seed);
        if (found == null) return;
        var sprite = found.sprite();
        int light = appearance.glow() ? LightTexture.FULL_BRIGHT : packedLight;
        int argb = appearance.tint() >= 0 ? 0xFF000000 | appearance.tint() : 0xFFFFFFFF;
        float alpha = (argb >> 24 & 0xFF) / 255f, red = (argb >> 16 & 0xFF) / 255f,
            green = (argb >> 8 & 0xFF) / 255f, blue = (argb & 0xFF) / 255f;
        // The generated atlas already applies the source flipbook's grid and crop. Use that frame's
        // real aspect ratio, including horizontal strips and non-square frames.
        int width = sprite.contents().width(), height = sprite.contents().height();
        float aspect = height > 0 ? (float) width / height : 1f;
        pose.pushPose();
        pose.mulPose(dispatcher.cameraOrientation());
        float halfH = appearance.scale() * 0.5f, halfW = halfH * aspect;
        Matrix4f matrix = pose.last().pose();
        VertexConsumer consumer = buffers.getBuffer(appearance.glow()
            ? RenderType.entityTranslucentEmissive(found.location()) : RenderType.entityTranslucent(found.location()));
        vertex(consumer, matrix, -halfW, -halfH, sprite.getU0(), sprite.getV1(), red, green, blue, alpha, light);
        vertex(consumer, matrix, halfW, -halfH, sprite.getU1(), sprite.getV1(), red, green, blue, alpha, light);
        vertex(consumer, matrix, halfW, halfH, sprite.getU1(), sprite.getV0(), red, green, blue, alpha, light);
        vertex(consumer, matrix, -halfW, halfH, sprite.getU0(), sprite.getV0(), red, green, blue, alpha, light);
        pose.popPose();
    }
    private static void vertex(VertexConsumer consumer, Matrix4f matrix, float x, float y, float u, float v,
                               float red, float green, float blue, float alpha, int light) {
        consumer.addVertex(matrix, x, y, 0).setColor(red, green, blue, alpha).setUv(u, v)
            .setOverlay(OverlayTexture.NO_OVERLAY).setLight(light).setNormal(0, 0, 1);
    }
    private record Found(TextureAtlasSprite sprite, ResourceLocation location) {}
    private static Found resolve(ResourceLocation requested, Level level, int seed) {
        if (requested == null) return null;
        var mc = Minecraft.getInstance();
        String path = requested.getPath();
        if (path.startsWith("item/") || path.startsWith("block/")) return lookup(mc, TextureAtlas.LOCATION_BLOCKS, requested);
        if ("cobblemon".equals(requested.getNamespace())) {
            String particlePath = path.startsWith("particle/") ? path.substring("particle/".length()) : path;
            var layout = ParticleTypes.layout(particlePath);
            if (layout != null) {
                long time = level == null ? 0 : level.getGameTime();
                int index = (int) Math.floorMod(time / TICKS_PER_FRAME + seed, (long) layout.frames());
                var frameId = ResourceLocation.fromNamespaceAndPath("world_combat_core", layout.path() + "/" + index);
                var frame = lookup(mc, TextureAtlas.LOCATION_PARTICLES, frameId);
                if (frame != null) return frame;
            }
        }
        if (path.startsWith("particle/"))
            return lookup(mc, TextureAtlas.LOCATION_PARTICLES, requested.withPath(path.substring("particle/".length())));
        var particle = lookup(mc, TextureAtlas.LOCATION_PARTICLES, requested);
        return particle != null ? particle : lookup(mc, TextureAtlas.LOCATION_BLOCKS, requested);
    }
    private static Found lookup(Minecraft mc, ResourceLocation atlasLocation, ResourceLocation spriteId) {
        var texture = mc.getTextureManager().getTexture(atlasLocation);
        if (!(texture instanceof TextureAtlas atlas)) return null;
        var sprite = atlas.getTextures().get(spriteId);
        return sprite == null ? null : new Found(sprite, atlasLocation);
    }
}
