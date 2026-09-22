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
        boolean approach = aim.reason().equals("out-of-range");
        float r = aim.reason().isEmpty() ? 0.45f : 1f, g = aim.reason().isEmpty() ? 0.85f : approach ? 0.8f : 0.4f;
        segment(pose, lines, aim.origin(), aim.end(), r, g, .9f, .75f);
        var shape = CompanionInput.state().skills().get(slot).preview();
        for (var cell : dev.worldcombat.core.world.CombatGeometry.cells(shape, aim.point(), aim.direction()))
            LevelRenderer.renderLineBox(pose, lines, new AABB(cell), r, g, 1, 0.95f);
        if (shape.radius() > 0) {
            int segments = Math.max(24, (int) Math.ceil(shape.radius() * 16));
            for (int i = 0; i < segments; i++) {
                double angle = i * Math.PI * 2 / segments;
                double next = (i + 1) * Math.PI * 2 / segments;
                var from = new net.minecraft.world.phys.Vec3(aim.point().x() + Math.cos(angle) * shape.radius(), aim.point().y() + .04, aim.point().z() + Math.sin(angle) * shape.radius());
                var to = new net.minecraft.world.phys.Vec3(aim.point().x() + Math.cos(next) * shape.radius(), aim.point().y() + .04, aim.point().z() + Math.sin(next) * shape.radius());
                segment(pose, lines, from, to, r, g, .9f, .9f);
            }
        }
        var p = aim.end();
        segment(pose, lines, p.add(-.2, .02, 0), p.add(.2, .02, 0), r, g, .9f, 1);
        segment(pose, lines, p.add(0, .02, -.2), p.add(0, .02, .2), r, g, .9f, 1);
        pose.popPose();
        buffers.endBatch(RenderType.lines());
    }

    private static void segment(com.mojang.blaze3d.vertex.PoseStack pose, com.mojang.blaze3d.vertex.VertexConsumer lines,
                                net.minecraft.world.phys.Vec3 from, net.minecraft.world.phys.Vec3 to,
                                float red, float green, float blue, float alpha) {
        var delta = to.subtract(from);
        if (delta.lengthSqr() < 1.0e-8) return;
        var normal = delta.normalize();
        lines.addVertex(pose.last().pose(), (float) from.x, (float) from.y, (float) from.z).setColor(red, green, blue, alpha)
            .setNormal(pose.last(), (float) normal.x, (float) normal.y, (float) normal.z);
        lines.addVertex(pose.last().pose(), (float) to.x, (float) to.y, (float) to.z).setColor(red, green, blue, alpha)
            .setNormal(pose.last(), (float) normal.x, (float) normal.y, (float) normal.z);
    }
}
