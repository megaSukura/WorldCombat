package dev.worldcombat.core.client;
import java.util.function.Consumer;
public final class CombatClientApi {
    public void scene(String id, int version, Consumer<ClientFrame> handler) { ClientPresentation.register("scene", id, version, handler); }
    public void hud(String id, int version, Consumer<ClientFrame> handler) { ClientPresentation.register("hud", id, version, handler); }
    public void world(String id, int version, Consumer<ClientFrame> handler) { ClientPresentation.register("world", id, version, handler); }
    public void tick(String id, Runnable handler) { ClientPresentation.registerTick(id, handler); }
    public void cleanup(String id, Runnable handler) { ClientPresentation.cleanup(id, handler); }
}
