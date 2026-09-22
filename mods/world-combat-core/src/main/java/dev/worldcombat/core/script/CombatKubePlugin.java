package dev.worldcombat.core.script;

import dev.latvian.mods.kubejs.plugin.KubeJSPlugin;
import dev.latvian.mods.kubejs.script.*;
import dev.worldcombat.core.WorldCombatCore;
import dev.worldcombat.core.world.CombatServices;

public final class CombatKubePlugin implements KubeJSPlugin {
    @Override public void registerBindings(BindingRegistry bindings) {
        if (bindings.type().isServer()) bindings.add("WorldCombat", new CombatScriptApi());
        if (bindings.type().isClient()) {
            bindings.add("WorldCombatClient", new dev.worldcombat.core.client.CombatClientApi());
            bindings.add("WorldCombatParticles", new dev.worldcombat.core.client.particles.ParticleScriptApi());
        }
    }

    @Override public void beforeScriptsLoaded(ScriptManager manager) {
        if (manager.scriptType.isClient()) dev.worldcombat.core.client.ClientPresentation.reset();
        if (manager.scriptType.isServer()) {
            CombatServices.CONTENT.begin();
            CombatServices.reload();
        }
    }

    @Override public void afterScriptsLoaded(ScriptManager manager) {
        if (manager.scriptType.isServer()) {
            boolean valid = manager.scriptType.console.errors.isEmpty();
            try { CombatServices.CONTENT.complete(valid); }
            catch (RuntimeException error) {
                valid = false;
                CombatServices.CONTENT.complete(false);
                ConsoleJS.SERVER.error("WorldCombat content contracts rejected", error);
            }
            WorldCombatCore.LOGGER.info("WorldCombat scripts ready={} actions={}", valid, CombatServices.CONTENT.ids());
        }
    }
}
