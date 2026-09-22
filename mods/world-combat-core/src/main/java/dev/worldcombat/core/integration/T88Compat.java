package dev.worldcombat.core.integration;

import cn.ussshenzhou.t88.config.ConfigHelper;
import cn.ussshenzhou.t88.networkanalyzer.NetworkWatcher;
import cn.ussshenzhou.t88.networkanalyzer.NetworkWatcherBlacklist;
import dev.worldcombat.core.WorldCombatCore;
import net.minecraft.resources.ResourceLocation;

import java.util.List;

/**
 * Keeps T88's network analyzer away from Cobblemon packets that decode lazily.
 *
 * T88 measures every packet by re-invoking its codec's {@code encode} on a worker thread. Cobblemon's
 * {@code SetPartyPokemonPacket}, {@code SetPCPokemonPacket} and the two ride-controller packets keep
 * the undecoded bytes in a one-shot buffer and decode them inside {@code handle}; the analyzer's
 * {@code encode} call consumes that buffer first, so the real handler reads past the end and the
 * party never reaches the client (empty party HUD, companion menus without content). The general fix is
 * {@code T88NetworkWatcherMixin}, which cancels the analyzer for every packet; this class keeps the four
 * known ids in T88's own exact-id size blacklist (persisted to {@code NetworkWatcherBlacklist.json}) so the
 * Cobblemon case stays covered even if a future T88 build changes the method the mixin targets.
 */
public final class T88Compat {
    private static final List<ResourceLocation> LAZY_COBBLEMON_PACKETS = List.of(
        ResourceLocation.fromNamespaceAndPath("cobblemon", "set_party_pokemon"),
        ResourceLocation.fromNamespaceAndPath("cobblemon", "set_pc_pokemon"),
        ResourceLocation.fromNamespaceAndPath("cobblemon", "s2c_update_ride_controller"),
        ResourceLocation.fromNamespaceAndPath("cobblemon", "c2s_update_ride_controller"));

    private T88Compat() {}

    /** Call after every mod constructor has run, so T88's config is registered. */
    public static void install() {
        for (ResourceLocation id : LAZY_COBBLEMON_PACKETS) NetworkWatcher.SIZE_BLACKLIST.put(id, NetworkWatcher.NULL);
        try {
            ConfigHelper.getConfigWrite(NetworkWatcherBlacklist.class, config -> {
                for (ResourceLocation id : LAZY_COBBLEMON_PACKETS) if (!config.blacklist.contains(id)) config.blacklist.add(id);
            });
        } catch (RuntimeException e) {
            WorldCombatCore.LOGGER.warn("WorldCombat could not persist the T88 network watcher blacklist; the runtime blacklist is still active.", e);
        }
        WorldCombatCore.LOGGER.info("WorldCombat excluded {} lazily decoded Cobblemon packets from the T88 network analyzer.", LAZY_COBBLEMON_PACKETS.size());
    }
}
