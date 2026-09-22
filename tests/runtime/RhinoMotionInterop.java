import dev.latvian.mods.rhino.ContextFactory;
import dev.worldcombat.core.runtime.*;
import java.nio.file.*;
import java.util.*;
import java.util.function.Consumer;
import com.google.gson.JsonParser;

/** Real Rhino invokes the real action JSON and scoped presentation boundaries. Only physical world queries are fixtures. */
public final class RhinoMotionInterop {
    public static final class Bridge implements CombatHost {
        final ActorHandle actor = new ActorHandle("test", UUID.randomUUID(), UUID.randomUUID(), 1);
        final ActorHandle target = new ActorHandle("test", UUID.randomUUID(), UUID.randomUUID(), 1);
        final List<String> receipts = new ArrayList<>();
        Point origin = new Point(0,1,0);
        int failures;
        public boolean valid(ActorHandle value) { return actor.equals(value) || target.equals(value); }
        public boolean mayAct(ActorHandle value, UUID owner) { return valid(value); }
        public Point position(ActorHandle value) { return actor.equals(value) ? origin : new Point(0,1,.5); }
        public Impact trace(ActorHandle value, UUID owner, Point from, Point to, double radius) {
            return new Impact(new Point(0,1,.5), target, false);
        }
        public boolean damage(ActorHandle from, ActorHandle to, UUID owner, double amount) { return true; }
        public void particle(ActorHandle value, Point point) {}
        public void report(long instance, String content, String message, Throwable error) { if(error != null) { failures++; error.printStackTrace(); } }
        public void present(long owner, ActorHandle actor, String key, String type, int version, Point point, String json) {}
        public void presentFor(long owner, ActorHandle actor, String key, String type, int version, Point point, String json, int ticks) {
            if(owner == 0 || ticks < 1 || !JsonParser.parseString(json).isJsonObject()) throw new AssertionError("Invalid scoped receipt");
            receipts.add(json);
        }
        public double displace(ActorHandle source, ActorHandle target, Point delta, UUID controller) { return 0; }
        public void run(Consumer<ActionContext> callback) {
            var content = new ContentRegistry(); var runtime = new ActionRuntime(this,content);
            content.begin();content.register(content.epoch(),"test:flight","test",100,callback);content.complete(true);
            runtime.start("test:flight",actor,ActionTarget.entity(target,position(target),new Point(0,0,1)),null,Map.of("native-design","tackle"));
            if(failures != 0 || runtime.stats().instances() != 0) throw new AssertionError("Production presentation action did not finish");
        }
        public Point point(double x,double y,double z) { return new Point(x,y,z); }
    }
    public static void main(String[] args) throws Exception {
        var context = new ContextFactory().enter(); var scope = context.initStandardObjects();var bridge=new Bridge();
        context.addToScope(scope,"Bridge",bridge);
        context.evaluateString(scope,Files.readString(Path.of(args[0])),"production-motion-boundary",1,null);
        long flights=bridge.receipts.stream().filter(json->JsonParser.parseString(json).getAsJsonObject().has("motion")).count();
        long impacts=bridge.receipts.stream().filter(json->"impact".equals(JsonParser.parseString(json).getAsJsonObject().get("phase").getAsString())).count();
        if(flights!=2 || impacts!=3)throw new AssertionError("Missing actual flight/impact boundary calls: "+flights+"/"+impacts);
        System.out.println("PASS actual Rhino motion: production flight/impact/dash through ActionContext object JSON and WorldAccess presentFor, independent ids, cleanup, and unchanged scalar rejection");
    }
}
