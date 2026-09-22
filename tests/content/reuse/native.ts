/** An independent maintenance repertoire consuming the shared native libraries. */
namespace ReuseNative {
    var repertoire = NativeRepertoire.create({ namespace: "reuse", configRoot: "kubejs/config/reuse/",
        request: function (request, input) {
            if (input.op !== "replace-repair-rule") return false;
            NativeAbilities.registry.replace({ id: "analytic", hooks: { repair: function (_context, value) { value.amount *= 3; } } });
            request.reply('{"replaced":true}'); return true;
        }
    });
    NativeVitality.install("reuse:capacity", function (pokemon) { return pokemon.maxHealth(); });
    if (!NativeAbilities.registry.has("analytic")) NativeAbilities.define("analytic");
    NativeAbilities.registry.extend("analytic", { hooks: { repair: function (_context, value) { value.amount *= 1.5; } } });
    NativeAbilities.registry.extend("analytic", { hooks: { repair: function (_context, value) { value.amount += 2; } } });
    if (!NativeAbilities.registry.has("download")) NativeAbilities.define("download");
    NativeAbilities.registry.extend("download", { hooks: { repair: function (_context, value) { value.amount *= 2; } } });
    repertoire.define({ id: "recover", name: "现场修复", description: "停下片刻，修复自身。", uses: ["维护"], kind: "self", range: 1,
        prepare: 8, active: 4, recover: 6, cooldown: 12, style: "maintenance",
        defaults: { amount: 8 }, fields: [repertoire.field(["amount"], "本次修复量", "number", { min: 4, max: 16, step: 2 })],
        execute: function (action, _move, config, done) {
            var world = action.world(), actor = action.actor(), mode = String(action.argument("reuse-mode") || "native");
            if (mode === "suppressed") NativeModifiers.apply(world, actor, { suppressAbility: true }, 8);
            if (mode === "replaced") NativeModifiers.apply(world, actor, { ability: "download" }, 8);
            var result = NativeAbilities.apply(world, actor, "repair", { amount: config.amount });
            var scale = CobblemonCombat.pokemon(actor).healthScale();
            var recovered = world.health(actor, result.amount * scale, "reuse:repair") / scale;
            var previous = repertoire.state(world, actor, "recover");
            repertoire.setState(world, actor, "recover", { repairs: Number(previous.repairs || 0) + 1,
                total: Number(previous.total || 0) + recovered, last: recovered,
                ability: NativeEffects.ability(CobblemonCombat.pokemon(actor), NativeEffects.read(world, actor)) });
            action.after(4, done);
        }
    });
    repertoire.installChannel();
}
