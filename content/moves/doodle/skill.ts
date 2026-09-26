/** Copy a Pokémon’s Ability to yourself and nearby allies, or depict a non-Pokémon’s strongest combat characteristic. */
namespace PokemonSkills {
    export const doodleScene = "world_combat:move_doodle";
    export const doodleInk = "world_combat:doodle_sketch";
    export const doodleAbilityText = "world_combat.move.doodle.text.ability";
    export const doodleTraitText = "world_combat.move.doodle.text.trait";
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
    export function doodleRecipients(world: CombatWorld, actor: CombatActor, centre: CombatPoint, canvas: number, squad: number, includeNative = false): CombatActor[] {
        const result: CombatActor[] = [actor];
        WorldGeometry.select(world, WorldGeometry.ring(centre, 0, canvas, { below: 2, above: 3 }), function (other, facts) {
            if (result.length >= squad) return;
            if (String(other.ref()) === String(actor.ref())) return;
            if (!facts.friendly() || !includeNative && String(other.domain()) !== "cobblemon") return;
            result.push(other);
        });
        return result;
    }

    define({
        id: "doodle",
        cooldownParameter: "recharge",
        name: "Doodle",
        description: "把一个样本的特性描给自己与附近同伴；样本可以是敌人，也可以是同伴。描绘普通生物时，复制其最突出的战斗特征。",
        uses: ["把对手的强力特性一次复制给全队", "开战前以同伴或对手为样本统一队伍的特性", "围绕一只特性关键的对手组织队伍"],
        kind: "aim",
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
            // aim: a foe or a companion can be the sample; an empty point has nothing to sketch.
            if (target === null || !world.valid(target)) return "invalid-target";
            if (String(actor.domain()) !== "cobblemon") return "no-ability";
            const body = world.observe(target), self = world.observe(actor);
            if (body === null || self === null) return "invalid-target";
            if (body.position().minus(action.origin()).length() > p("doodle", "reach", action)) return "out-of-range";
            if (!world.clear(action.origin(), body.position())) return "no-line";
            const canvas = Math.max(1.5, p("doodle", "canvas", action));
            const squad = Math.max(1, Math.round(p("doodle", "squad", action)));
            if (String(target.domain()) !== "cobblemon") {
                // The sample's characteristic can go to any friendly body that still differs; the sample is not stamped back onto itself.
                const values = PokemonSkills.copiedNativeTrait(world, target);
                return doodleRecipients(world, actor, self.position(), canvas, squad, true)
                    .some(recipient => CombatCopies.differs(world, recipient, values)) ? "" : "nothing-to-copy";
            }
            // Only a copyable sample and a recipient that can still be modified counts; a same-or-immune recipient is skipped.
            const theirs = doodleAbility(world, target);
            if (!theirs) return "target-suppressed";
            if (!NativeModifiers.abilityCopyable(world, target)) return "uncopyable";
            const any = doodleRecipients(world, actor, self.position(), canvas, squad).some(function (recipient) {
                return String(recipient.domain()) === "cobblemon" && NativeModifiers.abilitySuppressible(world, recipient)
                    && doodleAbility(world, recipient) !== theirs;
            });
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
            const body = world.observe(actor), sample = target === null ? null : world.observe(target);
            if (target === null || !world.valid(target) || body === null || sample === null) { done(action); return; }
            const canvas = Math.max(1.5, p("doodle", "canvas", action));
            const squad = Math.max(1, Math.round(p("doodle", "squad", action)));
            const hold = Math.max(40, Math.round(p("doodle", "hold", action)));
            const marks = Math.max(6, Math.round(p("doodle", "marks", action)));
            const scale = canvas / doodleReferenceRadius;
            const from = String(actor.ref());
            const casterPoint = body.position();
            // The sample stroke is drawn along the real sample->caster line, then branches out to each actual recipient.
            const inward = body.position().minus(sample.position());
            const distance = inward.length();
            const direction = distance < 0.05 ? WorldCombat.point(0, 1, 0) : inward.unit();
            WorldFeedback.emit(world, doodleScene, 1, sample.position(),
                { moment: "canvas", path: [String(target.ref()), from], marks: marks, scale: scale,
                    canvas: canvas, span: distance, direction: [direction.x(), direction.y(), direction.z()] }, 34);
            function stamp(recipient: CombatActor, at: CombatObservation): void {
                const recipientRef = String(recipient.ref());
                if (recipientRef !== from)
                    WorldFeedback.emit(world, doodleScene, 1, casterPoint,
                        { moment: "spread", path: [from, recipientRef], marks: marks, scale: scale }, 30);
                WorldFeedback.emit(world, doodleScene, 1, at.position(),
                    { moment: "stamp", target: recipientRef, marks: marks, scale: scale }, 26);
            }
            function glow(layer: number, recipientRef: string, at: CombatObservation): void {
                // The stamp's sheen is presented on that recipient's own layer, so it ends with the copy, not on its own clock.
                if (layer) WorldFeedback.onEffect(world, layer, "world_combat:doodle:glow:" + recipientRef, doodleScene, 1,
                    at.position(), { moment: "glow", target: recipientRef, marks: marks });
            }
            let applied = 0;
            if (String(target.domain()) !== "cobblemon") {
                const values = PokemonSkills.copiedNativeTrait(world, target);
                const trait = Object.keys(values)[0] || "";
                doodleRecipients(world, actor, body.position(), canvas, squad, true).forEach(function (recipient) {
                    if (!CombatCopies.differs(world, recipient, values)) return;
                    const at = world.observe(recipient);
                    if (at === null) return;
                    const carrier = MobEffects.apply(world, recipient, doodleInk, hold, 0);
                    if (carrier === null) return;
                    const copy = CombatCopies.apply(world, recipient, values, hold, "doodle", MobEffects.anchor(carrier));
                    applied++;
                    const recipientRef = String(recipient.ref());
                    stamp(recipient, at);
                    glow(copy, recipientRef, at);
                });
                if (applied === 0) {
                    WorldFeedback.emit(world, doodleScene, 1, body.position(), { moment: "fizzle" }, 22);
                    WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), doodleUnchangedText, [], 28);
                    sound(action, "minecraft:block.amethyst_block.break");
                    done(action);
                    return;
                }
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), doodleTraitText,
                    [{ key: "attribute.name." + trait.replace("minecraft:", ""), fallback: trait }, applied], 44);
                sound(action, "minecraft:item.book.put");
                done(action);
                return;
            }
            const ability = doodleAbility(world, target);
            if (!ability || !doodleAbilityPattern.test(ability) || !NativeModifiers.abilityCopyable(world, target)) {
                WorldFeedback.emit(world, doodleScene, 1, body.position(), { moment: "fizzle" }, 22);
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), doodleUnchangedText, [], 28);
                sound(action, "minecraft:block.amethyst_block.break");
                done(action);
                return;
            }
            doodleRecipients(world, actor, body.position(), canvas, squad).forEach(function (recipient) {
                if (String(recipient.domain()) !== "cobblemon") return;
                if (!NativeModifiers.abilitySuppressible(world, recipient)) return;
                const own = doodleAbility(world, recipient);
                if (own === ability) return;
                const at = world.observe(recipient);
                if (at === null) return;
                // The recipient's ink marker owns its layer; cleansing one ends both together.
                const marker = MobEffects.apply(world, recipient, doodleInk, hold, 0);
                if (marker === null) return;
                const layer = NativeModifiers.apply(world, recipient,
                    { ability: ability, carrier: MobEffects.anchor(marker) }, hold);
                if (!layer) return;
                applied++;
                const recipientRef = String(recipient.ref());
                stamp(recipient, at);
                glow(layer, recipientRef, at);
            });
            if (applied === 0) {
                WorldFeedback.emit(world, doodleScene, 1, body.position(), { moment: "fizzle" }, 22);
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), doodleUnchangedText, [], 28);
                sound(action, "minecraft:block.amethyst_block.break");
                done(action);
                return;
            }
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), doodleAbilityText,
                [{ key: "cobblemon.ability." + ability, fallback: ability }, applied], 44);
            sound(action, "minecraft:item.book.put");
            done(action);
        }
    });
}
