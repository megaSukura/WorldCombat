/**
 * 描绘 / doodle — 执行组织。
 *
 * 两幕（一次对多个目标）：
 *   描（windup，提交前）：一道画布般的图样在对手身上展开、把它的本质描下来（`action.present` 预告）。
 *   盖（提交后）：图样从施法者脚下摊开成一张画布，覆盖半径 `canvas` 内的自己与同伴；对每一只特性不同的宝可梦
 *     写入共享 `NativeModifiers` 的 ability 层，并挂上共享身份 `world_combat:status/doodle` 的“已描绘”标记。
 *     从施法者到自己/每只同伴各有一条图样连线，落到身上时炸开一枚印章。
 *
 * 一次覆盖多只：`squad` 限制同行上限，`canvas` 决定覆盖半径（画幅越大冷却越长）；已经在目标特性上的同伴跳过。
 * 双方都必须是宝可梦才描得动（非宝可梦没有特性），目标特性带 failroleplay 时预检失败，不花 PP。
 * 与同族的扮演分开：扮演只往自己脸上披一张，描绘把图样摊开、同时盖到自己和整队同伴身上。
 */
namespace PokemonSkills {
    export const doodleScene = "world_combat:move_doodle";
    export const doodleInk = "world_combat:doodle_sketch";
    export const doodleAbilityText = "world_combat.move.doodle.text.ability";
    export const doodleUnchangedText = "world_combat.move.doodle.text.same";
    const doodleAbilityPattern = /^[a-z0-9]{1,64}$/;
    const doodleReferenceRadius = 4.5;

    /** 一个战斗者当前生效的特性（含临时层与压制）；非宝可梦返回 ""。 */
    export function doodleAbility(world: CombatWorld, actor: CombatActor): string {
        if (String(actor.domain()) !== "cobblemon" || !world.valid(actor)) return "";
        const pokemon = CobblemonCombat.pokemon(actor), state = NativeEffects.read(world, actor);
        return NativeEffects.ability(pokemon, state);
    }

    export function doodleCopyable(ability: string): boolean {
        return !!ability && !NativeAbilities.flag(ability, "failroleplay");
    }

    /** 画幅内可被盖印的宝可梦：施法者自己、以及半径内的友好宝可梦，按与施法者的距离由近到远。 */
    export function doodleRecipients(world: CombatWorld, actor: CombatActor, centre: CombatPoint, canvas: number, squad: number): CombatActor[] {
        const result: CombatActor[] = [actor];
        WorldGeometry.select(world, WorldGeometry.ring(centre, 0, canvas, { below: 2, above: 3 }), function (other, facts) {
            if (result.length >= squad) return;
            if (String(other.ref()) === String(actor.ref())) return;
            if (!facts.friendly() || String(other.domain()) !== "cobblemon") return;
            result.push(other);
        });
        return result;
    }

    define({
        id: "doodle",
        name: "Doodle",
        description: "把握并映射出对手的本质，让自己和同伴宝可梦的特性变得和对手相同。",
        uses: ["把对手的强力特性一次复制给全队", "开战前统一队伍的特性", "配合一只特性关键的对手打配合"],
        kind: "enemy",
        range: 8,
        maxRange: 15,
        prepare: 9,
        active: 0,
        recover: 7,
        cooldown: 70,
        style: "sketch",
        defaults: { canvas: 4.5, ai: { maxChase: 15, leaveStation: false } },
        fields: [],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills["doodle"], detail: { values: config } };
            return { radius: p("doodle", "reach", context), geometry: "line", style: "sketch", color: 0x6E7BFF, label: "描绘" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["doodle"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("doodle", "tempo", context)),
                recover: Math.round(p("doodle", "aftercast", context)),
                cooldown: Math.round(p("doodle", "recharge", context)),
                active: 0,
                range: p("doodle", "reach", context)
            };
        },
        ready: function (action) {
            const world = action.sense(), actor = action.actor(), target = action.target();
            if (target === null || !world.valid(target) || world.friendly(target)) return "invalid-target";
            if (String(actor.domain()) !== "cobblemon" || String(target.domain()) !== "cobblemon") return "no-ability";
            const body = world.observe(target);
            if (body === null) return "invalid-target";
            if (body.position().minus(action.origin()).length() > p("doodle", "reach", action)) return "out-of-range";
            if (!world.clear(action.origin(), body.position())) return "no-line";
            const theirs = doodleAbility(world, target);
            if (!theirs) return "target-suppressed";
            if (!NativeModifiers.abilityCopyable(world, target)) return "uncopyable";
            const self = world.observe(actor);
            if (self === null) return "invalid-target";
            const canvas = Math.max(1.5, p("doodle", "canvas", action));
            const squad = Math.max(1, Math.round(p("doodle", "squad", action)));
            const recipients = doodleRecipients(world, actor, self.position(), canvas, squad);
            const any = recipients.some(function (recipient) { return doodleAbility(world, recipient) !== theirs; });
            return any ? "" : "nothing-to-copy";
        },
        windup: function (action, config, prepare) {
            const actor = action.actor(), target = action.target();
            const path: (string | number[])[] = target === null ? [String(actor.ref())] : [String(target.ref()), String(actor.ref())];
            action.present("world_combat:doodle:sketch", doodleScene, 1, action.origin(), JSON.stringify({
                moment: "sketch", target: target === null ? "" : String(target.ref()), path: path,
                marks: p("doodle", "marks", action)
            }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor(), target = action.target();
            const body = world.observe(actor);
            if (target === null || !world.valid(target) || body === null) { done(action); return; }
            const ability = doodleAbility(world, target);
            if (!ability || !doodleAbilityPattern.test(ability) || !NativeModifiers.abilityCopyable(world, target)) {
                WorldFeedback.emit(world, doodleScene, 1, body.position(), { moment: "fizzle", target: String(actor.ref()) }, 22);
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), doodleUnchangedText, [], 28);
                sound(action, "minecraft:block.amethyst_block.break");
                done(action);
                return;
            }
            const canvas = Math.max(1.5, p("doodle", "canvas", action));
            const squad = Math.max(1, Math.round(p("doodle", "squad", action)));
            const hold = Math.max(40, Math.round(p("doodle", "hold", action)));
            const marks = Math.max(6, Math.round(p("doodle", "marks", action)));
            const scale = canvas / doodleReferenceRadius;
            const recipients = doodleRecipients(world, actor, body.position(), canvas, squad);
            let applied = 0;
            WorldFeedback.emit(world, doodleScene, 1, body.position(),
                { moment: "canvas", target: String(actor.ref()), marks: marks, scale: scale, canvas: canvas }, 34);
            recipients.forEach(function (recipient) {
                if (String(recipient.domain()) !== "cobblemon") return;
                const own = doodleAbility(world, recipient);
                if (own === ability) return;
                NativeModifiers.apply(world, recipient, { ability: ability }, hold);
                MobEffects.apply(world, recipient, doodleInk, hold, 0);
                applied++;
                const at = world.observe(recipient);
                if (at === null) return;
                const recipientRef = String(recipient.ref());
                if (recipientRef !== String(actor.ref()))
                    WorldFeedback.emit(world, doodleScene, 1, at.position(),
                        { moment: "spread", target: recipientRef, path: [String(actor.ref()), recipientRef], marks: marks, scale: scale }, 30);
                WorldFeedback.emit(world, doodleScene, 1, at.position(),
                    { moment: "stamp", target: recipientRef, marks: marks, scale: scale }, 26);
            });
            if (applied === 0) {
                WorldFeedback.emit(world, doodleScene, 1, body.position(), { moment: "fizzle", target: String(actor.ref()) }, 22);
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), doodleUnchangedText, [], 28);
                sound(action, "minecraft:block.amethyst_block.break");
                done(action);
                return;
            }
            WorldFeedback.keep(world, "world_combat:doodle:glow:" + String(actor.ref()), doodleScene, 1, body.position(),
                { moment: "glow", target: String(actor.ref()), marks: marks, scale: scale }, Math.min(hold, 160));
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), doodleAbilityText,
                [{ key: "cobblemon.ability." + ability, fallback: ability }, applied], 44);
            sound(action, "minecraft:item.book.put");
            done(action);
        }
    });
}
