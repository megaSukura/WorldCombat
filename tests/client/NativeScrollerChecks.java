import com.lowdragmc.lowdraglib2.gui.ui.UIElement;
import com.lowdragmc.lowdraglib2.gui.ui.elements.ScrollerView;
import dev.latvian.mods.rhino.ContextFactory;
import java.nio.file.*;
import java.util.*;
import com.lowdragmc.lowdraglib2.gui.ui.elements.Button;
import com.lowdragmc.lowdraglib2.gui.ui.event.UIEventListener;

/** Exercise the locked LDLib field/method collision through the actual Rhino wrapper. */
public final class NativeScrollerChecks {
    public static final class NativeEditorHost {
        public static UIElement opened;
        private static int styleEpoch;
        public static int width(){return 480;}
        public static int height(){return 300;}
        public static boolean active(){return opened!=null;}
        public static UIElement themed(UIElement root){return root;}
        public static void open(UIElement root,String title){opened=root;}
        public static void close(){opened=null;}
        public static boolean groupDisplayed(String label){
            int epoch=++styleEpoch;
            opened.selfAndAllChildren().forEach(element->element.getStyleBag().compute(epoch));
            return opened.selfAndAllChildren().filter(element->element instanceof com.lowdragmc.lowdraglib2.gui.ui.elements.Label text&&text.getText().getString().equals(label))
                .findFirst().orElseThrow().getParent().isDisplayed();
        }
        public static void click(String text)throws Exception {
            var queue=new ArrayDeque<UIElement>();queue.add(opened);
            while(!queue.isEmpty()){
                var element=queue.remove();
                if(element instanceof Button button&&button.text.getText().getString().equals(text)){
                    var field=Button.class.getDeclaredField("onClick");field.setAccessible(true);
                    ((UIEventListener)field.get(button)).handleEvent(null);return;
                }
                queue.addAll(element.getChildren());
            }
            throw new AssertionError("Missing native editor button: "+text);
        }
    }
    public static void verify(String script)throws Exception {
        com.lowdragmc.lowdraglib2.gui.ui.style.PropertyRegistry.init();
        var context = new ContextFactory().enter();
        var scope = context.initStandardObjects();
        context.addToScope(scope, "UIElement", UIElement.class);
        context.addToScope(scope, "ScrollerView", ScrollerView.class);
        context.evaluateString(scope, "var scroll=new ScrollerView(); var failed=false; try {scroll.viewContainer.addChild(new UIElement());} catch(e) {failed=String(e).indexOf('addChild')>=0;} if(!failed)throw Error('Expected native field/method collision'); var child=new UIElement(), container=null; scroll['viewContainer(java.util.function.Consumer)'](function(value){container=value;}); container.addChild(child); container.lss('height',72); if(container.getChildren().size()!==1)throw Error('Native scroll content child missing');", "native-scroller-content", 1, null);
        System.out.println("PASS locked LDLib ScrollerView: reproduced ambiguous field/method access; native consumer exposes usable UIElement");
        for(var type:List.of(NativeEditorHost.class,Button.class,com.lowdragmc.lowdraglib2.gui.ui.elements.Label.class,
                com.lowdragmc.lowdraglib2.gui.ui.data.ScrollerMode.class,com.lowdragmc.lowdraglib2.gui.ui.data.TextWrap.class,
                com.lowdragmc.lowdraglib2.gui.ui.data.Tooltips.class,com.lowdragmc.lowdraglib2.gui.texture.SDFRectTexture.class,ArrayList.class,
                dev.worldcombat.core.client.ClientCallbacks.class,dev.worldcombat.core.client.UiText.class,
                dev.worldcombat.core.client.UiPreferences.class,dev.worldcombat.core.client.RichTextLabel.class))context.addToScope(scope,type.getSimpleName(),type);
        context.evaluateString(scope,Files.readString(Path.of(script)),"production-native-editor",1,null);
        System.out.println("PASS native LDLib editor in Rhino: full customization, grouped fields, native callbacks, numeric changes, prose tab and preserved refresh");
    }
}
