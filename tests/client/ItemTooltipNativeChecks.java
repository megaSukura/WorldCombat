import dev.latvian.mods.kubejs.item.ModifyItemTooltipsKubeEvent;
import dev.latvian.mods.kubejs.plugin.builtin.event.ItemEvents;
import dev.latvian.mods.kubejs.plugin.builtin.wrapper.IngredientWrapper;
import dev.latvian.mods.kubejs.script.*;
import dev.latvian.mods.kubejs.text.tooltip.ItemTooltipData;
import dev.worldcombat.core.client.UiText;
import net.minecraft.network.chat.Component;
import net.minecraft.world.item.*;
import net.minecraft.world.item.crafting.Ingredient;
import java.nio.file.*;
import java.util.*;

public final class ItemTooltipNativeChecks {
    public static final class ModInventory {
        public static boolean curios;
        public static boolean isLoaded(String mod){return curios&&mod.equals("curios");}
    }
    public static void verify(String script)throws Exception{
        for(boolean installed:new boolean[]{false,true}){
            ItemEvents.MODIFY_TOOLTIPS.clear(ScriptType.CLIENT);ModInventory.curios=installed;
            var manager=new ScriptManager(ScriptType.CLIENT){@Override public dev.latvian.mods.kubejs.util.RegistryAccessContainer getRegistries(){return dev.latvian.mods.kubejs.util.RegistryAccessContainer.BUILTIN;}};
            manager.canListenEvents=true;var factory=new KubeJSContextFactory(manager);
            factory.getTypeWrappers().register(Ingredient.class,(context,value,type)->IngredientWrapper.wrap(context,value));
            var context=factory.enter();var scope=context.initStandardObjects();
            context.addToScope(scope,"UiText",UiText.class);context.addToScope(scope,"ModInventory",ModInventory.class);context.addToScope(scope,"ModifyTooltips",ItemEvents.MODIFY_TOOLTIPS);
            context.evaluateString(scope,Files.readString(Path.of(script)),"training-compass-tooltip",1,null);
            var records=new ArrayList<ItemTooltipData>();ItemEvents.MODIFY_TOOLTIPS.post(ScriptType.CLIENT,new ModifyItemTooltipsKubeEvent(records::add));
            if(!installed){if(!records.isEmpty())throw new AssertionError("Tooltip registered without Curios");continue;}
            if(records.size()!=1)throw new AssertionError("Native modifyTooltips did not produce one tooltip: "+records.size());
            var entry=records.getFirst();if(entry.filter().isEmpty()||!entry.filter().get().test(new ItemStack(Items.COMPASS))||entry.filter().get().test(new ItemStack(Items.CLOCK)))throw new AssertionError("Tooltip ingredient filter lost");
            var lines=new ArrayList<Component>();entry.actions().forEach(action->action.apply(lines));
            if(lines.size()!=1)throw new AssertionError("Native tooltip action did not add one line");
            var text=lines.getFirst().getContents();if(!(text instanceof net.minecraft.network.chat.contents.TranslatableContents translated)||!translated.getKey().equals("worldcombat.equipment.compass"))throw new AssertionError("Tooltip lost its native translation key");
            if(!((Component)translated.getArgs()[0]).getString().equals("3")||!((Component)translated.getArgs()[1]).getString().equals("4"))throw new AssertionError("Tooltip numbers disagree with authored modifier values: "+java.util.Arrays.toString(translated.getArgs()));
            ItemEvents.MODIFY_TOOLTIPS.clear(ScriptType.CLIENT);
        }
        System.out.println("PASS actual KubeJS client modifyTooltips: Curios gate, native compass Ingredient, native add action, translated same-source values");
    }
}
