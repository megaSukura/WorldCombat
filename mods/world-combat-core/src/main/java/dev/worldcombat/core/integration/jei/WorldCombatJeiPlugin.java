package dev.worldcombat.core.integration.jei;

import dev.worldcombat.core.WorldCombatCore;
import dev.worldcombat.core.client.ItemInformation;
import mezz.jei.api.IModPlugin;
import mezz.jei.api.JeiPlugin;
import mezz.jei.api.constants.RecipeTypes;
import mezz.jei.api.recipe.vanilla.IJeiIngredientInfoRecipe;
import mezz.jei.api.registration.IRecipeRegistration;
import mezz.jei.api.runtime.IJeiRuntime;
import net.minecraft.client.Minecraft;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.network.chat.Component;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.item.Items;
import java.util.*;

/** Loaded only by JEI's optional plugin discovery. Content owns item identities and localized descriptions. */
@JeiPlugin
public final class WorldCombatJeiPlugin implements IModPlugin {
    private record Page(String item, List<String> keys, List<String> translated) {}
    private IRecipeRegistration registration;
    private IJeiRuntime runtime;
    private long nextPage;
    private final Map<Page, List<IJeiIngredientInfoRecipe>> pages = new LinkedHashMap<>();
    private Set<Page> visible = new LinkedHashSet<>();

    @Override public ResourceLocation getPluginUid() { return ResourceLocation.fromNamespaceAndPath(WorldCombatCore.MOD_ID, "item_information"); }
    @Override public void registerRecipes(IRecipeRegistration registration) {
        this.registration = registration;
        pages.clear(); visible.clear(); nextPage = 0;
    }
    @Override public void onRuntimeAvailable(IJeiRuntime runtime) {
        this.runtime = runtime;
        ItemInformation.subscribe("jei", this::refresh);
        refresh();
    }
    @Override public void onRuntimeUnavailable() {
        ItemInformation.subscribe("jei", null);
        runtime = null; registration = null; pages.clear(); visible.clear(); nextPage = 0;
    }
    private void refresh() {
        Minecraft.getInstance().execute(() -> {
            if (runtime == null || registration == null) return;
            try { publish(); }
            catch (RuntimeException failure) { WorldCombatCore.LOGGER.error("Unable to refresh WorldCombat item information in JEI", failure); }
        });
    }
    private List<IJeiIngredientInfoRecipe> existing() {
        return runtime.getRecipeManager().createRecipeLookup(RecipeTypes.INFORMATION).includeHidden().get().toList();
    }
    private void publish() {
        var manager = runtime.getRecipeManager();
        var next = new LinkedHashSet<Page>();
        for (var entry : ItemInformation.entries()) {
            var id = ResourceLocation.tryParse(entry.item());
            var item = id == null ? null : BuiltInRegistries.ITEM.getOptional(id).orElse(null);
            if (item == null || item == Items.AIR) continue;
            Component[] text = entry.keys().stream().map(Component::translatable).toArray(Component[]::new);
            var page = new Page(entry.item(), entry.keys(), Arrays.stream(text).map(Component::getString).toList());
            if (!pages.containsKey(page)) {
                String marker = WorldCombatCore.MOD_ID + ":item_information/" + nextPage++;
                for (int i=0;i<text.length;i++) text[i]=text[i].copy().withStyle(style -> style.withInsertion(marker));
                // The locked JEI 19 registration and runtime share one recipe manager. Keep its
                // native information-page factory, and retain the resulting instances for hide/unhide.
                registration.addIngredientInfo(item, text);
                var created = existing().stream().filter(recipe -> recipe.getDescription().stream().anyMatch(line ->
                    line.visit((style, part) -> marker.equals(style.getInsertion()) ? Optional.of(Boolean.TRUE) : Optional.<Boolean>empty(),
                        net.minecraft.network.chat.Style.EMPTY).orElse(false))).toList();
                if (created.isEmpty()) continue;
                pages.put(page, created);
            }
            next.add(page);
            if (!visible.contains(page)) manager.unhideRecipes(RecipeTypes.INFORMATION, pages.get(page));
        }
        for (var previous : visible) if (!next.contains(previous)) manager.hideRecipes(RecipeTypes.INFORMATION, pages.get(previous));
        visible = next;
    }
}
