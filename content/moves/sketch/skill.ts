/**
 * 写生 / sketch —— 注册与动作。
 *
 * 两幕：
 *   起（windup，提交前）：施法者俯身观察目标，墨点与纸光在身前铺开；预检要求确实有可描的一手，否则不落笔、不花 PP。
 *   描（execute，提交后）：读目标最近一次放出的招式，把它永久写进「写生自己占的那一格」——原生的
 *       MoveSet.setMove，写进去的是那一手本身的完整 PP；写生随之从招式表里消失（这一格不再有写生）。
 *
 * 与模仿分开：模仿借来一手、到时会自己还回去；写生是刻进去的、只有一次，之后这个格子永远换成对手的招。
 * 因此写生用真实原生招式表的写入（原生对象，Rhino 直接调用公开方法），而不是临时的招层。
 */
namespace PokemonSkills {
    // KubeJS 服务端脚本暴露的原生类加载入口。声明在命名空间内，避免与共享 smoke 运行时的全局 Java 冲突。
    declare const Java: { loadClass(name: string): any };

    const sketchScene = "world_combat:move_sketch";
    const sketchInkText = "world_combat.move.sketch.text.ink";
    const sketchEmptyText = "world_combat.move.sketch.text.empty";

    /** 自己当前是否已经拥有这一手（含被覆写的槽位）。 */
    export function sketchKnows(world: CombatWorld, pokemon: CombatPokemon, id: string): boolean {
        for (let index = 0; index < pokemon.moveSlots(); index++) {
            const move = pokemon.move(index);
            if (move && NativeLoadout.selection(world, index, move).id === id) return true;
        }
        return false;
    }

    /** 目标最后使用的那一手，可被描摹时返回它的 id；否则返回 ""。 */
    export function sketchRead(world: CombatWorld, target: CombatActor): string {
        if (String(target.domain()) !== "cobblemon") return "";
        const state = NativeEffects.read(world, target);
        if (!state.used) return "";
        if (!CobblemonCombat.moveTemplate(state.used)) return "";
        // 写生自己带 noSketch，不可被描摹；其余招式都可。
        return state.used === "sketch" ? "" : state.used;
    }

    /**
     * 把 id 永久写进施法者的原生招式表 slot 格。走原生对象（PokemonEntity -> Pokemon -> MoveSet），
     * 写入的是可用的原生 Move（满 PP），随个体保存。成功返回 true。
     */
    export function sketchLearn(world: CombatWorld, actor: CombatActor, slot: number, id: string): boolean {
        if (slot < 0 || slot > 3) return false;
        try {
            const entity = world.nativeEntity(actor);
            if (!entity) return false;
            const pokemon = entity.getPokemon();
            if (!pokemon) return false;
            const set = pokemon.getMoveSet();
            if (!set) return false;
            const Moves = Java.loadClass("com.cobblemon.mod.common.api.moves.Moves");
            const template = Moves.getByName(id);
            if (!template) return false;
            set.setMove(slot, template.create());
            return true;
        } catch (error) {
            return false;
        }
    }

    define({
        id: "sketch",
        cooldownParameter: "recharge",
        name: "Sketch",
        description: "把对手刚用过的那一手当场描进写生所占的招式格，永久学会它；写生只有一次，用过即从招式表消失。",
        uses: ["永久学会对手的一手", "复制稀有的强化或回复", "把强攻收进自己的招式表"],
        kind: "enemy",
        range: 6,
        maxRange: 9,
        prepare: 12,
        active: 0,
        recover: 8,
        cooldown: 200,
        style: "ink",
        defaults: { ai: { minPower: 50, maxChase: 8, leaveStation: false } },
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
            if (target === null || !world.valid(target) || world.friendly(target)) return "invalid-target";
            const body = world.observe(target);
            if (body === null) return "invalid-target";
            if (body.position().minus(action.origin()).length() > p("sketch", "reach", action)) return "out-of-range";
            if (!world.clear(action.origin(), body.position())) return "no-line";
            const id = sketchRead(world, target);
            if (!id) return "no-move";
            return sketchKnows(world, CobblemonCombat.pokemon(action.actor()), id) ? "known" : "";
        },
        windup: function (action, config, prepare) {
            const target = action.target();
            action.present("world_combat:sketch:" + action.id(), sketchScene, 1, action.origin(), JSON.stringify({
                moment: "draw", target: target === null ? "" : String(target.ref()),
                path: [String(action.actor().ref()), target === null ? String(action.actor().ref()) : String(target.ref())],
                strokes: p("sketch", "strokes", action)
            }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor(), target = action.target();
            const body = world.observe(actor);
            const strokes = Math.max(8, Math.round(p("sketch", "strokes", action)));
            const point = body === null ? action.origin() : body.position();
            const slot = Number(action.argument("native-slot"));
            const id = target === null ? "" : sketchRead(world, target);
            if (!id || !sketchLearn(world, actor, slot, id)) {
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
