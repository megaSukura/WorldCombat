package dev.worldcombat.cobblemon.script

import dev.latvian.mods.kubejs.plugin.KubeJSPlugin
import dev.latvian.mods.kubejs.script.BindingRegistry
import dev.latvian.mods.kubejs.script.ScriptManager

class PokemonKubePlugin : KubeJSPlugin {
    override fun beforeScriptsLoaded(manager: ScriptManager) {
        if (manager.scriptType.isServer) NativeContentChannels.reset()
    }
    override fun registerBindings(bindings: BindingRegistry) {
        if (bindings.type().isServer) bindings.add("CobblemonCombat", PokemonScriptApi())
    }
}
