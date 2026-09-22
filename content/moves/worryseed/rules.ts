/**
 * 烦恼种子 / worryseed 的「不眠」行为。
 *
 * 种子把目标的特性顶成不眠后，这里在共享的 CombatStatus 门上补一条判定：任何战斗者只要当前生效特性是
 * insomnia（或带 statusImmune 标记），就不能获得睡眠。它按「有效特性」判断，因此不眠来自哪里都一样——
 * 这颗种子、别的来源给的临时特性层，或天生就带不眠的个体。判定落在共享门上，别的招式（催眠、哈欠、
 * 蘑菇孢子……）不需要知道这颗种子的存在。
 */
namespace PokemonSkills {
    CombatStatus.gate.define({
        id: "world_combat:move_worryseed/sleep-gate",
        applies: function (context) {
            return context.allowed && context.name === "sleep"
                && String(context.actor.domain()) === "cobblemon" && context.world.valid(context.actor);
        },
        apply: function (context) {
            const pokemon = CobblemonCombat.pokemon(context.actor);
            const ability = NativeEffects.ability(pokemon, NativeEffects.read(context.world, context.actor));
            if (ability === "insomnia" || NativeAbilities.flag(ability, "statusImmune")) {
                context.allowed = false;
                context.reason = "worryseed-awake";
            }
        }
    });
}
