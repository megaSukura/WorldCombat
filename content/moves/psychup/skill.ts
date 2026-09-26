/** psychup：行为、参数与目标条件以本单元实现为准。 */
namespace PokemonSkills {
    export const psychupScene = "world_combat:move_psychup";
    export const psychupLink = "world_combat:psychup_link";
    export const psychupLinkedText = "world_combat.move.psychup.text.linked";
    export const psychupFullText = "world_combat.move.psychup.text.full";
    /** 所有活体使用相同的七项能力阶梯。 */
    export const psychupStats = ["atk", "def", "spa", "spd", "spe", "accuracy", "evasion"];

    /** 读取一个战斗者当前的能力阶梯；宝可梦读原生等级，其他生物读 CombatStages。 */
    export function psychupStages(world: CombatWorld, actor: CombatActor): { [stat: string]: number } {
        return NativeEffects.effectiveStages(world, actor);
    }

    define({
        id: "psychup",
        cooldownParameter: "recharge",
        name: "Psych Up",
        description: "把自己的能力等级与药水增益调整成目标的样子；目标可以是敌人，也可以是让你借势的同伴。只取增益模式保留自己更高的能力等级。",
        uses: ["对手刚给自己加完状态时立刻对齐", "把对手或同伴的增益变成自己的增益", "照单全收时把目标的负面也一并接过来"],
        kind: "aim",
        range: 7,
        maxRange: 14,
        prepare: 9,
        active: 0,
        recover: 7,
        cooldown: 70,
        style: "mirror",
        defaults: { selective: false, ai: { maxChase: 14, leaveStation: false } },
        fields: [],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills["psychup"], detail: { values: config } };
            return { radius: p("psychup", "reach", context), geometry: "line", style: "mirror", color: 0xC07CFF, label: "自我暗示" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["psychup"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const selective = !!(config && config.selective);
            return {
                prepare: Math.round(p("psychup", "tempo", context)),
                recover: Math.round(p("psychup", "aftercast", context)),
                cooldown: Math.round(p("psychup", "recharge", context)) + (selective ? 20 : 0),
                active: 0,
                range: p("psychup", "reach", context)
            };
        },
        ready: function (action) {
            const world = action.sense(), target = action.target();
            // aim: any-relation entity works; an empty point has no reference to read, so it is refused here.
            if (target === null || !world.valid(target)) return "invalid-target";
            const body = world.observe(target);
            if (body === null) return "invalid-target";
            if (body.position().minus(action.origin()).length() > p("psychup", "reach", action)) return "out-of-range";
            if (!world.clear(action.origin(), body.position())) return "no-line";
            const stages = psychupStages(world, target);
            return psychupStats.some(function (stat) { return (stages[stat] || 0) !== 0; })
                || MobEffects.native(world, target, "beneficial").length > 0 ? "" : "no-changes";
        },
        windup: function (action, config, prepare) {
            const actor = action.actor(), target = action.target();
            const path: (string | number[])[] = target === null ? [String(actor.ref())] : [String(actor.ref()), String(target.ref())];
            action.present("world_combat:psychup:read", psychupScene, 1, action.origin(), JSON.stringify({
                moment: "read", target: target === null ? "" : String(target.ref()), path: path,
                echoes: p("psychup", "echoes", action)
            }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor(), target = action.target();
            const body = world.observe(actor), other = target === null ? null : world.observe(target);
            if (target === null || !world.valid(target) || body === null || other === null) { done(action); return; }
            const span = Math.max(40, Math.round(p("psychup", "span", action)));
            const echoes = Math.max(6, Math.round(p("psychup", "echoes", action)));
            const selective = !!(config && config.selective);
            // The shared copy entry reads both effective ladders, so a Pokemon's native stages and every other
            // body's CombatStages land on the same route; `selective` keeps the per-move "gains only" rule.
            const copied = NativeEffects.copyStages(world, actor, target, false, selective);
            const potions = MobEffects.copy(world, target, actor, "beneficial", span);
            // Report the actual changed items per route: stages moved and potion effects copied. Unchanged
            // entries stay dark in the scene because no symbol is emitted for them.
            const stats = copied.changed, copiedItems = stats + potions;
            const inward = body.position().minus(other.position());
            const distance = inward.length();
            const direction = distance < 0.05 ? WorldCombat.point(0, 1, 0) : inward.unit();
            if (copiedItems > 0) MobEffects.apply(world, actor, psychupLink, span, 0);
            const path: (string | number[])[] = [String(target.ref()), String(actor.ref())];
            WorldFeedback.emit(world, psychupScene, 1, other.position(),
                { moment: "mirror", path: path, stats: stats, potions: potions,
                    echoes: echoes, span: distance, direction: [direction.x(), direction.y(), direction.z()],
                    intensity: Math.max(0.6, Math.min(2, 0.45 + copiedItems * 0.18)) }, 30);
            WorldFeedback.emit(world, psychupScene, 1, body.position(),
                { moment: "settle", stats: stats, potions: potions }, 24);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)),
                copiedItems > 0 ? psychupLinkedText : psychupFullText, [stats, potions], 36);
            sound(action, "minecraft:entity.illusioner.mirror_move");
            done(action);
        }
    });
}
