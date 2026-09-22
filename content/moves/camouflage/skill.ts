/**
 * 保护色 / camouflage — 执行组织。
 *
 * 三幕：
 *   读（windup，提交前）：施法者蹲低，脚下一圈中性扫描环收拢、身侧浮起灰白尘点（`action.present` 预告，可被打断且不花代价）。
 *   染（settle，提交后）：按脚下的材质炸开一撮对应碎屑与同色微粒，身体轮廓被染成该属性的颜色；
 *     属性由共享 NativeModifiers types 层承担（与纹理、燃尽同一套机制），到期自动还原原生属性；
 *     同时挂共享身份 `world_combat:status/camouflage` 的标记。
 *   随（漂移，可选）：配置「随景而变」时，每 20 刻重读一次脚下；材质变了就换一层属性、再染一次。
 *
 * 场所读的是 Minecraft 真实材料：脚下的流体与方块（水／冰／草／沙土／岩／火与维度），
 *   因此这是唯一一招「世界本身就是它的输入」的属性招。任何生物都能读，但只有宝可梦有属性可改。
 * 已经就是该属性的单属性个体预检拒绝，不浪费 PP。
 * 配置项 drift（随景而变／固色）在 resolve 里改变冷却，并在表现与执行上改变是否重读。
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
    /** 施法者 ref → 本单元为它挂的 types 层与到期时刻，供漂移重读、持续表现与清除使用。 */
    var camouflageLayers: { [ref: string]: { layer: number; until: number; type: string; material: string; motes: number } } = Object.create(null);

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
    /** 读施法者脚下的场所：先流体，再向下的第一块实心方块，最后按维度兜底。 */
    export function camouflageScan(world: CombatWorld, actor: CombatActor): { type: string; material: string; color: number } {
        const body = world.observe(actor);
        if (body === null) return camouflageResult("normal", "air");
        const pos = body.position(), half = body.height() / 2;
        const feet = WorldCombat.point(pos.x(), pos.y() - half, pos.z());
        const head = WorldCombat.point(pos.x(), pos.y() + half, pos.z());
        const footFluid = world.fluid(feet), headFluid = world.fluid(head);
        const fluidId = footFluid !== null && !footFluid.empty() ? String(footFluid.id())
            : headFluid !== null && !headFluid.empty() ? String(headFluid.id()) : "";
        if (fluidId) {
            const wet = camouflageFluidType(fluidId);
            if (wet) return camouflageResult(wet, fluidId);
        }
        const x = Math.floor(feet.x()), z = Math.floor(feet.z()), base = Math.floor(feet.y());
        for (let dy = 0; dy <= 3; dy++) {
            const block = world.block(WorldCombat.point(x, base - dy, z));
            if (block === null) continue;
            const id = String(block.id());
            if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
            const type = camouflageBlockType(id);
            if (type) return camouflageResult(type, id);
        }
        const environment = WorldEnvironment.read(world, feet);
        const dimension = environment && typeof environment.dimension === "string" ? String(environment.dimension) : "";
        if (dimension.indexOf("nether") >= 0) return camouflageResult("fire", "dimension");
        if (dimension.indexOf("the_end") >= 0) return camouflageResult("rock", "dimension");
        return camouflageResult("normal", "air");
    }
    function camouflageOwnTypes(world: CombatWorld, actor: CombatActor): string[] {
        if (String(actor.domain()) !== "cobblemon") return [];
        const pokemon = CobblemonCombat.pokemon(actor);
        return NativeEffects.types(pokemon, NativeEffects.read(world, actor));
    }

    define({
        id: "camouflage",
        name: "Camouflage",
        description: "读脚下这块地，把身体暂时染成它的属性：水里是水、草丛是草、洞窟是岩；配置「随景而变」时走动中会再染。",
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
            const own = camouflageOwnTypes(world, actor);
            if (own.length === 0) return "no-type";
            const scan = camouflageScan(world, actor);
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
            const layer = NativeModifiers.apply(world, actor, { types: [scan.type] }, hold);
            MobEffects.apply(world, actor, camouflageMark, hold, drift ? 1 : 0);
            camouflageLayers[String(actor.ref())] = { layer: layer, until: world.tick() + hold, type: scan.type, material: scan.material, motes: motes };
            if (body !== null) {
                WorldFeedback.emit(world, camouflageScene, 1, body.position(),
                    { moment: scan.type, type: scan.type, color: scan.color, material: scan.material, motes: motes, fringe: fringe, drift: drift ? 1 : 0 }, 44);
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), camouflageCoatText,
                    [{ key: "cobblemon.type." + scan.type, fallback: scan.type }], 44);
            }
            sound(action, "minecraft:block.moss.place");
            done(action);
        }
    });

    // 覆色存续期：每 20 刻续一次低密度同色微粒，让玩家读出现在染着什么；再按配置决定是否重读脚下。
    WorldCombat.on("world_combat:move_camouflage/drift", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== camouflageMark) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || String(actor.domain()) !== "cobblemon" || world.tick() % 20 !== 0) return;
        const record = camouflageLayers[String(actor.ref())];
        if (!record) return;
        const body = world.observe(actor);
        if (body !== null)
            WorldFeedback.keep(world, "world_combat:camouflage:wear:" + String(actor.ref()), camouflageScene, 1, body.position(),
                { moment: "wear", type: record.type, color: camouflageColor(record.type), material: record.material, motes: Math.max(4, Math.round(record.motes / 3)) }, 40);
        const remaining = record.until - world.tick();
        if (remaining <= 0) return;
        if (!config(world, actor, "camouflage").drift) return;
        const scan = camouflageScan(world, actor);
        if (scan.type === record.type) return;
        world.operation(record.layer, "world_combat:dispel", "{}");
        record.layer = NativeModifiers.apply(world, actor, { types: [scan.type] }, remaining);
        record.type = scan.type;
        record.material = scan.material;
        if (body === null) return;
        WorldFeedback.emit(world, camouflageScene, 1, body.position(),
            { moment: "shift", type: scan.type, color: scan.color, material: scan.material, motes: Math.max(8, Math.round(record.motes / 2)) }, 30);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), camouflageShiftText,
            [{ key: "cobblemon.type." + scan.type, fallback: scan.type }], 32);
        world.sound("minecraft:block.moss.place", body.position(), 12, "{}");
    });

    // 标记结束（自然到期、牛奶、清除、离场）：把本单元那条 types 层撤掉，属性立刻还原。
    WorldCombat.on("world_combat:move_camouflage/clean", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== camouflageMark) return;
        const world = event.world(), actor = event.actor();
        const key = String(actor.ref()), record = camouflageLayers[key];
        if (!record) return;
        if (String(data.cause) === "expired" && world.valid(actor)) {
            const body = world.observe(actor);
            if (body !== null) WorldFeedback.emit(world, camouflageScene, 1, body.position(), { moment: "fade", type: record.type }, 30);
        }
        world.operation(record.layer, "world_combat:dispel", "{}");
        delete camouflageLayers[key];
    });
}
