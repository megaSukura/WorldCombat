package dev.worldcombat.core.client;

import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.renderer.RenderType;
import net.neoforged.neoforge.client.event.RenderLevelStageEvent;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.level.ClipContext;
import net.minecraft.world.phys.HitResult;
import net.minecraft.world.phys.Vec3;
import java.util.UUID;
import java.util.function.Consumer;

/** Callback-scoped drawing commands; content selects layout, colours and geometry. */
public final class ClientFrame {
    private static com.mojang.blaze3d.vertex.ByteBufferBuilder surfaceBuffer;
    private static net.minecraft.client.renderer.MultiBufferSource.BufferSource surfaceSource;
    static void resetBuffers() { if(surfaceBuffer!=null)surfaceBuffer.close();surfaceBuffer=null;surfaceSource=null; }
    private static net.minecraft.client.renderer.MultiBufferSource.BufferSource surfaceBuffers() {
        if(surfaceSource==null){surfaceBuffer=new com.mojang.blaze3d.vertex.ByteBufferBuilder(16384);surfaceSource=net.minecraft.client.renderer.MultiBufferSource.immediate(surfaceBuffer);}
        return surfaceSource;
    }
    private final String data;
    private final GuiGraphics gui;
    private final RenderLevelStageEvent scene;
    private boolean open = true;
    ClientFrame(String data, GuiGraphics gui, RenderLevelStageEvent scene) { this.data = data; this.gui = gui; this.scene = scene; }
    void close() { open = false; }
    private void check() { if (!open) throw new IllegalStateException("Client frame expired"); }
    public String data() { check(); return data; }
    /** Native drawing context for library textures; valid only during this callback. */
    public GuiGraphics graphics() { check(); if (gui == null) throw new IllegalStateException("No GUI drawing context"); return gui; }
    private LivingEntity entity(String actor) {
        var mc = Minecraft.getInstance(); if (mc.level == null || actor == null || actor.isBlank()) return null;
        UUID id;
        try { id = UUID.fromString(actor.split("/", 2)[0]); } catch (IllegalArgumentException ignored) { return null; }
        for (var value : mc.level.entitiesForRendering()) if (value instanceof LivingEntity living && living.getUUID().equals(id)) return living;
        return null;
    }
    public String anchor(String actor) {
        check(); var entity = entity(actor); if (entity == null || scene == null) return "null";
        var point = entity.getPosition(scene.getPartialTick().getGameTimeDeltaPartialTick(false));
        var data = new com.google.gson.JsonObject();
        data.addProperty("x", point.x); data.addProperty("y", point.y); data.addProperty("z", point.z);
        data.addProperty("height", entity.getBbHeight()); data.addProperty("health", entity.getHealth()); data.addProperty("maxHealth", entity.getMaxHealth());
        data.addProperty("name", entity.getDisplayName().getString()); data.addProperty("distance", point.distanceTo(scene.getCamera().getPosition()));
        return data.toString();
    }
    public void billboard(String actor, double offset, double pixelSize, Consumer<ClientFrame> draw) {
        check(); var entity = entity(actor); if (entity == null || scene == null) return;
        var point = entity.getPosition(scene.getPartialTick().getGameTimeDeltaPartialTick(false));
        billboard(point.x, point.y + entity.getBbHeight() + offset, point.z, pixelSize, draw);
    }
    /** Camera-facing, depth-tested surface, culled by the world's collision geometry. */
    public void billboard(double x, double y, double z, double pixelSize, Consumer<ClientFrame> draw) {
        check(); if (scene == null || draw == null) return;
        var mc = Minecraft.getInstance(); if (mc.level == null || mc.player == null) return;
        var point = new Vec3(x, y, z); var camera = scene.getCamera().getPosition();
        if (!Double.isFinite(x + y + z + pixelSize) || pixelSize < .002 || pixelSize > .1 || point.distanceToSqr(camera) > 48 * 48) return;
        var hit = mc.level.clip(new ClipContext(camera, point, ClipContext.Block.COLLIDER, ClipContext.Fluid.NONE, mc.player));
        if (hit.getType() != HitResult.Type.MISS && hit.getLocation().distanceToSqr(camera) + .04 < point.distanceToSqr(camera)) return;
        // GUI flush must not submit the level renderer's still-pending entity/translucent batches.
        var graphics = new GuiGraphics(mc, surfaceBuffers());
        var pose = graphics.pose();
        pose.mulPose(billboardPose(scene.getPoseStack().last().pose(), camera, point, scene.getCamera().rotation(), (float)pixelSize));
        var frame = new ClientFrame(data, graphics, null);
        try { draw.accept(frame); }
        finally {
            try { graphics.flush(); }
            catch(RuntimeException failure) { resetBuffers();throw failure; }
            finally {
                frame.close();
                // Native UI textures may change depth state while drawing their own shader.
                com.mojang.blaze3d.systems.RenderSystem.enableDepthTest();
                com.mojang.blaze3d.systems.RenderSystem.enableCull();
                com.mojang.blaze3d.systems.RenderSystem.depthMask(true);
            }
        }
    }
    /** Match Minecraft's name-tag basis: x stays positive; only the GUI y axis is inverted. */
    static org.joml.Matrix4f billboardPose(org.joml.Matrix4f base, Vec3 camera, Vec3 point, org.joml.Quaternionf rotation, float pixelSize) {
        return new org.joml.Matrix4f(base).translate((float)(point.x-camera.x),(float)(point.y-camera.y),(float)(point.z-camera.z))
            .rotate(rotation).scale(pixelSize,-pixelSize,pixelSize);
    }
    public int width() { check(); return Minecraft.getInstance().getWindow().getGuiScaledWidth(); }
    public int height() { check(); return Minecraft.getInstance().getWindow().getGuiScaledHeight(); }
    public String translate(String key) { check(); return net.minecraft.network.chat.Component.translatable(key).getString(); }
    public void marker(String actor, String text, int color) { check(); if (text.length() > 128) throw new IllegalArgumentException("Marker too long"); ClientPresentation.marker(actor, text, color); }
    public void fill(int x, int y, int width, int height, int color) { check(); if (gui != null) gui.fill(x, y, x + Math.max(0, Math.min(2048, width)), y + Math.max(0, Math.min(2048, height)), color); }
    public void text(String value, int x, int y, int color, int width) {
        check(); if (value == null || value.length() > 512) throw new IllegalArgumentException("Text too long");
        if (gui != null) gui.drawString(Minecraft.getInstance().font, Minecraft.getInstance().font.plainSubstrByWidth(value, Math.max(0, Math.min(2048, width))), x, y, color);
    }
    public int textWidth(String value) { check(); return Minecraft.getInstance().font.width(value == null ? "" : value); }
    public int wrappedText(String value, int x, int y, int color, int width, int maxLines) {
        check(); if (gui == null || value == null || value.length() > 1024) return 0;
        var font = Minecraft.getInstance().font;
        var lines = font.split(net.minecraft.network.chat.Component.literal(value), Math.max(24, Math.min(512, width)));
        int count = Math.min(Math.max(1, Math.min(8, maxLines)), lines.size());
        for (int i = 0; i < count; i++) gui.drawString(font, lines.get(i), x, y + i * (font.lineHeight + 2), color, true);
        return count * (font.lineHeight + 2);
    }
    public double distance(double x, double y, double z) {
        check(); return scene == null ? 0 : scene.getCamera().getPosition().distanceTo(new Vec3(x, y, z));
    }
    public void line(double x, double y, double z, double tx, double ty, double tz, int color) {
        check(); if (scene == null) return;
        var camera = scene.getCamera().getPosition();
        if (!Double.isFinite(x + y + z + tx + ty + tz) || camera.distanceToSqr(x, y, z) > 128 * 128 || camera.distanceToSqr(tx, ty, tz) > 128 * 128) return;
        var pose = scene.getPoseStack(); pose.pushPose(); pose.translate(-camera.x, -camera.y, -camera.z);
        var lines = Minecraft.getInstance().renderBuffers().bufferSource().getBuffer(RenderType.lines());
        double length = Math.sqrt((tx-x)*(tx-x) + (ty-y)*(ty-y) + (tz-z)*(tz-z));
        if (length > .001) {
            float nx = (float)((tx-x)/length), ny = (float)((ty-y)/length), nz = (float)((tz-z)/length);
            lines.addVertex(pose.last().pose(), (float)x, (float)y, (float)z).setColor(color).setNormal(pose.last(), nx, ny, nz);
            lines.addVertex(pose.last().pose(), (float)tx, (float)ty, (float)tz).setColor(color).setNormal(pose.last(), nx, ny, nz);
        }
        pose.popPose();
    }
    public void ring(double x, double y, double z, double radius, int color) {
        check(); if (!Double.isFinite(radius) || radius < 0) return;
        for (int i = 0; i < 32; i++) { double a = i * Math.PI / 16, b = (i + 1) * Math.PI / 16;
            line(x + Math.cos(a)*radius, y, z + Math.sin(a)*radius, x + Math.cos(b)*radius, y, z + Math.sin(b)*radius, color);
        }
    }
}
