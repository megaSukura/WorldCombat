/** 永久把目标最近用过的那一手写进写生所在的招式格；普通生物的已知攻击会转译为对应招式。 */
namespace PokemonSkills {
    const sketchScene = "world_combat:move_sketch";
    const sketchWatchScene = "world_combat:move_sketch_watch";
    const sketchInkText = "world_combat.move.sketch.text.ink";
    const sketchEmptyText = "world_combat.move.sketch.text.empty";
    const sketchLockKey = "world_combat:sketch/locked";

    /** 自己当前是否已经拥有这一手（含被覆写的槽位）。 */
    export function sketchKnows(world: CombatWorld, pokemon: CombatPokemon, id: string): boolean {
        for (let index = 0; index < pokemon.moveSlots(); index++) {
            const move = pokemon.move(index);
            if (move && NativeLoadout.selection(world, index, move).id === id) return true;
        }
        return false;
    }

    /** 目标这一手是否可被写生：原生目录带 noSketch／Z／Max 标记的不可描。 */
    function sketchForbidden(id: string): boolean {
        const template = CobblemonCombat.moveTemplate(id);
        if (!template) return true;
        const data = NativeLoadout.facts(template).data as any;
        return !!(data && (data.noSketch === true || data.isZ === true || data.isMax === true));
    }

    /** 目标最近用过、且本次实际能被描摹的那一手 id；窗口外、未实装、不可描摹或写生自身都返回 ""。 */
    export function sketchRead(world: CombatWorld, target: CombatActor, maxAge: number): string {
        if (String(target.domain()) !== "cobblemon") {
            const copied = copiedNativeMove(world, target, maxAge);
            return copied && skills[copied] && !sketchForbidden(copied) ? copied : "";
        }
        const state = NativeEffects.read(world, target);
        if (!state.used) return "";
        if (world.tick() - (state.usedTick || -100000) > maxAge) return "";
        if (state.used === "sketch") return "";
        if (!skills[state.used]) return "";
        if (sketchForbidden(state.used)) return "";
        return state.used;
    }

    /** 施法者这一次的记忆窗口；起手预告、提交重核与 AI 候选都读同一个值。 */
    export function sketchWindow(world: CombatWorld, actor: CombatActor): number {
        if (!world.valid(actor) || String(actor.domain()) !== "cobblemon") return 1200;
        const context: NumberContext = { pokemon: CobblemonCombat.pokemon(actor), skill: skills["sketch"],
            detail: { values: config(world, actor, "sketch") }, world: world, actor: actor };
        return p("sketch", "window", context);
    }

    function sketchLocked(action: CombatAction): { id: string; target: string; slot: number; start: number; ticks: number } | null {
        const raw = action.data(sketchLockKey);
        return raw === null ? null : JSON.parse(raw);
    }

    define({
        id: "sketch",
        cooldownParameter: "recharge",
        name: "Sketch",
        description: "把眼前示范者（敌我皆可）最近一招永久写进写生所在的招式格；普通生物的已知攻击会转译为对应招式。",
        uses: ["永久学会目标或同伴的一手", "复制稀有的强化或回复", "把强攻收进自己的招式表"],
        kind: "aim",
        range: 6,
        maxRange: 9,
        prepare: 12,
        active: 0,
        recover: 8,
        cooldown: 200,
        style: "ink",
        defaults: { ai: { minPower: 50, maxChase: 8, leaveStation: false, permanent: false } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("sketch", "reach", pokemon), geometry: "line", style: "ink", color: 0x2B2B33, label: "写生描摹线" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["sketch"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: p("sketch", "study", context),
                recover: p("sketch", "afterglow", context),
                cooldown: p("sketch", "recharge", context),
                active: 0,
                range: p("sketch", "reach", context)
            };
        },
        ready: function (action, config) {
            const world = action.sense(), target = action.target();
            // aim 允许任意关系实体或世界点：空点交给 execute 说明没有可学内容，不在这里强求存在敌人。
            if (target === null) return "";
            if (!world.valid(target)) return "target-left";
            const body = world.observe(target);
            if (body === null) return "invalid-target";
            if (body.position().minus(action.origin()).length() > p("sketch", "reach", action)) return "out-of-range";
            // 断视中止：提交时重新确认视线上没有墙，观察过程中被墙隔开就放弃，不落笔。
            if (!world.clear(action.origin(), body.position())) return "no-line";
            const locked = sketchLocked(action);
            const id = locked === null ? "" : String(locked.id);
            if (!id || !skills[id] || sketchForbidden(id)) return "no-move";
            if (sketchKnows(world, CobblemonCombat.pokemon(action.actor()), id)) return "known";
            return "";
        },
        windup: function (action, config, prepare) {
            const world = action.sense(), actor = action.actor(), target = action.target();
            const window = sketchWindow(world, actor);
            // 起手先锁定这次要描的那一手：长准备里目标换招、走动都不改变落笔内容。
            const id = target !== null && world.valid(target) ? sketchRead(world, target, window) : "";
            const slotValue = action.argument("native-slot");
            const slot = slotValue === null ? -1 : Number(slotValue);
            action.data(sketchLockKey, JSON.stringify({ id: id, target: target === null ? "" : String(target.ref()),
                slot: isFinite(slot) ? slot : -1, start: world.tick(), ticks: prepare }));
            action.present("world_combat:sketch:" + action.id(), sketchScene, 1, action.origin(), JSON.stringify({
                moment: "draw", target: target === null ? "" : String(target.ref()),
                move: id, strokes: Math.max(8, Math.round(p("sketch", "strokes", action)))
            }));
            action.present("world_combat:sketch-watch:" + action.id(), sketchWatchScene, 1, action.origin(), JSON.stringify({
                move: id, type: id && skills[id] ? String(CobblemonCombat.moveTemplate(id).type()) : "",
                target: target === null ? "" : String(target.ref()), start: world.tick(), ticks: prepare, progress: 0
            }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor();
            const body = world.observe(actor);
            const strokes = Math.max(8, Math.round(p("sketch", "strokes", action)));
            const point = body === null ? action.origin() : body.position();
            const locked = sketchLocked(action);
            const id = locked === null ? "" : String(locked.id);
            action.present("world_combat:sketch-watch:" + action.id(), sketchWatchScene, 1, point,
                JSON.stringify({ move: "", target: "", start: world.tick(), ticks: 0, progress: 1 }));
            const slotValue = action.argument("native-slot");
            const slot = locked !== null && isFinite(locked.slot) ? Number(locked.slot) : slotValue === null ? -1 : Number(slotValue);
            const pokemon = CobblemonCombat.pokemon(actor);
            let learnt = false;
            if (slot >= 0 && slot <= 3 && id && skills[id] && !sketchForbidden(id) && !sketchKnows(world, pokemon, id)) {
                // 通用原生槽写入：用此刻观察到的槽位对手一手做 CAS，槽位在准备期间被换掉就整次失败、不改槽。
                const current = pokemon.move(slot);
                const expected = current === null ? "" : String(current.key());
                learnt = CobblemonCombat.replaceMove(world, actor, slot, expected, id);
            }
            if (!learnt) {
                WorldFeedback.emit(world, sketchScene, 1, point, { moment: "fizzle", strokes: strokes }, 24);
                WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1.15, 0)), sketchEmptyText, [], 30);
                sound(action, "minecraft:entity.villager.no");
                done(action);
                return;
            }
            WorldFeedback.emit(world, sketchScene, 1, point, { moment: "ink", move: id, strokes: strokes }, 44);
            WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1.15, 0)), sketchInkText,
                [{ key: "cobblemon.move." + id, fallback: id }], 44);
            sound(action, "minecraft:item.book.put");
            done(action);
        }
    });
}
