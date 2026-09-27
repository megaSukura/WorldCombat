/**
 * 挺住 / endure 的出手方式。
 *
 * 念头的形状：咬紧牙关（raise），窗口内任何把你打到倒下的攻击都被截停在 1 HP（save），用光次数或时间走完，
 * 坚持纹散去；屹立取向下整个窗口定身，用掉次数后再接一段力竭（spent → 30 刻定身）。三幕：咬牙 → 承击 → 力竭／到期。
 * 挣扎取向下窗口内可以边走边挺；两种取向的普通伤害都照常承受，只有真正的一记 save 才闪一下，也没有额外的无敌期。
 * 持续轮廓与剩余心绑在真正的 guard 托管效果上（onEffect），随它存续、结束或驱散一起收，不用固定时长的假持续。
 * 承击复用共享 GuardEffects 的 survive 模式：不减免普通伤害，只在致命一击处截断。
 */
namespace PokemonSkills {
    const endureScene = "world_combat:move_endure";
    const endureGuardScene = "world_combat:move_endure_guard";
    const endureGuardKey = "world_combat:move_endure:guard";
    export const EndureRule = "world_combat:endure";
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
            // 持续轮廓与剩余心绑在真正的 guard 托管效果上，随它存续、随它结束或驱散一起收，不用固定时长的假持续。
            WorldFeedback.onEffect(world, effect.id(), endureGuardKey, endureGuardScene, 1, body.position(), {
                actor: String(effect.target().ref()), charges: state.charges, initial: custom.initial || 1,
                intensity: endureIntensity(state.charges, custom.initial || 1), scramble: custom.scramble ? 1 : 0
            });
        },
        guarded: function (effect, state, amount, incoming) {
            const world = effect.world(), target = effect.target(), body = world.observe(target);
            if (body === null) return;
            const custom: any = state;
            const lethal = Math.max(0.05, Math.min(1, amount / Math.max(1, body.maxHealth())));
            WorldFeedback.emit(world, endureScene, 1, body.position(), { moment: "save", target: String(target.ref()),
                lethalCount: Math.max(6, Math.round(lethal * 30)), intensity: endureIntensity(state.charges, custom.initial || 1), charges: state.charges }, 28);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.4, 0)), endureSaveText, [state.charges], 30);
            world.sound("minecraft:item.totem.use", body.position(), 16, "{}");
            if (state.charges <= 0) {
                WorldFeedback.emit(world, endureScene, 1, body.position(), { moment: "spent", target: String(target.ref()) }, 24);
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.4, 0)), endureSpentText, [], 26);
                if (!custom.scramble && custom.grit > 0) world.effect("world_combat:rooted", target, "{}", custom.grit);
            }
        }
    });

    define({
        freeMovement: function (config) { return !config.scramble; },
        id: "endure",
        cooldownParameter: "charge",
        name: "Endure",
        description: "在短窗口内，来自敌人的致命一击只会把你打到 1 HP；它不减免普通伤害，且连续使用容易直接失败。",
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
            action.present("world_combat:move_endure:raise", endureScene, 1, action.origin(), JSON.stringify({ moment: "raise", intensity: 1 }));
            return prepare;
        },
        ready: function (action, config) {
            const key = "endure_fizzle", stored = action.data(key);
            if (stored !== null) return JSON.parse(stored).failed ? "world_combat:fizzle" : "";
            const world = action.sense(), actor = action.actor();
            // 连用计数按共享的 stallReset 窗口先复位：超过这么久没用过就归零，不拿旧计数继续掷。
            const previous = state(world, actor, GuardEffects.stallKey);
            const count = GuardEffects.stall(previous, world.tick(), p("endure", "stallReset", action));
            const chance = count <= 0 ? 0 : p("endure", "fizzle", action);
            const failed = world.random() < chance;
            action.data(key, JSON.stringify({ failed: failed }));
            return failed ? "world_combat:fizzle" : "";
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor();
            const window = p("endure", "window", action);
            const charges = p("endure", "charges", action);
            const scramble = !!(config && config.scramble);
            const previous = state(world, actor, GuardEffects.stallKey), now = world.tick();
            const count = GuardEffects.stall(previous, now, p("endure", "stallReset", action));
            setState(world, actor, GuardEffects.stallKey, { stall: count + 1, at: now });
            const guard: any = { rule: EndureRule, mode: "survive", capacity: 0, fraction: 0,
                minimumHealth: 1, charges: charges, linkRange: 0, initial: charges, scramble: scramble, grit: p("endure", "grit", action) };
            const guardId = GuardEffects.apply(world, actor, guard, window);
            // 屹立取向：整个窗口由本招自己的 root 托管定身；挣扎取向窗口内仍可走动。
            // 耗尽力竭的 30 刻 root 由 guarded 在次数归零时追加，与这条窗口一起表达整段定身。
            if (!scramble && guardId) world.effect("world_combat:rooted", actor, "{}", Math.max(1, Math.round(window)));
            sound(action, "minecraft:entity.warden.heartbeat");
            done(action);
        }
    });
}
