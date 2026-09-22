package dev.worldcombat.cobblemon.script

import com.cobblemon.mod.common.api.moves.MoveTemplate
import com.google.gson.JsonParser

/** Catalogue and individual snapshots share metadata while retaining distinct resource balances. */
object NativeMoveMetadataChecks {
    @JvmStatic fun main(args: Array<String>) {
        net.minecraft.SharedConstants.tryDetectVersion()
        net.neoforged.fml.loading.LoadingModList.of(emptyList(), emptyList(), emptyList(), emptyList(), emptyMap())
        net.minecraft.server.Bootstrap.bootStrap()
        val rows = JsonParser.parseString("""[{"id":"sample","flags":{"numeric":1,"zero":0,"boolean":true,"disabled":false,"permission":false},"permission":true,"extension":{"value":7}}]""").asJsonArray
        NativeMoveMetadata.replace(rows)
        val template = MoveTemplate.dummy("sample")
        val move = template.create(3, 2)
        val catalogue = PokemonMoveView.capture(template)
        val individual = PokemonMoveView.capture(move)
        check(catalogue.flag("numeric") && individual.flag("boolean"))
        check(!individual.flag("zero") && !individual.flag("disabled") && !individual.flag("absent"))
        check(catalogue.flags() == individual.flags() && catalogue.metadata() == individual.metadata())
        val flags = JsonParser.parseString(catalogue.flags()).asJsonObject
        check(flags.get("numeric").asJsonPrimitive.isNumber && flags.get("boolean").asJsonPrimitive.isBoolean)
        check(!catalogue.flag("permission") && JsonParser.parseString(catalogue.metadata()).asJsonObject.get("permission").asBoolean)
        check(catalogue.pp() == template.pp && individual.pp() == 3 && individual.maxPp() == move.maxPp)
        check(individual.raisedPpStages() == 2 && individual.basePp() == template.pp && catalogue.key() != individual.key())
        rows[0].asJsonObject.getAsJsonObject("flags").addProperty("numeric", 0)
        rows[0].asJsonObject.getAsJsonObject("extension").addProperty("value", 9)
        check(catalogue.flag("numeric") && JsonParser.parseString(catalogue.metadata()).asJsonObject.getAsJsonObject("extension").get("value").asInt == 7)
        NativeMoveMetadata.replace(rows)
        check(!PokemonMoveView.capture(template).flag("numeric") && catalogue.flag("numeric"))
        move.currentPp = 1
        check(individual.pp() == 3 && PokemonMoveView.capture(move).pp() == 1)
        NativeMoveMetadata.replace(com.google.gson.JsonArray())
        check(PokemonMoveView.capture(template).metadata() == "{}")
        println("PASS native metadata: catalogue/individual equivalence, resource identity, arbitrary fields, immutable snapshots and reload replacement")
    }
}
