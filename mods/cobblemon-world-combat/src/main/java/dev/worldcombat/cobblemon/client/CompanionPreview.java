package dev.worldcombat.cobblemon.client;

import net.minecraft.client.Minecraft;
import net.minecraft.client.renderer.LevelRenderer;
import net.minecraft.client.renderer.RenderType;
import net.minecraft.world.phys.AABB;
import net.neoforged.neoforge.client.event.RenderLevelStageEvent;

public final class CompanionPreview {
    public static void render(RenderLevelStageEvent event) {
        if (event.getStage() != RenderLevelStageEvent.Stage.AFTER_ENTITIES || Minecraft.getInstance().screen != null) return;
        int slot = CompanionInput.previewSlot();
        if (slot < 0) return;
        var aim = CompanionInput.aim(slot);
        if (aim == null) return;
        var pose = event.getPoseStack();
        var camera = event.getCamera().getPosition();
        pose.pushPose();
        pose.translate(-camera.x, -camera.y, -camera.z);
        var buffers = Minecraft.getInstance().renderBuffers().bufferSource();
        var lines = buffers.getBuffer(RenderType.lines());
        float r = aim.reason().isEmpty() ? 0.25f : 1f, g = aim.reason().isEmpty() ? 0.95f : 0.45f;
        var delta = aim.end().subtract(aim.origin());
        int steps = Math.max(1, (int) Math.ceil(delta.length() / 0.65));
        for (int i = 0; i <= steps; i++) {
            var p = aim.origin().add(delta.scale(i / (double) steps));
            LevelRenderer.renderLineBox(pose, lines, new AABB(p.x - 0.025, p.y - 0.025, p.z - 0.025,
                p.x + 0.025, p.y + 0.025, p.z + 0.025), r, g, 1, 0.9f);
        }
        var shape = CompanionInput.state().skills().get(slot).preview();
        for (var cell : dev.worldcombat.core.world.CombatGeometry.cells(shape, aim.point(), aim.direction()))
            LevelRenderer.renderLineBox(pose, lines, new AABB(cell), r, g, 1, 0.95f);
        if (shape.radius() > 0) {
            int segments = Math.max(24, (int) Math.ceil(shape.radius() * 16));
            for (int i = 0; i < segments; i++) {
                double angle = i * Math.PI * 2 / segments;
                double x = aim.point().x() + Math.cos(angle) * shape.radius(), y = aim.point().y() + 0.04,
                    z = aim.point().z() + Math.sin(angle) * shape.radius();
                LevelRenderer.renderLineBox(pose, lines, new AABB(x - .025, y - .025, z - .025, x + .025, y + .025, z + .025), r, g, 1, .95f);
            }
        }
        var p = aim.end();
        LevelRenderer.renderLineBox(pose, lines, new AABB(p.x - .3, p.y - .3, p.z - .3, p.x + .3, p.y + .3, p.z + .3), r, g, 1, 1);
        pose.popPose();
        buffers.endBatch(RenderType.lines());
    }
}
