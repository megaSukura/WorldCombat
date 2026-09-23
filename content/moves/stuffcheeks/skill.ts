/**
 * 大快朵颐 / Stuff Cheeks —— 出手方式。
 *
 * 核心念头：把手里那颗树果整颗塞进嘴里，三两下嚼碎吞下；果子自己的效力在身体里散开，鼓起来的肚子撑出
 *   一道硬壳，防御大幅提高。手里没有树果时这一口根本没法吃。
 *
 * 两幕：
 *   起（windup，提交前）：把果子举到嘴边、颊部鼓动（moment raise）；只播预告，可被打断；
 *     提交前的 `ready` 复核手里是否还有树果。
 *   吞（execute，提交后）：果子经统一装备事务被吃掉（CAS 取走），果子自己的效果落到自己身上（回复／解异常／
 *     升能力）；接着防御 +guard、身周撑起护体环；嚼 `chew` 刻后 settle 收势。
 *
 * 与同族分开：虫咬吃对对手的果子、打嗝拿自己的果子当燃料喷毒；大快朵颐只吃自己那颗，把它变成一层护体。
 *   与铁壁／溶化分开：那些隔空直接升防，这一口必须先有树果。
 */
namespace PokemonSkills {
    const stuffcheeksScene = "world_combat:move_stuffcheeks";
    const stuffcheeksEatText = "world_combat.move.stuffcheeks.text.eat";
    const stuffcheeksBraceText = "world_combat.move.stuffcheeks.text.brace";
    const stuffcheeksBoostText = "world_combat.move.stuffcheeks.text.boost";
    const stuffcheeksCureText = "world_combat.move.stuffcheeks.text.cure";
    const stuffcheeksNoneText = "world_combat.move.stuffcheeks.text.none";
    /** 表现里的参考半径：`data.scale = 实际护体半径 / 这个数`。 */
    export const stuffcheeksReferenceRadius = 0.9;

    /** 自己手里的树果；不是树果（或没持有物）时返回 null（这一口就没有果子可吃）。 */
    export function stuffcheeksBerryOf(world: CombatWorld, actor: CombatActor): NativeItems.Berry | null {
        return NativeItems.berryFrom(NativeItems.heldOf(world, actor));
    }
    /** 把吃下的树果效果落到自己身上；走共享树果注册库（回复/解异常/升能力），本招不取尖刺反噬。 */
    export function stuffcheeksAbsorb(world: CombatWorld, actor: CombatActor, berry: NativeItems.Berry, absorb: number): NativeItems.EatResult {
        return NativeItems.eat(world, actor, berry, absorb, 0, "stuffcheeks_berry");
    }

    define({
        id: stuffcheeksId,
        cooldownParameter: "wait", name: "大快朵颐",
        description: "把手里携带的树果整颗吃掉，防御大幅提高；果子自己的效果（回复／解异常／提升能力）也一并落到自己身上。手里没有树果时使不出来。细嚼让果子的回复更足、防御更高，代价是嚼得更久、冷却更长。",
        uses: ["在开战前把携带的树果换成一层防御", "用果子的回复或解异常顺手救自己一命", "把手里的能力树果（如芒芒果）连效果一起吃掉"],
        kind: "self", range: 1, maxRange: 1, prepare: 7, active: 1, recover: 5, cooldown: 90, style: "feast",
        maximumTicks: 160,
        defaults: { savor: false, ai: { maxChase: 12 } },
        fields: [flag("savor", "细嚼")],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[stuffcheeksId], detail: { values: config } };
            return { radius: Math.max(0.6, p(stuffcheeksId, "bulge", context) + 0.3), geometry: "area", style: "feast", color: 0xE0B67A,
                label: config && config.savor === true ? "大快朵颐 · 细嚼" : "大快朵颐" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[stuffcheeksId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.max(3, Math.round(p(stuffcheeksId, "tempo", context))),
                recover: Math.max(3, Math.round(p(stuffcheeksId, "aftercast", context))),
                cooldown: Math.round(p(stuffcheeksId, "wait", context)),
                active: 1, range: 1
            };
        },
        /** 手里有树果才吃得下这一口。 */
        ready: function (action) {
            return stuffcheeksBerryOf(action.sense(), action.actor()) !== null ? "" : "no-berry";
        },
        windup: function (action, config, prepare) {
            const berry = stuffcheeksBerryOf(action.sense(), action.actor());
            action.present("world_combat:move_stuffcheeks:raise", stuffcheeksScene, 1, action.origin(),
                JSON.stringify({ moment: "raise", berry: berry === null ? 0 : 1, savor: config && config.savor === true ? 1 : 0,
                    motes: Math.round(p(stuffcheeksId, "motes", action)) }));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            const held = NativeItems.heldBerry(world, actor), berry = held !== null ? held.berry : null;
            if (body === null) { done(action); return; }
            if (berry === null || held === null) {
                WorldFeedback.emit(world, stuffcheeksScene, 1, body.position(), { moment: "none" }, 16);
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)), stuffcheeksNoneText, [], 24);
                done(action); return;
            }
            const guard = Math.max(1, Math.min(3, Math.round(p(stuffcheeksId, "guard", action))));
            const absorb = Math.max(0.2, p(stuffcheeksId, "absorb", action));
            const chew = Math.max(3, Math.round(p(stuffcheeksId, "chew", action)));
            const motes = Math.max(8, Math.round(p(stuffcheeksId, "motes", action)));
            const bulge = Math.max(0.5, p(stuffcheeksId, "bulge", action));
            const scale = bulge / stuffcheeksReferenceRadius;

            if (!NativeItems.takeHeld(world, actor, held.held).ok) {
                WorldFeedback.emit(world, stuffcheeksScene, 1, body.position(), { moment: "none" }, 16);
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)), stuffcheeksNoneText, [], 24);
                done(action); return;
            }
            world.sound("cobblemon:item.berry.eat", body.position(), 12, "{}");
            WorldFeedback.emit(world, stuffcheeksScene, 1, body.position(),
                { moment: "eat", target: String(actor.ref()), berry: 1, motes: motes, scale: scale,
                    savor: config && config.savor === true ? 1 : 0 }, 22);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.15, 0)), stuffcheeksEatText, [{ key: berry.name, fallback: "berry" }], 24);

            const result = stuffcheeksAbsorb(world, actor, berry, absorb);
            if (result.healed > 0) feedback(world, actor, body.position(), "heal", { amount: result.healed });
            NativeEffects.boost(world, actor, "def", guard);
            WorldFeedback.emit(world, stuffcheeksScene, 1, body.position(),
                { moment: "brace", target: String(actor.ref()), guard: guard, plates: guard * 6,
                    motes: Math.round(motes * 0.6), bulge: bulge, scale: scale }, 24);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), stuffcheeksBraceText, [guard], 26);
            if (result.stat) WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.5, 0)), stuffcheeksBoostText,
                [{ key: "worldcombat.skill.stuffcheeks.stat." + result.stat, fallback: result.stat }, result.stages], 30);
            else if (result.cured.length) WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.5, 0)), stuffcheeksCureText, [], 30);
            world.sound("minecraft:entity.player.burp", body.position(), 10, "{}");

            action.after(chew, function (next) {
                WorldFeedback.emit(next.world(), stuffcheeksScene, 1, body.position(), { moment: "settle", scale: scale }, 20);
                done(next);
            });
        }
    });
}
