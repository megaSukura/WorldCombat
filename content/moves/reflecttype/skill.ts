/**
 * 镜面属性 / reflecttype — 执行组织。
 *
 * 三幕：
 *   举（windup，提交前）：一面镜子在施法者面前拼起、把对手的形状框进去（`action.present` 预告，可被打断且不花代价）。
 *   照（提交后）：镜面沿两人连线滑到对手身上、把它的属性「取」下来（表现沿 `data.path`）。
 *   映（settle）：取下的属性贴回施法者，身上浮出对应的属性色，属性由共享 NativeModifiers types 层承担
 *     （与纹理、保护色同一套机制，到期自动还原原生属性）；同时挂共享身份
 *     `world_combat:status/reflecttype` 的标记。
 *
 * 照的是对手**当前**的属性：它若被纹理、保护色、燃尽改过，镜子也照那一份。
 * 目标不是宝可梦就没有属性可照，预检直接拒绝，不浪费 PP；镜像结果与自身已经一样时也拒绝。
 * 配置项 pair（镜像全部／只取主属）在 resolve 里改变冷却、在公式里改变维持时长，并把副属性一起抄或只抄主属。
 */
namespace PokemonSkills {
    export const reflecttypeScene = "world_combat:move_reflecttype";
    export const reflecttypeMark = "world_combat:reflecttype";
    export const reflecttypeOneText = "world_combat.move.reflecttype.text.one";
    export const reflecttypePairText = "world_combat.move.reflecttype.text.pair";
    export const reflecttypeFailText = "world_combat.move.reflecttype.text.fail";
    export const reflecttypeTypes = ["normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison", "ground",
        "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy"];
    var reflecttypeColors: { [type: string]: number } = {
        normal: 0xA8A878, fire: 0xEE8130, water: 0x6390F0, electric: 0xF7D02C, grass: 0x7AC74C,
        ice: 0x96D9D6, fighting: 0xC22E28, poison: 0xA33EA1, ground: 0xE2BF65, flying: 0xA98FF3,
        psychic: 0xF95587, bug: 0xA6B91A, rock: 0xB6A136, ghost: 0x735797, dragon: 0x6F35FC,
        dark: 0x705746, steel: 0xB7B7CE, fairy: 0xD685AD
    };

    export function reflecttypeColor(type: string): number { return reflecttypeColors[type] || 0xCFD3DE; }

    /** 一个战斗者当前生效的属性（含临时层），过滤掉相性表不认的 id；非宝可梦返回空。 */
    export function reflecttypeRead(world: CombatWorld, actor: CombatActor): string[] {
        if (String(actor.domain()) !== "cobblemon" || !world.valid(actor)) return [];
        const pokemon = CobblemonCombat.pokemon(actor);
        const values = NativeEffects.types(pokemon, NativeEffects.read(world, actor));
        return values.filter(function (type) { return reflecttypeTypes.indexOf(type) >= 0; });
    }
    /** 要贴到自己身上的属性：pair 时连副属性一起，否则只取主属。 */
    export function reflecttypeChoose(theirs: string[], pair: boolean): string[] {
        if (theirs.length === 0) return [];
        return pair ? theirs.slice(0, 2) : [theirs[0]];
    }
    function reflecttypeSame(a: string[], b: string[]): boolean {
        return a.slice().sort().join(",") === b.slice().sort().join(",");
    }

    define({
        id: "reflecttype",
        cooldownParameter: "recharge",
        name: "Reflect Type",
        description: "举镜照住对手，把它的属性原样反射到自己身上；对手当前是什么属性，自己就变成什么属性。",
        uses: ["照抄对手的属性来翻受击面", "跟着对手被改过的属性一起变", "只取主属、避开副属性带来的弱点"],
        kind: "enemy",
        range: 8,
        maxRange: 14,
        prepare: 7,
        active: 0,
        recover: 7,
        cooldown: 80,
        style: "mirror",
        defaults: { pair: false, ai: { maxChase: 12, leaveStation: false } },
        fields: [],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills["reflecttype"], detail: { values: config } };
            return { radius: p("reflecttype", "reach", context), geometry: "line", style: "mirror", color: 0xD98CE8,
                label: config && config.pair === true ? "镜面属性 · 全部" : "镜面属性" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["reflecttype"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const pair = !!(config && config.pair);
            return {
                prepare: Math.round(p("reflecttype", "tempo", context)),
                recover: Math.round(p("reflecttype", "aftercast", context)),
                cooldown: Math.round(p("reflecttype", "recharge", context)) + (pair ? 14 : -8),
                active: 0,
                range: p("reflecttype", "reach", context)
            };
        },
        ready: function (action, config) {
            const world = action.sense(), actor = action.actor(), target = action.target();
            if (target === null || !world.valid(target) || world.friendly(target)) return "invalid-target";
            if (String(actor.domain()) !== "cobblemon" || String(target.domain()) !== "cobblemon") return "no-type";
            const body = world.observe(target);
            if (body === null) return "invalid-target";
            if (body.position().minus(action.origin()).length() > p("reflecttype", "reach", action)) return "out-of-range";
            if (!world.clear(action.origin(), body.position())) return "no-line";
            if (NativeModifiers.typeLocked(world, actor)) return "type-locked";
            const theirs = reflecttypeRead(world, target);
            if (theirs.length === 0) return "no-type";
            const pair = !!(config && config.pair);
            return reflecttypeSame(reflecttypeChoose(theirs, pair), reflecttypeRead(world, actor)) ? "same-type" : "";
        },
        windup: function (action, config, prepare) {
            const target = action.target();
            action.present("world_combat:reflecttype:raise", reflecttypeScene, 1, action.origin(), JSON.stringify({
                moment: "raise", target: target === null ? "" : String(target.ref()),
                facets: p("reflecttype", "facets", action), pair: config && config.pair ? 1 : 0
            }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor(), target = action.target();
            const body = world.observe(actor);
            if (target === null || !world.valid(target) || body === null) { done(action); return; }
            const pair = !!(config && config.pair);
            const theirs = reflecttypeRead(world, target);
            const chosen = reflecttypeChoose(theirs, pair);
            const hold = Math.max(90, Math.round(p("reflecttype", "hold", action)));
            const facets = Math.max(6, Math.round(p("reflecttype", "facets", action)));
            const glints = Math.max(10, Math.round(p("reflecttype", "glints", action)));
            const path: (string | number[])[] = [String(target.ref()), String(actor.ref())];
            if (chosen.length === 0) {
                WorldFeedback.emit(world, reflecttypeScene, 1, body.position(), { moment: "fizzle", target: String(actor.ref()), facets: facets }, 22);
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), reflecttypeFailText, [], 26);
                sound(action, "minecraft:block.amethyst_block.break");
                done(action);
                return;
            }
            NativeModifiers.apply(world, actor, { types: chosen }, hold);
            MobEffects.apply(world, actor, reflecttypeMark, hold, pair ? 1 : 0);
            const targetBody = world.observe(target);
            if (targetBody !== null)
                WorldFeedback.emit(world, reflecttypeScene, 1, targetBody.position(),
                    { moment: "read", target: String(target.ref()), path: path, facets: facets, scale: chosen.length > 1 ? 1.2 : 1 }, 30);
            WorldFeedback.emit(world, reflecttypeScene, 1, body.position(),
                { moment: "settle", target: String(actor.ref()), path: path, type: chosen[0], color: reflecttypeColor(chosen[0]),
                    facets: facets, glints: glints, pair: pair ? 1 : 0,
                    intensity: Math.max(0.7, Math.min(2, hold / 260)) }, 44);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)),
                chosen.length > 1 ? reflecttypePairText : reflecttypeOneText,
                chosen.slice(0, 2).map(function (type) { return { key: "cobblemon.type." + type, fallback: type }; }), 44);
            sound(action, "minecraft:block.amethyst_block.chime");
            done(action);
        }
    });
}
