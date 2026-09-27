/**
 * 保护色 / camouflage — 执行组织。
 *
 * 三幕：
 *   读（windup，提交前）：施法者蹲低，脚下一圈中性扫描环收拢、身侧浮起灰白尘点（`action.present` 预告，可被打断且不花代价）。
 *   染（settle，提交后）：向下读到的第一块真实材质决定属性；先落身份载体（`world_combat:camouflage`），
 *     再用**同一载体**写共享 `CombatTypes` replace 层，属性到期/被净化/载体移除时随 carrier 一起还原；
 *     体表的材质色尘由该类型层拥有（`WorldFeedback.onEffect`），改型或结束后自然收走。
 *   随（漂移，可选）：配置「随景而变」时，每 20 刻重读一次脚下；材质变了就在原位更新那一层（保留层序），
 *     并显式播出换到的有效结果。
 *
 * 场所读的是 Minecraft 真实材料：从脚下第一个非空气格开始，流体与方块都算第一块真实支撑；
 *   读不出具体材质时按维度兜底（下界为火、末地为岩），否则读成一般属性。木板就停在木板上，不透过它去读下面的石头。
 * 已经正好就是该单一属性时预检拒绝，不浪费 PP；属性被原生锁住的个体也直接拒绝。
 * 配置项 drift（随景而变／固色）在 resolve 里改变冷却，并在执行与表现上改变是否重读。
 */
namespace PokemonSkills {
    export const camouflageScene = "world_combat:move_camouflage";
    export const camouflageMark = "world_combat:camouflage";
    export const camouflageCoatText = "world_combat.move.camouflage.text.coat";
    export const camouflageShiftText = "world_combat.move.camouflage.text.shift";
    export const camouflageTypes = ["normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison", "ground",
        "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy"];
    var camouflageColors: { [type: string]: number } = {
        normal: 0xA8A878, fire: 0xEE8130, water: 0x6390F0, electric: 0xF7D02C, grass: 0x7AC74C,
        ice: 0x96D9D6, fighting: 0xC22E28, poison: 0xA33EA1, ground: 0xE2BF65, flying: 0xA98FF3,
        psychic: 0xF95587, bug: 0xA6B91A, rock: 0xB6A136, ghost: 0x735797, dragon: 0x6F35FC,
        dark: 0x705746, steel: 0xB7B7CE, fairy: 0xD685AD
    };

    export function camouflageColor(type: string): number { return camouflageColors[type] || 0xCFD3DE; }

    function camouflageResult(type: string, material: string): { type: string; material: string; color: number } {
        return { type: type, material: material || type, color: camouflageColor(type) };
    }
    function camouflageFluidType(id: string): string {
        if (id.indexOf("water") >= 0) return "water";
        if (id.indexOf("lava") >= 0) return "fire";
        return "";
    }
    /** Minecraft 材料到属性的映射；先查特殊材料，再按同位关系归类。 */
    function camouflageBlockType(id: string): string {
        if (id.indexOf("soul_sand") >= 0 || id.indexOf("soul_soil") >= 0 || id.indexOf("netherrack") >= 0
            || id.indexOf("magma") >= 0 || id.indexOf("glowstone") >= 0 || id.indexOf("shroomlight") >= 0
            || id.indexOf("crimson") >= 0 || id.indexOf("warped") >= 0) return "fire";
        if (id.indexOf("snow") >= 0 || id.indexOf("ice") >= 0) return "ice";
        if (id.indexOf("water") >= 0 || id.indexOf("kelp") >= 0 || id.indexOf("seagrass") >= 0 || id.indexOf("lily") >= 0) return "water";
        if (id.indexOf("lava") >= 0 || id.indexOf("fire") >= 0 || id.indexOf("campfire") >= 0) return "fire";
        if (id.indexOf("sand") >= 0 || id.indexOf("gravel") >= 0 || id.indexOf("dirt") >= 0 || id.indexOf("podzol") >= 0
            || id.indexOf("terracotta") >= 0 || id.indexOf("clay") >= 0 || id.indexOf("mud") >= 0) return "ground";
        if (id.indexOf("grass") >= 0 || id.indexOf("moss") >= 0 || id.indexOf("leaves") >= 0 || id.indexOf("fern") >= 0
            || id.indexOf("vine") >= 0 || id.indexOf("mycelium") >= 0 || id.indexOf("azalea") >= 0) return "grass";
        if (id.indexOf("stone") >= 0 || id.indexOf("deepslate") >= 0 || id.indexOf("tuff") >= 0 || id.indexOf("cobble") >= 0
            || id.indexOf("andesite") >= 0 || id.indexOf("diorite") >= 0 || id.indexOf("granite") >= 0 || id.indexOf("calcite") >= 0
            || id.indexOf("dripstone") >= 0 || id.indexOf("basalt") >= 0 || id.indexOf("blackstone") >= 0 || id.indexOf("obsidian") >= 0
            || id.indexOf("ore") >= 0 || id.indexOf("amethyst") >= 0 || id.indexOf("sculk") >= 0 || id.indexOf("end_stone") >= 0) return "rock";
        return "";
    }
    /** 向下读施法者脚下的第一块真实支撑：流体或非空气方块就地决定；不透过它继续读更下面。 */
    export function camouflageScan(world: CombatWorld, actor: CombatActor): { type: string; material: string; color: number } {
        const body = world.observe(actor);
        if (body === null) return camouflageResult("normal", "air");
        const pos = body.position(), half = body.height() / 2;
        const feet = WorldCombat.point(pos.x(), pos.y() - half, pos.z());
        const x = Math.floor(feet.x()), z = Math.floor(feet.z()), base = Math.floor(feet.y());
        for (let dy = 0; dy <= 3; dy++) {
            const cell = WorldCombat.point(x, base - dy, z);
            const fluid = world.fluid(cell);
            if (fluid !== null && !fluid.empty()) {
                const wet = camouflageFluidType(String(fluid.id()));
                if (wet) return camouflageResult(wet, String(fluid.id()));
            }
            const block = world.block(cell);
            if (block === null) continue;
            const id = String(block.id());
            if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
            const type = camouflageBlockType(id);
            if (type) return camouflageResult(type, id);
            // 第一块真实材质不认识就按维度兜底，不再透过它往下读。
            return camouflageDimension(world, feet, id);
        }
        return camouflageDimension(world, feet, "air");
    }
    function camouflageDimension(world: CombatWorld, feet: CombatPoint, material: string): { type: string; material: string; color: number } {
        const environment = WorldEnvironment.read(world, feet);
        const dimension = environment && typeof environment.dimension === "string" ? String(environment.dimension) : "";
        if (dimension.indexOf("nether") >= 0) return camouflageResult("fire", material);
        if (dimension.indexOf("the_end") >= 0) return camouflageResult("rock", material);
        return camouflageResult("normal", material);
    }
    /** 当前生效属性（含共享临时层）。 */
    function camouflageOwnTypes(world: CombatWorld, actor: CombatActor): string[] {
        if (!world.valid(actor)) return [];
        return PokemonDamage.combatants.read(world, actor).types;
    }
    /** 与本单元载体完全匹配的类型层，用于漂移原位更新与持续表现。 */
    function camouflageLayer(world: CombatWorld, actor: CombatActor, mark: CombatMobEffect): { id: number; data: string; types: string[] } | null {
        const views = world.effects(actor, CombatTypes.definition);
        for (let i = 0; i < views.length; i++) {
            let state: any;
            try { state = JSON.parse(String(views[i].data())); } catch (error) { continue; }
            if (state && state.carrier && state.carrier.id === mark.id() && state.carrier.key === mark.key())
                return { id: views[i].id(), data: String(views[i].data()), types: state.types || [] };
        }
        return null;
    }
    /** 原地改写载体层的属性，保留它在共享层序里的位置；失败时才回退为新层。 */
    function camouflageRetype(world: CombatWorld, actor: CombatActor, layer: { id: number; data: string }, type: string, mark: CombatMobEffect): boolean {
        const anchor = MobEffects.anchor(mark);
        const data = JSON.stringify({ operation: "replace", types: [type], carrier: anchor });
        if (world.compareEffectStates(JSON.stringify({ updates: [{ id: layer.id, expected: layer.data, data: data }] })))
            return true;
        const fresh = CombatTypes.apply(world, actor, { operation: "replace", types: [type] }, mark);
        if (fresh > 0) { world.operation(layer.id, "world_combat:dispel", "{}"); return true; }
        return false;
    }
    /** 体表材质色尘由类型层拥有：改型时用同一 key 更新，净化/到期随 carrier 一起收走。 */
    function camouflageWear(world: CombatWorld, actor: CombatActor, layer: number, result: { type: string; material: string; color: number }, motes: number): void {
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.onEffect(world, layer, "world_combat:camouflage:wear", camouflageScene, 1, body.position(),
            { moment: "wear", type: result.type, color: result.color, material: result.material, motes: motes });
    }
    /** 公式上下文只在宝可梦施法者上成立；空缺时由调用方决定退回值。 */
    function camouflageNumbers(world: CombatWorld, actor: CombatActor, values: any): NumberContext | null {
        if (String(actor.domain()) !== "cobblemon") return null;
        const pokemon = CobblemonCombat.pokemon(actor);
        if (!pokemon) return null;
        return { pokemon: pokemon, skill: skills["camouflage"], detail: { values: values }, world: world, actor: actor };
    }

    define({
        id: "camouflage",
        cooldownParameter: "recharge",
        name: "Camouflage",
        description: "读脚下第一块真实材质，把身体暂时换成它的属性：水里是水、草丛是草、洞窟是岩；配置「随景而变」时覆色期间会不断重读脚下。",
        uses: ["按所在地形临时改成贴合属性的属性", "翻掉当前受击面、换一套相性与状态免疫", "开战前先按地形定属性"],
        kind: "self",
        range: 1,
        prepare: 7,
        active: 0,
        recover: 7,
        cooldown: 60,
        style: "transmute",
        defaults: { drift: false },
        fields: [],
        indicator: function () {
            return { radius: 1.1, geometry: "area", style: "transmute", color: 0x8FD8B0, label: "保护色" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["camouflage"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const drift = !!(config && config.drift);
            return {
                prepare: Math.round(p("camouflage", "tempo", context)),
                recover: Math.round(p("camouflage", "aftercast", context)),
                cooldown: Math.round(p("camouflage", "recharge", context)) + (drift ? 10 : -6),
                active: 0,
                range: 1
            };
        },
        ready: function (action) {
            const world = action.sense(), actor = action.actor();
            if (NativeModifiers.typeLocked(world, actor)) return "type-locked";
            const scan = camouflageScan(world, actor);
            const own = camouflageOwnTypes(world, actor);
            return own.length === 1 && own[0] === scan.type ? "same-type" : "";
        },
        windup: function (action, config, prepare) {
            const scan = camouflageScan(action.sense(), action.actor());
            action.present("world_combat:camouflage:scan", camouflageScene, 1, action.origin(), JSON.stringify({
                moment: "scan", type: scan.type, color: scan.color, material: scan.material,
                motes: p("camouflage", "motes", action), drift: config && config.drift ? 1 : 0
            }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor();
            const body = world.observe(actor);
            const scan = camouflageScan(world, actor);
            const drift = !!(config && config.drift);
            const hold = Math.max(140, Math.round(p("camouflage", "hold", action)));
            const motes = Math.max(12, Math.round(p("camouflage", "motes", action)));
            const fringe = Math.max(8, Math.round(p("camouflage", "fringe", action)));
            // 先落身份载体，再用同一载体写共享类型层：carrier 被刷新/移除时，本层随之结束，不会留下失效锚。
            const mark = MobEffects.apply(world, actor, camouflageMark, hold, drift ? 1 : 0);
            if (mark === null) { done(action); return; }
            const layer = CombatTypes.apply(world, actor, { operation: "replace", types: [scan.type] }, mark);
            if (!(layer > 0)) {
                world.removeMobEffect(actor, camouflageMark, String(mark.key()));
                done(action);
                return;
            }
            if (body !== null) {
                camouflageWear(world, actor, layer, scan, Math.max(4, Math.round(motes / 3)));
                WorldFeedback.emit(world, camouflageScene, 1, body.position(),
                    { moment: scan.type, type: scan.type, color: scan.color, material: scan.material, motes: motes, fringe: fringe, drift: drift ? 1 : 0 }, 44);
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), camouflageCoatText,
                    [{ key: "cobblemon.type." + scan.type, fallback: scan.type }], 44);
            }
            sound(action, "minecraft:block.moss.place");
            done(action);
        }
    });

    // 覆色存续期：每 20 刻重读一次脚下；漂移档就在原位更新那一层（保留层序），并显式播出换到的有效结果。
    WorldCombat.on("world_combat:move_camouflage/drift", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== camouflageMark) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 20 !== 0) return;
        const mark = MobEffects.read(world, actor, camouflageMark);
        if (mark === null) return;
        const layer = camouflageLayer(world, actor, mark);
        if (layer === null) return;
        let type = layer.types.length ? String(layer.types[0]) : "normal";
        if (mark.amplifier() > 0) {
            const scan = camouflageScan(world, actor);
            if (scan.type !== type && camouflageRetype(world, actor, layer, scan.type, mark)) {
                type = scan.type;
                const numbers = camouflageNumbers(world, actor, config(world, actor, "camouflage"));
                const motes = numbers === null ? 12 : p("camouflage", "motes", numbers);
                const body = world.observe(actor);
                if (body !== null) {
                    camouflageWear(world, actor, layer.id, scan, Math.max(4, Math.round(motes / 3)));
                    WorldFeedback.emit(world, camouflageScene, 1, body.position(),
                        { moment: "shift", type: scan.type, color: scan.color, material: scan.material, motes: Math.max(8, Math.round(motes / 2)) }, 30);
                    WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), camouflageShiftText,
                        [{ key: "cobblemon.type." + scan.type, fallback: scan.type }], 32);
                    world.sound("minecraft:block.moss.place", body.position(), 12, "{}");
                }
            }
        }
    });

    // 标记自然到期：类型层随 carrier 结束，这里只补一层褪色提示。
    WorldCombat.on("world_combat:move_camouflage/clean", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== camouflageMark) return;
        if (String(data.cause) !== "expired") return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const body = world.observe(actor);
        if (body !== null) WorldFeedback.emit(world, camouflageScene, 1, body.position(), { moment: "fade" }, 30);
    });
}
