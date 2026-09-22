package dev.worldcombat.cobblemon.client;

import com.cobblemon.mod.common.client.CobblemonClient;
import com.cobblemon.mod.common.pokemon.Pokemon;
import com.google.gson.JsonObject;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.screens.Screen;
import dev.worldcombat.core.client.NativeUiHost;
import dev.worldcombat.core.client.ClientCallbacks;
import java.util.function.Consumer;
import java.util.function.Predicate;

/** Native Summary supplies positions and selection; content owns rendering and interaction. */
public final class SummaryContentBridge {
    private static Predicate<String> supports;
    private static Consumer<Region> renderer;
    private static Predicate<Region> clicks;
    private static Focus focus;
    private SummaryContentBridge() {}

    public record Region(String kind, String pokemon, String species, String move, int pp, int maxPp,
                         int x, int y, int width, int height, double mouseX, double mouseY,
                         int button, GuiGraphics graphics) {}
    private record Focus(Region region, Screen screen, int x, int y, int width, int height) {}

    public static void addAttributesButton(net.neoforged.neoforge.client.event.ScreenEvent.Init.Post event) {
        if (!(event.getScreen() instanceof com.cobblemon.mod.common.client.gui.summary.Summary summary)) return;
        var button = net.minecraft.client.gui.components.Button.builder(net.minecraft.network.chat.Component.translatable("worldcombat.attributes.title"), clicked -> {
            var pokemon = ((dev.worldcombat.cobblemon.mixin.SummaryPokemonAccess) (Object) summary).worldcombat$selectedPokemon();
            if (pokemon != null) CompanionContentClient.dispatch("attributes", pokemon.getUuid().toString(), "");
        }).bounds(Math.max(8, summary.width - 112), summary.height - 27, 102, 20).build();
        event.addListener(button);
    }

    public static void listen(Predicate<String> accepts, Consumer<Region> render, Predicate<Region> click) {
        supports = ClientCallbacks.predicate("native-summary/accepts", accepts);
        renderer = ClientCallbacks.consumer("native-summary/render", render);
        clicks = ClientCallbacks.predicate("native-summary/click", click); focus = null;
    }

    public static boolean active(Pokemon pokemon) {
        if (!ClientCallbacks.active(supports) || !ClientCallbacks.active(renderer) || pokemon == null
            || CobblemonClient.INSTANCE.getStorage().getParty().findByUUID(pokemon.getUuid()) == null) return false;
        var facts = new JsonObject();
        facts.addProperty("pokemon", pokemon.getUuid().toString());
        facts.addProperty("species", pokemon.getSpecies().getResourceIdentifier().toString());
        var moves = new com.google.gson.JsonArray();
        for (var move : pokemon.getMoveSet().getMovesWithNulls()) if (move != null) moves.add(move.getName());
        facts.add("moves", moves);
        return supports.test(facts.toString());
    }

    public static Region region(String kind, Pokemon pokemon, String move, int pp, int maxPp,
                                int x, int y, int width, int height, double mouseX, double mouseY,
                                int button, GuiGraphics graphics) {
        return new Region(kind, pokemon.getUuid().toString(), pokemon.getSpecies().getResourceIdentifier().toString(),
            move, pp, maxPp, x, y, width, height, mouseX, mouseY, button, graphics);
    }

    public static void render(Region region) {
        if (renderer == null) return;
        var graphics = region.graphics();
        graphics.pose().pushPose();
        graphics.pose().translate(0, 0, 200);
        graphics.enableScissor(region.x(), region.y(), region.x() + region.width(), region.y() + region.height());
        try { renderer.accept(region); }
        finally { graphics.disableScissor(); graphics.pose().popPose(); }
    }

    public static boolean click(Region region) { return clicks != null && clicks.test(region); }
    public static void beginFrame() { focus = null; }
    public static void focus(Region region, int x, int y, int width, int height) {
        if (region.mouseX() >= x && region.mouseX() < x + width && region.mouseY() >= y && region.mouseY() < y + height)
            focus = new Focus(region, Minecraft.getInstance().screen, x, y, width, height);
    }
    public static boolean activateFocused() {
        var current = focus;
        if (current == null || Minecraft.getInstance().screen != current.screen()) return false;
        double x = NativeUiHost.mouseX(), y = NativeUiHost.mouseY();
        return x >= current.x() && x < current.x() + current.width() && y >= current.y() && y < current.y() + current.height()
            && click(current.region());
    }
}
