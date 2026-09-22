package dev.worldcombat.core.client;

import com.lowdragmc.lowdraglib2.gui.holder.ModularUIScreen;
import com.lowdragmc.lowdraglib2.gui.hud.ModularHudLayer;
import com.lowdragmc.lowdraglib2.gui.ui.ModularUI;
import net.minecraft.client.Minecraft;
import net.minecraft.client.DeltaTracker;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.network.chat.Component;
import java.util.LinkedHashMap;
import java.util.Map;

/** Hosts script-authored LDLib2 trees and owns their connection/reload lifecycle. */
public final class NativeUiHost {
    private static final Map<String, ModularHudLayer> layers = new LinkedHashMap<>();
    private static ModularUIScreen screen;
    private static Screen previousScreen;
    private static Runnable returnAction;
    private static Object connection;
    private NativeUiHost() {}
    public static ModularUI themed(com.lowdragmc.lowdraglib2.gui.ui.UIElement root) {
        var styles=com.lowdragmc.lowdraglib2.gui.ui.style.StylesheetManager.INSTANCE;
        return ModularUI.of(com.lowdragmc.lowdraglib2.gui.ui.UI.of(root,styles.getStylesheetSafe(com.lowdragmc.lowdraglib2.gui.ui.style.StylesheetManager.MC)));
    }
    public static void hud(String id, ModularUI ui) {
        if (ui == null) layers.remove(id);
        else {
            layers.put(id, () -> ui);
        }
    }
    public static void open(ModularUI ui, String title) {
        if (!active()) { previousScreen = Minecraft.getInstance().screen; returnAction = null; }
        screen = new ModularUIScreen(ui, Component.literal(title)) {
            @Override public void onClose() { NativeUiHost.close(); }
        };
        Minecraft.getInstance().setScreen(screen);
    }
    public static boolean active() { return screen != null && Minecraft.getInstance().screen == screen; }
    public static void onReturn(Runnable action) { if (active()) returnAction = action; }
    public static void close() {
        boolean restore = active();
        var previous = previousScreen;
        var action = returnAction;
        screen = null;
        previousScreen = null;
        returnAction = null;
        if (restore) {
            Minecraft.getInstance().setScreen(previous);
            if (previous != null && action != null) action.run();
        }
    }
    public static int width() { return Minecraft.getInstance().getWindow().getGuiScaledWidth(); }
    public static int height() { return Minecraft.getInstance().getWindow().getGuiScaledHeight(); }
    public static double mouseX() {
        var mc = Minecraft.getInstance();
        return mc.mouseHandler.xpos() * width() / mc.getWindow().getScreenWidth();
    }
    public static double mouseY() {
        var mc = Minecraft.getInstance();
        return mc.mouseHandler.ypos() * height() / mc.getWindow().getScreenHeight();
    }
    /** Normalised quad mesh for library UI surfaces; content owns the geometry and meaning. */
    public static com.lowdragmc.lowdraglib2.gui.texture.IGuiTexture meshTexture(String json, int color) {
        var values = com.google.gson.JsonParser.parseString(json).getAsJsonArray();
        if (values.size() == 0 || values.size() > 1024 || values.size() % 8 != 0) throw new IllegalArgumentException("Invalid UI mesh");
        var vertices = new float[values.size()];
        for (int i = 0; i < vertices.length; i++) {
            vertices[i] = values.get(i).getAsFloat();
            if (!Float.isFinite(vertices[i]) || vertices[i] < 0 || vertices[i] > 1) throw new IllegalArgumentException("UI mesh coordinates must be normalised");
        }
        return (graphics, mouseX, mouseY, x, y, width, height, partialTicks) -> {
            var buffer = Minecraft.getInstance().renderBuffers().bufferSource().getBuffer(net.minecraft.client.renderer.RenderType.gui());
            var pose = graphics.pose().last().pose();
            for (int i = 0; i < vertices.length; i += 2)
                buffer.addVertex(pose, x + vertices[i] * width, y + vertices[i + 1] * height, 0).setColor(color);
            graphics.flush();
        };
    }
    public static void reset() {
        layers.clear();
        previousScreen = null;
        returnAction = null;
        close();
    }
    public static void tick() {
        var current = Minecraft.getInstance().getConnection();
        if (current != connection) { connection = current; reset(); }
    }
    public static void render(GuiGraphics graphics, DeltaTracker delta) {
        var mc = Minecraft.getInstance();
        if (mc.player == null || mc.options.hideGui || mc.screen != null) return;
        for (var layer : java.util.List.copyOf(layers.values())) layer.render(graphics, delta);
    }
}
