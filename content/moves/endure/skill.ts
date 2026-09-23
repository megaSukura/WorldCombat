/**
 * 挺住 / endure 的出手方式。
 *
 * 念头的形状：咬紧牙关站住（brace），窗口内任何把你打到倒下的攻击都被截停在 1 HP（save），用光次数或时间走完，
 * 坚持纹散去；屹立取向下，用掉次数后还会短暂力竭（spent → 定身）。三幕：咬牙 → 承击 → 力竭／到期。
 * 承击复用共享 GuardEffects 的 survive 模式：不减免普通伤害，只在致命一击处截断。
 */
namespace PokemonSkills {
    const endureScene = "world_combat:move_endure";
    export const EndureRule = "world_combat:endure";
    const endureBraceKey = "world_combat:move_endure:brace";
    const endureSaveText = "world_combat.move.endure.text.save";
    const endureSpentText = "world_combat.move.endure.text.spent";

    function endureIntensity(charges: number, initial: number): number {
        return Math.max(0.2, Math.min(1, initial > 0 ? charges / initial : 0));
    }

    GuardEffects.register(EndureRule, {
        /** 只截断敌对来源的致命一击；自己的摔落、灼伤不算「受到攻击」。 */
        accepts: function (effect, state, incoming) {
            const world = effect.world();
            return !!incoming.source && String(incoming.source.ref()) !== String(effect.target().ref()) && !world.friendly(incoming.source);
        },
        pulse: function (effect, state) {
            const world = effect.world(), body = world.observe(effect.target());
            if (body === null) return;
            const custom: any = state;
            WorldFeedback.keep(world, endureBraceKey, endureScene, 1, body.position(), {
                moment: "brace", target: String(effect.target().ref()), intensity: endureIntensity(state.charges, custom.initial || 1)
            }, 20);
        },
        guarded: function (effect, state, amount, incoming) {
            const world = effect.world(), target = effect.target(), body = world.observe(target);
            if (body === null) return;
            const custom: any = state;
            const lethal = Math.max(0.05, Math.min(1, amount / Math.max(1, body.maxHealth())));
            WorldFeedback.emit(world, endureScene, 1, body.position(), { moment: "save", target: String(target.ref()),
                lethal: lethal, lethalCount: Math.max(6, Math.round(lethal * 30)), intensity: endureIntensity(state.charges, custom.initial || 1), charges: state.charges }, 28);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.4, 0)), endureSaveText, [], 30);
            world.sound("minecraft:item.totem.use", body.position(), 16, "{}");
            if (state.charges <= 0) {
                WorldFeedback.emit(world, endureScene, 1, body.position(), { moment: "spent", target: String(target.ref()) }, 24);
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.4, 0)), endureSpentText, [], 26);
                if (!custom.scramble && custom.grit > 0) world.effect("world_combat:rooted", target, "{}", custom.grit);
            }
        }
    });

    define({
        id: "endure",
        cooldownParameter: "charge",
        name: "Endure",
        description: "The user endures any attack with at least 1 HP. Its chance of failing rises if it is used in succession.",
        uses: ["残血时拖住回合、等待救援", "为队友争取一次打断或撤退", "主动去吃一记致命招"],
        kind: "self",
        range: 0,
        prepare: 8,
        active: 0,
        recover: 6,
        cooldown: 90,
        stationary: false,
        style: "endure",
        defaults: { scramble: false, ai: { threshold: 0.35 } },
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["endure"], detail: { values: config }, world, actor, attributes };
            const scramble = !!(config && config.scramble);
            return {
                prepare: p("endure", "raise", context),
                recover: scramble ? 12 : 6,
                cooldown: p("endure", "charge", context),
                range: 0
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_endure:brace", endureScene, 1, action.origin(), JSON.stringify({ moment: "brace", intensity: 1 }));
            return prepare;
        },
        ready: function (action, config) {
            const key = "endure_fizzle", stored = action.data(key);
            if (stored !== null) return JSON.parse(stored).failed ? "world_combat:fizzle" : "";
            const failed = action.sense().random() < p("endure", "fizzle", action);
            action.data(key, JSON.stringify({ failed: failed }));
            return failed ? "world_combat:fizzle" : "";
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor();
            const window = p("endure", "window", action);
            const charges = p("endure", "charges", action);
            const scramble = !!(config && config.scramble);
            const previous = state(world, actor, GuardEffects.stallKey), now = world.tick();
            const count = previous && typeof previous.stall === "number" && now - (previous.at || 0) <= p("endure", "stallReset", action) ? previous.stall : 0;
            setState(world, actor, GuardEffects.stallKey, { stall: count + 1, at: now });
            const guard: any = { rule: EndureRule, mode: "survive", capacity: 0, fraction: 0,
                minimumHealth: 1, charges: charges, linkRange: 0, initial: charges, scramble: scramble, grit: p("endure", "grit", action) };
            GuardEffects.apply(world, actor, guard, window);
            if (!scramble) world.effect("world_combat:rooted", actor, "{}", window);
            sound(action, "minecraft:entity.warden.heartbeat");
            action.present("world_combat:move_endure:brace2", endureScene, 1, action.origin(), JSON.stringify({ moment: "brace", intensity: 1 }));
            done(action);
        }
    });
}
