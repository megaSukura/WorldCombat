/**
 * 模仿 / mimic —— 注册与动作。
 *
 * 两幕：
 *   起（windup，提交前）：从施法者牵出一条思感念线搭上目标；念线要被看得见、挡得住，读的是搭上那一刻。
 *   织（execute，提交后）：读目标最近一次真正放出的招式，把 borrow 到的那一手织进「模仿自己占的那一格」，
 *       维持 hold 时长，直到这场战斗结束或个体被收回。招式带 failmimic 标记、未实装、或自己已经会时读空。
 *
 * 与写生分开：模仿是借，用 NativeModifiers moves 层挂着，到时会自己还回去；下一场还能再模仿。
 * 与纹理分开：纹理只改属性；模仿搬的是一整个动作。
 */
namespace PokemonSkills {
    const mimicScene = "world_combat:move_mimic";
    const mimicCopyText = "world_combat.move.mimic.text.copy";
    const mimicEmptyText = "world_combat.move.mimic.text.empty";
    const mimicSnapText = "world_combat.move.mimic.text.snap";

    interface MimicBorrow { id: string; slot: number; key: string; }

    /** 自己当前是否已经拥有这一手（含被覆写的槽位）。 */
    export function mimicKnows(world: CombatWorld, pokemon: CombatPokemon, id: string): boolean {
        for (let index = 0; index < pokemon.moveSlots(); index++) {
            const move = pokemon.move(index);
            if (move && NativeLoadout.selection(world, index, move).id === id) return true;
        }
        return false;
    }

    /**
     * 只读的一次“看清对手上一手”。返回空字符串表示读不到：
     * 目标不是宝可梦、最近没出过手、超出记忆窗口、那一手未实装、带 failmimic、或自己已经会。
     */
    function mimicRead(current: CombatAction, target: CombatActor): MimicBorrow | null {
        if (target === null || !current.sense().valid(target) || String(target.domain()) !== "cobblemon") return null;
        const world = current.sense(), state = NativeEffects.read(world, target);
        if (!state.used || world.tick() - (state.usedTick || -1000) > p("mimic", "window", current)) return null;
        const last = NativeEffects.lastMove(world, target);
        if (last === null) return null;
        if (!skills[last.id]) return null;
        if (NativeLoadout.facts(CobblemonCombat.moveTemplate(last.id)).flags.failmimic) return null;
        const pokemon = CobblemonCombat.pokemon(current.actor());
        if (mimicKnows(world, pokemon, last.id)) return null;
        return { id: last.id, slot: last.slot, key: last.key };
    }

    define({
        id: "mimic",
        name: "Mimic",
        description: "牵出念线搭住一名对手，读走它最后使用的那一手，把它织进模仿所占的招式格，直到这场战斗结束。",
        uses: ["借来对手的招式", "把对手的强化还回去", "惩罚刚出手的强攻"],
        kind: "enemy",
        range: 8,
        maxRange: 12,
        prepare: 8,
        active: 1,
        recover: 7,
        cooldown: 36,
        style: "mind",
        defaults: { deep: false, ai: { maxChase: 10, leaveStation: false } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("mimic", "reach", pokemon), geometry: "line", style: "mind", color: 0x7FD0E8,
                label: config && config.deep === true ? "细学目标上一手" : "抢学目标上一手" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["mimic"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: p("mimic", "watch", context),
                recover: p("mimic", "afterglow", context),
                cooldown: p("mimic", "recharge", context),
                active: 1,
                range: p("mimic", "reach", context)
            };
        },
        ready: function (action, config) {
            const world = action.sense(), target = action.target();
            if (target === null || !world.valid(target) || world.friendly(target)) return "invalid-target";
            const body = world.observe(target);
            if (body === null) return "invalid-target";
            if (!world.clear(action.origin(), body.position())) return "no-line";
            return mimicRead(action, target) === null ? "no-move" : "";
        },
        windup: function (action, config, prepare) {
            const target = action.target();
            action.present("world_combat:mimic:" + action.id(), mimicScene, 1, action.origin(), JSON.stringify({
                moment: "read", target: target === null ? "" : String(target.ref()),
                path: [String(action.actor().ref()), target === null ? String(action.actor().ref()) : String(target.ref())],
                strands: p("mimic", "strands", action)
            }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor(), target = action.target();
            const body = world.observe(actor);
            const strands = Math.max(6, Math.round(p("mimic", "strands", action)));
            const found = target === null ? null : mimicRead(action, target);
            if (found === null) {
                const point = body === null ? action.origin() : body.position();
                const targetBody = target === null ? null : world.observe(target);
                const snapped = target !== null && (targetBody === null || !world.clear(action.origin(), targetBody.position()));
                WorldFeedback.emit(world, mimicScene, 1, point, { moment: snapped ? "snap" : "fizzle", strands: strands }, snapped ? 22 : 24);
                WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1.15, 0)), snapped ? mimicSnapText : mimicEmptyText, [], 30);
                sound(action, snapped ? "minecraft:entity.item.break" : "minecraft:entity.villager.no");
                done(action);
                return;
            }
            const slot = Number(action.argument("native-slot"));
            const hold = Math.max(120, Math.round(p("mimic", "hold", action)));
            if (slot >= 0 && slot <= 3) NativeModifiers.apply(world, actor, { moves: (function () { const map: { [key: string]: string } = {}; map[String(slot)] = found.id; return map; })() }, hold);
            if (body !== null) {
                WorldFeedback.emit(world, mimicScene, 1, body.position(), {
                    moment: "copy", move: found.id, strands: strands, scale: 1 + hold / 2400
                }, 40);
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.15, 0)), mimicCopyText,
                    [{ key: "cobblemon.move." + found.id, fallback: found.id }], 40);
            }
            sound(action, "minecraft:entity.illusioner.mirror_move");
            done(action);
        }
    });
}
