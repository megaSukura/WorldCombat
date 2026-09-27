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

    /**
     * 画幅内真正会被盖印的宝可梦：施法者自己，加上 LOS 通畅、可修改且当前特征确实不同的近友，按距离由近到远。
     * 先过滤「可改／不同」，再按距离截到 squad，所以挡在墙后或已经相同的同伴不会白占一个名额。
     */
    export function doodleRecipients(world: CombatWorld, actor: CombatActor, centre: CombatPoint, canvas: number, squad: number, includeNative: boolean, sample: CombatActor): CombatActor[] {
        const sampleAbility = includeNative ? "" : doodleAbility(world, sample);
        const sampleValues = includeNative ? PokemonSkills.copiedNativeTrait(world, sample) : null;
        function acceptable(other: CombatActor): boolean {
            if (includeNative) return !!sampleValues && CombatCopies.differs(world, other, sampleValues);
            if (String(other.domain()) !== "cobblemon" || !NativeModifiers.abilitySuppressible(world, other)) return false;
            return doodleAbility(world, other) !== sampleAbility;
        }
        const result: CombatActor[] = [];
        if (acceptable(actor)) result.push(actor);
        WorldGeometry.select(world, WorldGeometry.ring(centre, 0, canvas, { below: 2, above: 3 }), function (other, facts) {
            if (String(other.ref()) === String(actor.ref()) || !facts.friendly()) return;
            if (!world.clear(centre, facts.position())) return;
            if (!acceptable(other)) return;
            result.push(other);
        });
        return result.sort((a, b) => world.closestPoint(a, centre).minus(centre).length() - world.closestPoint(b, centre).minus(centre).length()).slice(0, squad);
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
                // Only a sample whose characteristic still differs on some reachable friendly body counts.
                return doodleRecipients(world, actor, self.position(), canvas, squad, true, target).length > 0 ? "" : "nothing-to-copy";
            }
            const theirs = doodleAbility(world, target);
            if (!theirs) return "target-suppressed";
            if (!NativeModifiers.abilityCopyable(world, target)) return "uncopyable";
            return doodleRecipients(world, actor, self.position(), canvas, squad, false, target).length > 0 ? "" : "nothing-to-copy";
        },
        windup: function (action, config, prepare) {
            const world = action.sense(), actor = action.actor(), target = action.target(), self = world.observe(actor);
            const canvas = Math.max(1.5, p("doodle", "canvas", action));
            const squad = Math.max(1, Math.round(p("doodle", "squad", action)));
            const isNative = target !== null && String(target.domain()) !== "cobblemon";
            const path: (string | number[])[] = target === null ? [String(actor.ref())] : [String(target.ref()), String(actor.ref())];
            const recipients = self !== null && target !== null && world.valid(target)
                ? doodleRecipients(world, actor, self.position(), canvas, squad, isNative, target) : [];
            recipients.forEach(recipient => { if (String(recipient.ref()) !== String(actor.ref())) path.push(String(recipient.ref())); });
            // The telegraph shows the real canvas and the intended recipient list, not just the sample.
            action.present("world_combat:doodle:sketch", doodleScene, 1, action.origin(), JSON.stringify({
                moment: "sketch", target: target === null ? "" : String(target.ref()), path: path,
                canvas: canvas, stamped: recipients.length, marks: p("doodle", "marks", action)
            }));
            return prepare + Math.max(0, recipients.length - 1) * 2;
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
            const from = String(actor.ref()), centre = body.position();
            const isNative = String(target.domain()) !== "cobblemon";
            const inward = centre.minus(sample.position()), distance = inward.length();
            const direction = distance < 0.05 ? WorldCombat.point(0, 1, 0) : inward.unit();

            function fizzle(): void {
                WorldFeedback.emit(world, doodleScene, 1, centre, { moment: "fizzle" }, 22);
                WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 1.3, 0)), doodleUnchangedText, [], 28);
                sound(action, "minecraft:block.amethyst_block.break");
            }

            // The sample stroke is drawn along the real sample->caster line; the canvas ring is one world-scale circle.
            WorldFeedback.emit(world, doodleScene, 1, sample.position(),
                { moment: "canvas", path: [String(target.ref()), from], marks: marks, scale: scale,
                    canvas: canvas, span: distance, direction: [direction.x(), direction.y(), direction.z()] }, 34);

            const ability = isNative ? "" : doodleAbility(world, target);
            if (!isNative && (!ability || !doodleAbilityPattern.test(ability) || !NativeModifiers.abilityCopyable(world, target))) {
                fizzle(); done(action); return;
            }
            const values = isNative ? copiedNativeTrait(world, target) : null;
            const recipients = doodleRecipients(world, actor, centre, canvas, squad, isNative, target);
            const applied: { ref: string; layer: number }[] = [];
            recipients.forEach(recipient => {
                const at = world.observe(recipient);
                if (at === null) return;
                const marker = MobEffects.apply(world, recipient, doodleInk, hold, 0);
                if (marker === null) return;
                const carrier = MobEffects.anchor(marker);
                const layer = isNative
                    ? (values ? CombatCopies.apply(world, recipient, values, hold, "doodle", carrier) : 0)
                    : NativeModifiers.apply(world, recipient, { ability: ability, carrier: carrier }, hold);
                // A failed copy must not leave this cast's mark behind.
                if (!layer) { MobEffects.consume(world, recipient, doodleInk); return; }
                applied.push({ ref: String(recipient.ref()), layer: layer });
                WorldFeedback.emit(world, doodleScene, 1, at.position(), { moment: "stamp", target: String(recipient.ref()), marks: marks, scale: scale }, 26);
                WorldFeedback.emit(world, doodleScene, 1, centre, { moment: "spread", path: [from, String(recipient.ref())], marks: marks, scale: scale }, 8);
                // The stamp's sheen is presented on that recipient's own layer, so it ends with the copy.
                WorldFeedback.onEffect(world, layer, "world_combat:doodle:glow:" + String(recipient.ref()), doodleScene, 1,
                    at.position(), { moment: "glow", target: String(recipient.ref()), marks: marks });
            });
            if (applied.length === 0) { fizzle(); done(action); return; }
            if (isNative) {
                const trait = Object.keys(values!)[0] || "";
                WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 1.3, 0)), doodleTraitText,
                    [{ key: "attribute.name." + trait.replace("minecraft:", ""), fallback: trait }, applied.length], 44);
            } else {
                WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 1.3, 0)), doodleAbilityText,
                    [{ key: "cobblemon.ability." + ability, fallback: ability }, applied.length], 44);
            }
            sound(action, "minecraft:item.book.put");

            done(action);
        }
    });
}
