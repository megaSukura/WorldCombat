/**
 * 扮演 / roleplay — 执行组织。
 *
 * 两幕：
 *   描（windup，提交前）：一道光绕着对手描出它的形状（`action.present` 预告，可被打断且不花代价）。
 *   披（提交后）：那张“扮相”沿两人连线飞回施法者脸上，披上后挂一层与对手相同的临时特性；施法者身上浮出
 *     该特性的名字，扮相期间绕身低密度发光。
 *
 * 特性层：走共享的 `NativeModifiers` ability 层（`{ ability }`，与腹鼓、纹理同一套临时覆盖机制），
 *   到期自动还原原生特性；因此被收回或重载的个体会回到自己的特性。宝可梦之外没有特性可言，
 *   `ready` 对非宝可梦直接拒绝（双方都必须是宝可梦），不浪费 PP。
 * 反制：目标特性正被胃液一类效果压掉时读不出特性；目标特性若带 failroleplay、自己若带 cantsuppress
 *   （`NativeAbilities` 的共享标记，当前没有特性声明）也会失败，保留原作的可复制/可压制规则。
 * 配置项 dwell（深扮 / 浅饰）改变维持时长与冷却。
 */
namespace PokemonSkills {
    export const roleplayScene = "world_combat:move_roleplay";
    export const roleplayMask = "world_combat:roleplay_mask";
    export const roleplayAbilityText = "world_combat.move.roleplay.text.ability";
    export const roleplayUnchangedText = "world_combat.move.roleplay.text.same";
    const roleplayAbilityPattern = /^[a-z0-9]{1,64}$/;

    /** 一个战斗者当前生效的特性（含临时层与压制）；非宝可梦返回 ""。 */
    export function roleplayAbility(world: CombatWorld, actor: CombatActor): string {
        if (String(actor.domain()) !== "cobblemon" || !world.valid(actor)) return "";
        const pokemon = CobblemonCombat.pokemon(actor), state = NativeEffects.read(world, actor);
        return NativeEffects.ability(pokemon, state);
    }

    /** 目标特性是否允许被扮演（原生 failroleplay 标记）。 */
    export function roleplayCopyable(ability: string): boolean {
        return !!ability && !NativeAbilities.flag(ability, "failroleplay");
    }

    define({
        id: "roleplay",
        name: "Role Play",
        description: "扮演对手，让自己的特性暂时变得和对手相同。",
        uses: ["借对手的特性打这一段", "把对手的强力特性复制到自己身上", "在开战前换成更合适的特性"],
        kind: "enemy",
        range: 8,
        maxRange: 15,
        prepare: 8,
        active: 0,
        recover: 7,
        cooldown: 90,
        style: "mimic",
        defaults: { dwell: false, ai: { maxChase: 15, leaveStation: false } },
        fields: [],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills["roleplay"], detail: { values: config } };
            return { radius: p("roleplay", "reach", context), geometry: "line", style: "mimic", color: 0xFFC24A, label: "扮演" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["roleplay"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const dwell = !!(config && config.dwell);
            return {
                prepare: Math.round(p("roleplay", "tempo", context)),
                recover: Math.round(p("roleplay", "aftercast", context)),
                cooldown: Math.round(p("roleplay", "recharge", context)) + (dwell ? 18 : -10),
                active: 0,
                range: p("roleplay", "reach", context)
            };
        },
        ready: function (action) {
            const world = action.sense(), actor = action.actor(), target = action.target();
            if (target === null || !world.valid(target) || world.friendly(target)) return "invalid-target";
            if (String(actor.domain()) !== "cobblemon" || String(target.domain()) !== "cobblemon") return "no-ability";
            const body = world.observe(target);
            if (body === null) return "invalid-target";
            if (body.position().minus(action.origin()).length() > p("roleplay", "reach", action)) return "out-of-range";
            if (!world.clear(action.origin(), body.position())) return "no-line";
            const mine = roleplayAbility(world, actor), theirs = roleplayAbility(world, target);
            if (!theirs) return "target-suppressed";
            if (!NativeModifiers.abilityCopyable(world, target)) return "uncopyable";
            if (!NativeModifiers.abilitySuppressible(world, actor)) return "self-locked";
            if (mine === theirs) return "already-same";
            return "";
        },
        windup: function (action, config, prepare) {
            const actor = action.actor(), target = action.target();
            const path: (string | number[])[] = target === null ? [String(actor.ref())] : [String(target.ref()), String(actor.ref())];
            action.present("world_combat:roleplay:trace", roleplayScene, 1, action.origin(), JSON.stringify({
                moment: "trace", target: target === null ? "" : String(target.ref()), path: path,
                traits: p("roleplay", "traits", action)
            }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor(), target = action.target();
            const body = world.observe(actor);
            if (target === null || !world.valid(target) || body === null) { done(action); return; }
            const ability = roleplayAbility(world, target);
            if (!ability || !roleplayAbilityPattern.test(ability) || !NativeModifiers.abilitySuppressible(world, actor)
                || !NativeModifiers.abilityCopyable(world, target)) {
                WorldFeedback.emit(world, roleplayScene, 1, body.position(), { moment: "fizzle", target: String(actor.ref()) }, 22);
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), roleplayUnchangedText, [], 28);
                sound(action, "minecraft:block.amethyst_block.break");
                done(action);
                return;
            }
            const hold = Math.max(40, Math.round(p("roleplay", "hold", action)));
            const traits = Math.max(6, Math.round(p("roleplay", "traits", action)));
            NativeModifiers.apply(world, actor, { ability: ability }, hold);
            MobEffects.apply(world, actor, roleplayMask, hold, 0);
            const path: (string | number[])[] = [String(target.ref()), String(actor.ref())];
            WorldFeedback.emit(world, roleplayScene, 1, body.position(),
                { moment: "don", target: String(actor.ref()), path: path, traits: traits,
                    intensity: Math.max(0.7, Math.min(2, hold / 160)) }, 34);
            WorldFeedback.keep(world, "world_combat:roleplay:mask:" + String(actor.ref()), roleplayScene, 1, body.position(),
                { moment: "mask", target: String(actor.ref()), traits: traits }, Math.min(hold, 160));
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), roleplayAbilityText,
                [{ key: "cobblemon.ability." + ability, fallback: ability }], 44);
            sound(action, "minecraft:entity.illusioner.cast_spell");
            done(action);
        }
    });
}
