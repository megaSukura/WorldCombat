import dev.latvian.mods.rhino.ContextFactory;
import dev.worldcombat.cobblemon.script.NativeContentData;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Map;

/** Runs the production channel with native Java strings and the same canonical JSON/CAS boundary. */
public final class RhinoPreferencesInterop {
    public static final class NativeRequest {
        private String input = "{}", reply = "{}";
        private final Map<String, String> data = new HashMap<>();
        public void input(String value) { input = NativeContentData.INSTANCE.canonical(value); }
        public String input() { return input; }
        public String data(String key) { return data.get(key); }
        public boolean compareData(String key, String expected, String value) {
            var current = data.get(key);
            var normalized = expected == null ? null : NativeContentData.INSTANCE.canonical(expected);
            if (!java.util.Objects.equals(current, normalized)) return false;
            if (value == null) data.remove(key); else data.put(key, NativeContentData.INSTANCE.canonical(value));
            return true;
        }
        public void reply(String value) { reply = NativeContentData.INSTANCE.canonical(value); }
        public String result() { return reply; }
    }
    public static void main(String[] args) throws Exception {
        var context = new ContextFactory().enter(); var scope = context.initStandardObjects();
        context.addToScope(scope, "nativeRequest", new NativeRequest());
        context.evaluateString(scope, Files.readString(Path.of(args[0])), "production-preference-channel", 1, null);
        System.out.println("PASS actual Rhino channel: absent and existing native-string revisions, all field kinds, stale CAS, reset and skill/individual isolation");
    }
}
