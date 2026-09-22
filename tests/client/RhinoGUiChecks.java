import dev.latvian.mods.rhino.ContextFactory;
import dev.worldcombat.core.client.NativeUiHost;
import dev.worldcombat.core.client.ClientCallbacks;
import dev.worldcombat.core.client.RichTextLabel;
import dev.worldcombat.core.client.UiText;
import dev.worldcombat.core.client.UiPreferences;
import com.lowdragmc.lowdraglib2.gui.ui.data.Tooltips;
import net.minecraft.network.chat.Component;
import java.nio.file.*;
import java.util.*;
import java.util.function.*;

/** Full production G dispatch in the locked Rhino engine; int conversions and mesh parsing are native. */
public final class RhinoGUiChecks {
    public static final class ProbeFont extends net.minecraft.client.gui.Font {
        private final net.minecraft.client.StringSplitter splitter=new net.minecraft.client.StringSplitter((point,style)->point>255?9:5);
        public ProbeFont(){super(id->null,false);}
        @Override public net.minecraft.client.StringSplitter getSplitter(){return splitter;}
        @Override public List<net.minecraft.util.FormattedCharSequence> split(net.minecraft.network.chat.FormattedText text,int width){
            return splitter.splitLines(text,width,net.minecraft.network.chat.Style.EMPTY).stream()
                .map(net.minecraft.locale.Language.getInstance()::getVisualOrder).toList();
        }
    }
    public static final List<Widget> widgets = new ArrayList<>();
    public static int meshCalls, colorCalls, commands, opens;
    public static Widget opened;
    public static Predicate<String> input;
    public static Consumer<String> update, reply;
    public static final class Widget {
        public String text = "";
        public Consumer<Object> click;
        public Tooltips tooltip = Tooltips.empty();
        public Widget() { widgets.add(this); }
        public Widget lss(String name, Object value) { return this; }
        public Widget addChild(Widget child) { return this; }
        public Widget addClass(String name) { return this; }
        public Widget setText(Component value) { text = value.getString(); return this; }
        public Widget getStyle() { return this; }
        public Widget getTextStyle() { return this; }
        public Widget getButtonStyle() { return this; }
        public Widget textColor(int color) { colorCalls++; return this; }
        public Widget textWrap(Object wrap) { return this; }
        public Widget backgroundTexture(Object texture) { return this; }
        public Widget baseTexture(Object texture) { return this; }
        public Widget hoverTexture(Object texture) { return this; }
        public Widget pressedTexture(Object texture) { return this; }
        public Widget setOnClick(Consumer<Object> action) { click = action; return this; }
        public Widget tooltips(Tooltips value) { tooltip = value; return this; }
        public Widget appendTooltipsString(String value) { tooltip = Tooltips.of(Component.literal(value)); return this; }
    }
    public static final class Rect {
        public static Rect of(int color) { colorCalls++; return new Rect(); }
        public Rect setBorderColor(int color) { colorCalls++; return this; }
        public Rect setRadius(double radius) { return this; }
        public Rect setStroke(double stroke) { return this; }
    }
    public static final class Host {
        public static int width() { return 480; }
        public static int height() { return 300; }
        public static double mouseX() { return 240; }
        public static double mouseY() { return 30; }
        public static Widget themed(Widget root) { return root; }
        public static boolean active() { return opened != null; }
        public static void open(Widget ui, String title) { opened = ui; opens++; }
        public static void close() { opened = null; }
        public static void reset() { opened = null; }
        public static void hud(String id, Widget ui) {}
        public static Object meshTexture(String mesh, int color) { meshCalls++; return NativeUiHost.meshTexture(mesh, color); }
    }
    public static final class Bridge {
        public static void listen(Predicate<String> handler, Consumer<String> updates, Consumer<String> replies) { input=handler;update=updates;reply=replies; }
        public static long request(String channel,String pokemon,String json) { return 1; }
        public static void indicator(String json) {}
        public static String aim(String kind) { return "{\"target\":\"target\",\"point\":{\"x\":1,\"y\":0,\"z\":2}}"; }
        public static String look() { return aim(""); }
        public static void command(String operation,String json) { if (!operation.equals("hold")) throw new AssertionError(operation); commands++; }
    }
    public static void choose(String text) {
        for (int i=widgets.size()-1;i>=0;i--) if (widgets.get(i).text.equals(text) && widgets.get(i).click != null) { widgets.get(i).click.accept(null);return; }
        throw new AssertionError("Missing menu choice: "+text);
    }
    public static void main(String[] arguments) throws Exception {
        var game=Path.of(arguments[0]).getParent().resolve("game").toAbsolutePath();Files.createDirectories(game);
        net.neoforged.fml.loading.FMLPaths.loadAbsolutePaths(game);
        var gamePath=net.neoforged.fml.loading.FMLLoader.class.getDeclaredField("gamePath");gamePath.setAccessible(true);gamePath.set(null,game);
        var mods=net.neoforged.fml.ModList.of(List.of(),List.of());
        var loadedMods=net.neoforged.fml.ModList.class.getDeclaredMethod("setLoadedMods",List.class);loadedMods.setAccessible(true);loadedMods.invoke(mods,List.of());
        net.minecraft.SharedConstants.tryDetectVersion();
        net.neoforged.fml.loading.LoadingModList.of(List.of(),List.of(),List.of(),List.of(),Map.of());
        net.minecraft.server.Bootstrap.bootStrap();
        NativeUiContractChecks.verify();
        NativeScrollerChecks.verify(arguments[2]);
        if(arguments.length>1)ItemTooltipNativeChecks.verify(arguments[1]);
        var context=new ContextFactory().enter();var scope=context.initStandardObjects();
        for (var type:List.of(Widget.class,Rect.class,Host.class,Bridge.class,Component.class,Tooltips.class,ArrayList.class,ClientCallbacks.class,UiText.class,UiPreferences.class))
            context.addToScope(scope,type.getSimpleName(),type);
        // Exact failing call from the frozen G path must remain a real Rhino-to-int rejection.
        try { context.evaluateString(scope,"Host.meshTexture('[0,0,1,0,1,1,0,1]', 3827318065)","broken-g-color",1,null);throw new AssertionError("Unsigned int unexpectedly accepted"); }
        catch(dev.latvian.mods.rhino.RhinoException expected) { if(!expected.getMessage().contains("Cannot convert"))throw expected; }
        context.evaluateString(scope,Files.readString(Path.of(arguments[0])),"production-g-ui",1,null);
        update.accept("{\"session\":\"test\",\"epoch\":1,\"pokemon\":\"subject\",\"name\":\"伙伴\",\"skills\":[],\"entityId\":3}");
        reply.accept("{\"channel\":\"world_combat:skills\",\"pokemon\":\"subject\",\"code\":\"ok\",\"data\":\"{\\\"skills\\\":[],\\\"menu\\\":[{\\\"id\\\":\\\"actions\\\",\\\"label\\\":\\\"行动安排\\\"},{\\\"id\\\":\\\"actions/hold\\\",\\\"parent\\\":\\\"actions\\\",\\\"label\\\":\\\"原地待命\\\",\\\"command\\\":\\\"hold\\\",\\\"target\\\":\\\"none\\\"}]}\"}");
        if(!input.test("{\"key\":\"command\",\"pressed\":true}"))throw new AssertionError("G not handled");
        choose("行动安排 ›");choose("原地待命");
        if(commands!=0)throw new AssertionError("Leaf click dispatched before G release");
        input.test("{\"key\":\"command\",\"pressed\":false}");
        if(commands!=1||meshCalls<4||colorCalls<4||opens!=2||opened!=null)throw new AssertionError("Incomplete G path "+commands+"/"+meshCalls+"/"+colorCalls+"/"+opens);
        // Verify tooltip replacement through the actual LDLib Tooltips type and Java overload.
        context.evaluateString(scope,"var checkWidget=new Widget(); UiSurfaces.tooltip(checkWidget,['伤害：23','等级贡献：+4']); UiSurfaces.tooltip(checkWidget,['伤害：29']);", "native-readout-tooltip",1,null);
        var last=widgets.getLast(); if(last.tooltip.tooltips().length!=1||!last.tooltip.tooltips()[0].getString().equals("伤害：29"))throw new AssertionError("Tooltip update accumulated stale rows");
        context.evaluateString(scope,"var failedCalls=0, goodCalls=0; var bad=ClientCallbacks.runnable('regression/ui-failure',function(){failedCalls++;throw Error('Expected script fault');}); var good=ClientCallbacks.runnable('regression/ui-ok',function(){goodCalls++;});bad.run();bad.run();good.run();if(failedCalls!==1||goodCalls!==1)throw Error('Callback isolation failed'); var replacement=ClientCallbacks.runnable('regression/ui-failure',function(){goodCalls++;});replacement.run();if(goodCalls!==2)throw Error('Callback re-registration failed');", "native-callback-isolation",1,null);
        var rich=RichTextLabel.component("[{\"text\":\"造成 \"},{\"text\":\"3.2\",\"tooltip\":[\"基础2.0\",\"特攻贡献1.2\"]},{\"text\":\" 点伤害\"}]");
        var font=new ProbeFont();
        var plain=RichTextLabel.styleAt(rich,font,9,2,140,80,4,4,"LEFT","TOP");
        var numeric=RichTextLabel.styleAt(rich,font,9,2,140,80,27,4,"LEFT","TOP");
        if(plain.getHoverEvent()!=null||numeric.getHoverEvent()==null)throw new AssertionError("Inline hover did not distinguish prose and numeric text");
        if(!numeric.getHoverEvent().getValue(net.minecraft.network.chat.HoverEvent.Action.SHOW_TEXT).getString().contains("特攻贡献1.2"))throw new AssertionError("Native Component lost the contribution detail");
        var wrapped=RichTextLabel.styleAt(rich,font,9,2,24,80,3,15,"LEFT","TOP");
        if(wrapped.getHoverEvent()==null)throw new AssertionError("Wrapped numeric text lost native hover styling");
        var dictionary=new HashMap<String,String>();
        dictionary.put("test.description","持续 %2$s，以 %1$s 水压供水。");dictionary.put("test.pressure","出口压力");dictionary.put("worldcombat.ui.value_line","%1$s：%2$s");
        net.minecraft.locale.Language.inject(new net.minecraft.locale.Language(){
            public String getOrDefault(String key,String fallback){return dictionary.getOrDefault(key,fallback);}
            public boolean has(String key){return dictionary.containsKey(key);}
            public boolean isDefaultRightToLeft(){return false;}
            public net.minecraft.util.FormattedCharSequence getVisualOrder(net.minecraft.network.chat.FormattedText text){return net.minecraft.util.FormattedCharSequence.forward(text.getString(),net.minecraft.network.chat.Style.EMPTY);}
        });
        String localized="{\"paragraphs\":[{\"key\":\"test.description\",\"args\":[{\"binding\":\"pressure\"},{\"binding\":\"time\"}]}],\"bindings\":{\"pressure\":{\"label\":{\"key\":\"test.pressure\"},\"value\":3.2,\"unit\":\" bar\",\"contributions\":[{\"label\":\"Pump\",\"value\":1.2}]},\"time\":{\"label\":\"Duration\",\"value\":\"12 s\"}}}";
        var translated=UiText.component(localized);if(!translated.getString().equals("持续 12 s，以 3.2 bar 水压供水。"))throw new AssertionError(translated.getString());
        var styles=new ArrayList<net.minecraft.network.chat.Style>();translated.visit((style,string)->{if(string.contains("3.2"))styles.add(style);return Optional.empty();},net.minecraft.network.chat.Style.EMPTY);
        if(styles.size()!=1||!styles.getFirst().getHoverEvent().getValue(net.minecraft.network.chat.HoverEvent.Action.SHOW_TEXT).getString().contains("Pump：1.2"))throw new AssertionError("Translation reordering lost bound hover");
        dictionary.put("test.description","At %1$s pressure, supply water for %2$s.");
        // Native Language identity drives translatable cache invalidation; a fresh resource reload recreates it.
        if(!UiText.component(localized).getString().equals("At 3.2 bar pressure, supply water for 12 s."))throw new AssertionError("English parameter order failed");
        String typed="""
            {"paragraphs":[{"key":"test.units","args":[{"binding":"time"},{"binding":"chance"}]}],
             "bindings":{"time":{"value":"2.5","unit":" s","unitKind":"seconds","label":"Duration"},
                         "chance":{"value":"35","unit":"%","unitKind":"percent","label":"Chance"}}}
            """;
        dictionary.put("test.units","Lasts %1$s; chance %2$s.");
        if(!UiText.component(typed).getString().equals("Lasts 2.5 s; chance 35%."))throw new AssertionError(UiText.component(typed).getString());
        dictionary.put("test.units","Lasts %1$s seconds; chance %2$s%%.");
        if(!UiText.component(typed).getString().equals("Lasts 2.5 s; chance 35%."))throw new AssertionError("Duplicate inline units: "+UiText.component(typed).getString());
        dictionary.put("test.units","概率 %2$s%%，持续 %1$s 秒。");
        if(!UiText.component(typed).getString().equals("概率 35%，持续 2.5 s。"))throw new AssertionError("Reordered units: "+UiText.component(typed).getString());
        UiPreferences.write("test:layout","{\"scale\":1.2}");if(!UiPreferences.read("test:layout").contains("1.2"))throw new AssertionError("Local layout storage failed");
        System.out.println("PASS native Rhino full G input -> shared radial -> native mesh -> submenu -> hold; unsigned negative case; signed style colors; actual LDLib tooltip replacement");
    }
}
