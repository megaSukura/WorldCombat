import com.mojang.blaze3d.vertex.PoseStack;
import dev.latvian.mods.rhino.Context;
import dev.latvian.mods.rhino.ContextFactory;
import dev.latvian.mods.rhino.Scriptable;
import net.minecraft.client.gui.Font;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.network.chat.Component;
import net.minecraft.network.chat.FormattedText;
import net.minecraft.network.chat.Style;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.util.FormattedCharSequence;
import sun.misc.Unsafe;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

/** Native Summary overload resolution without starting Minecraft or OpenGL. */
public final class RhinoClientInterop {
    static final List<String> draws = new ArrayList<>();
    static int poseDepth;
    public static final class RecordingGraphics extends GuiGraphics {
        // The native constructor needs an initialized Minecraft instance. The test allocates this
        // recording receiver without that constructor; every invoked rendering method is overridden.
        private RecordingGraphics() { super(null, null); }
        @Override public PoseStack pose() { return POSES; }
        @Override public void fill(int a, int b, int c, int d, int color) { draws.add("fill"); }
        @Override public int drawString(Font font, String text, int x, int y, int color, boolean shadow) {
            draws.add("string:" + text); return x;
        }
        @Override public int drawString(Font font, String text, float x, float y, int color, boolean shadow) {
            throw new AssertionError("Unintended float overload");
        }
        @Override public int drawString(Font font, Component text, int x, int y, int color, boolean shadow) {
            draws.add("component:" + text.getString()); return x;
        }
        @Override public int drawString(Font font, FormattedCharSequence text, int x, int y, int color, boolean shadow) {
            draws.add("sequence"); return x;
        }
        @Override public int drawString(Font font, FormattedCharSequence text, float x, float y, int color, boolean shadow) {
            throw new AssertionError("Unintended formatted float overload");
        }
    }
    static final PoseStack POSES = new PoseStack() {
        @Override public void pushPose() { poseDepth++; }
        @Override public void popPose() { poseDepth--; }
        @Override public void translate(double x, double y, double z) {}
        @Override public void translate(float x, float y, float z) {}
        @Override public void scale(float x, float y, float z) {}
    };
    public static final class RecordingFont extends Font {
        private RecordingFont() { super(null, false); }
        @Override public String plainSubstrByWidth(String value, int width) { return value; }
        @Override public List<FormattedCharSequence> split(FormattedText value, int width) {
            return List.of(FormattedCharSequence.forward(value.getString(), Style.EMPTY));
        }
    }
    static void check(boolean value, String message) { if (!value) throw new AssertionError(message); }
    static void rejected(Context context, Scriptable scope, String code, String expected) {
        try { context.evaluateString(scope, code, "known-broken-boundary", 1, null); }
        catch (dev.latvian.mods.rhino.RhinoException error) {
            check(error.getMessage().contains(expected), "Wrong failure: " + error.getMessage()); return;
        }
        throw new AssertionError("Old invocation unexpectedly succeeded: " + code);
    }
    static Object unconstructed(Class<?> type) throws Exception {
        var field = Unsafe.class.getDeclaredField("theUnsafe"); field.setAccessible(true);
        return ((Unsafe) field.get(null)).allocateInstance(type);
    }
    public static void main(String[] arguments) throws Exception {
        var factory = new ContextFactory();
        // KubeJS also allows string-to-Component conversion, so the old call has both text and
        // numeric ambiguities. Explicit signatures must work with this real conversion enabled.
        factory.getTypeWrappers().register(Component.class, (context, value, type) -> {
            if (value instanceof dev.latvian.mods.rhino.Wrapper wrapped) value = wrapped.unwrap();
            return value instanceof Component component ? component : Component.literal(context.toString(value));
        });
        var context = factory.enter(); var scope = context.initStandardObjects();
        var graphics = (RecordingGraphics) unconstructed(RecordingGraphics.class);
        var font = (RecordingFont) unconstructed(RecordingFont.class);
        context.addToScope(scope, "graphics", graphics); context.addToScope(scope, "font", font);
        context.addToScope(scope, "Component", Component.class);
        rejected(context, scope, "graphics.drawString(font, 'old summary', 0, 0, -1, false)", "ambiguous");
        context.evaluateString(scope, Files.readString(Path.of(arguments[0])), "production-client-boundaries", 1, null);
        check(draws.stream().anyMatch(v -> v.startsWith("component:P ")), "Candidate hint did not reach native Component overload: " + draws);
        check(draws.stream().anyMatch(v -> v.startsWith("string:藤鞭")), "Equipped heading did not reach native String overload");
        check(draws.contains("sequence"), "Wrapped description did not reach native sequence overload");
        check(poseDepth == 0, "Native summary left an unbalanced pose");
        System.out.println("PASS locked Rhino executes shared native Summary draws with unambiguous overloads and balanced poses");
    }
}
