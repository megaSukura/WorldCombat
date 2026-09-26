/** Temporarily replace Mimic’s move slot with any demonstrator’s recent move. Known non-Pokémon attacks are translated into corresponding moves. */
namespace PokemonSkills {
    const mimicScene = "world_combat:move_mimic";
    const mimicCopyText = "world_combat.move.mimic.text.copy";
    const mimicEmptyText = "world_combat.move.mimic.text.empty";
    const mimicNoProviderText = "world_combat.move.mimic.text.noprovider";
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
     * 最近没出过手、超出记忆窗口、没有已定义的原生攻击转译、招式未实装、带 failmimic、或自己已经会。
     */
    function mimicRead(current: CombatAction, target: CombatActor): MimicBorrow | null {
        if (target === null || !current.sense().valid(target)) return null;
        if (String(target.domain()) !== "cobblemon") {
            const id = copiedNativeMove(current.sense(), target, p("mimic", "window", current));
            return id && !mimicKnows(current.sense(), CobblemonCombat.pokemon(current.actor()), id) ? { id, slot: -1, key: "native" } : null;
        }
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
        cooldownParameter: "recharge",
        name: "Mimic",
        description: "临时把眼前示范者（敌我皆可）最近一招借进模仿所在的招式格；普通生物的已知攻击会转译为对应招式。时间到自动还回原槽。",
        uses: ["借来目标或同伴的招式", "把对手的强化还回去", "惩罚刚出手的强攻"],
        kind: "aim",
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
            // aim 允许任意关系实体或世界点：空点交给 execute 说明缺少示范者，不在这里强求存在敌人。
            if (target === null) return "";
            if (!world.valid(target)) return "target-left";
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
                WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1.15, 0)),
                    snapped ? mimicSnapText : target === null ? mimicNoProviderText : mimicEmptyText, [], 30);
                sound(action, snapped ? "minecraft:entity.item.break" : "minecraft:entity.villager.no");
                done(action);
                return;
            }
            const slot = Number(action.argument("native-slot"));
            const hold = Math.max(120, Math.round(p("mimic", "hold", action)));
            // 借来的招式真的写进槽位；持续镜面绑在同一份 managed effect 上，随它自然或提前结束清理。
            const layer = slot >= 0 && slot <= 3
                ? NativeModifiers.apply(world, actor, { moves: (function () { const map: { [key: string]: string } = {}; map[String(slot)] = found.id; return map; })() }, hold)
                : 0;
            if (body !== null) {
                const mirror = { moment: "borrow", move: found.id, strands: strands, fuse: Math.max(1, hold - 3) };
                WorldFeedback.emit(world, mimicScene, 1, body.position(), {
                    moment: "copy", move: found.id, strands: strands, scale: 1 + hold / 2400
                }, 40);
                if (layer <= 0 || !WorldFeedback.onEffect(world, layer, "world_combat:move_mimic/borrow", mimicScene, 1, body.position(), mirror))
                    WorldFeedback.emit(world, mimicScene, 1, body.position(), mirror, hold);
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.15, 0)), mimicCopyText,
                    [{ key: "cobblemon.move." + found.id, fallback: found.id }, Math.round(hold / 20)], 40);
            }
            sound(action, "minecraft:entity.illusioner.mirror_move");
            done(action);
        }
    });
}
