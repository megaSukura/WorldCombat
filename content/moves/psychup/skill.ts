/**
 * 自我暗示 / psychup — 执行组织。
 *
 * 两幕：
 *   读（windup，提交前）：一道读解视线落到对手身上，把它的能力阶梯扫进来（`action.present` 预告）。
 *   抄（提交后）：以对手当前每一项能力等级为目标，把自己调整到同一位置；一条回响光带沿两人连线抽回自己，
 *     身上逐项亮起。只取增益时跳过所有会让自己的项。
 *
 * 阶梯路径：宝可梦读/写原生能力等级（`NativeEffects.stage` / `NativeEffects.boost`），任何其他生物走共享
 *   `CombatStages`；`NativeEffects.boost` 已按域分派，因此一条路径覆盖所有战斗者。目标没有任何能力变化时
 *   预检失败，不花 PP（照原作的失败条件）。对齐后的等级按各自规则自然消退，标记只负责读数与 AI 节流。
 */
namespace PokemonSkills {
    export const psychupScene = "world_combat:move_psychup";
    export const psychupLink = "world_combat:psychup_link";
    export const psychupLinkedText = "world_combat.move.psychup.text.linked";
    export const psychupFullText = "world_combat.move.psychup.text.full";
    /** 宝可梦带命中与闪避；其他生物的共享阶梯只有六维里的五项。 */
    export const psychupStats = ["atk", "def", "spa", "spd", "spe", "accuracy", "evasion"];
    const psychupSharedStats = ["atk", "def", "spa", "spd", "spe"];

    /** 读取一个战斗者当前的能力阶梯；宝可梦读原生等级，其他生物读 CombatStages。 */
    export function psychupStages(world: CombatWorld, actor: CombatActor): { [stat: string]: number } {
        const values: { [stat: string]: number } = {};
        if (!world.valid(actor)) return values;
        if (String(actor.domain()) === "cobblemon") {
            const state = NativeEffects.read(world, actor);
            psychupStats.forEach(function (stat) { values[stat] = NativeEffects.stage(state, stat); });
            return values;
        }
        const shared = CombatStages.read(world, actor);
        psychupSharedStats.forEach(function (stat) { values[stat] = shared[stat] || 0; });
        return values;
    }

    define({
        id: "psychup",
        name: "Psych Up",
        description: "向自己施以自我暗示，把对手的能力变化状态抄到自己身上。",
        uses: ["对手刚给自己加完状态时立刻对齐", "把对手的增益变成自己的增益", "在对手被削弱的瞬间把负面一并接过来（照单全收时）"],
        kind: "enemy",
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
            if (target === null || !world.valid(target) || world.friendly(target)) return "invalid-target";
            const body = world.observe(target);
            if (body === null) return "invalid-target";
            if (body.position().minus(action.origin()).length() > p("psychup", "reach", action)) return "out-of-range";
            if (!world.clear(action.origin(), body.position())) return "no-line";
            const stages = psychupStages(world, target);
            return psychupStats.some(function (stat) { return (stages[stat] || 0) !== 0; }) ? "" : "no-changes";
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
            const body = world.observe(actor);
            if (target === null || !world.valid(target) || body === null) { done(action); return; }
            const span = Math.max(40, Math.round(p("psychup", "span", action)));
            const echoes = Math.max(6, Math.round(p("psychup", "echoes", action)));
            const selective = !!(config && config.selective);
            // The shared copy entry reads both effective ladders, so a Pokemon's native stages and every other
            // body's CombatStages land on the same route; `selective` keeps the per-move "gains only" rule.
            const copied = NativeEffects.copyStages(world, actor, target, false, selective);
            const changed = copied.changed, link = copied.total;
            if (changed > 0) MobEffects.apply(world, actor, psychupLink, span, 0);
            const path: (string | number[])[] = [String(actor.ref()), String(target.ref())];
            WorldFeedback.emit(world, psychupScene, 1, body.position(),
                { moment: "mirror", path: path, target: String(target.ref()), stats: changed, echoes: echoes,
                    link: link, scale: 1, intensity: Math.max(0.6, Math.min(2, link / 4)) }, 30);
            WorldFeedback.emit(world, psychupScene, 1, body.position(),
                { moment: "settle", target: String(actor.ref()), stats: changed, echoes: echoes }, 24);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)),
                changed > 0 ? psychupLinkedText : psychupFullText, [changed], 36);
            sound(action, "minecraft:entity.illusioner.mirror_move");
            done(action);
        }
    });
}
