package dev.worldcombat.core.world;

import dev.worldcombat.core.runtime.ContentRegistry;
import net.minecraft.server.MinecraftServer;
import net.minecraft.world.entity.LivingEntity;
import java.util.*;

public final class CombatServices {
    public static final ContentRegistry CONTENT = new ContentRegistry();
    private static final Map<MinecraftServer, MinecraftCombat> SERVERS = new IdentityHashMap<>();
    private static final List<CombatDomain> DOMAINS = new ArrayList<>(List.of(new BodyDomain()));
    private static final CombatDomain VANILLA = new CombatDomain() {
        public String id() { return "minecraft"; }
        public boolean supports(LivingEntity entity) { return true; }
        public UUID identity(LivingEntity entity) { return entity.getUUID(); }
    };

    private CombatServices() {}
    public static synchronized void registerDomain(CombatDomain domain) {
        if (DOMAINS.stream().anyMatch(it -> it.id().equals(domain.id())))
            throw new IllegalArgumentException("Duplicate combat domain: " + domain.id());
        DOMAINS.add(domain);
    }
    public static synchronized CombatDomain domain(LivingEntity entity) {
        return DOMAINS.stream().filter(it -> it.supports(entity)).findFirst().orElse(VANILLA);
    }
    public static synchronized MinecraftCombat get(MinecraftServer server) {
        return SERVERS.computeIfAbsent(server, MinecraftCombat::new);
    }
    public static synchronized MinecraftCombat existing(MinecraftServer server) { return SERVERS.get(server); }
    public static void reload() {
        List<MinecraftCombat> services;
        synchronized (CombatServices.class) { services = List.copyOf(SERVERS.values()); }
        for (var service : services) service.runtime().reset("content-reloaded");
    }
    public static synchronized void stopping(MinecraftServer server) {
        var service = SERVERS.get(server);
        if (service != null) service.stop();
    }
    public static synchronized void stopped(MinecraftServer server) {
        var service = SERVERS.remove(server);
        if (service != null) service.stop();
        if (SERVERS.isEmpty()) CONTENT.shutdown();
    }
}
